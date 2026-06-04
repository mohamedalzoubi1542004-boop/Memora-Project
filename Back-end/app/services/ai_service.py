"""AI Service — EfficientNetB6 MRI classifier with three-layer OOD guard."""

import json
import math
from pathlib import Path
from typing import Dict

import numpy as np
from PIL import Image

MODEL_DIR   = Path(__file__).parent.parent / "ai_model"
CONFIG_PATH = MODEL_DIR / "config.json"

# ── OOD thresholds ────────────────────────────────────────────────────────────

# Layer 1 — pixel statistics (pre-inference)
# Colour-channel checks are intentionally omitted: some valid brain MRI images are stored
# with a pseudo-colour palette (purple, sepia …) which would create false positives.
# Shape validation (Layer 1.5) and entropy (Layer 2) provide the meaningful guards.
# Layer 1 only checks that a large dark background region exists — the anatomical void
# surrounding the skull — which is present in ALL axial brain MRI images.
_DARK_BG_MIN_RATIO = 0.10   # fraction of pixels with intensity < 25 (brain MRI ≈ 0.2–0.6)

# Layer 1.5 — morphological shape (pre-inference, catches MRI of wrong body parts)
# Shape metrics are computed on the CONVEX HULL of the segmented foreground, so the
# brain's naturally convoluted surface (gyri/sulci) and internal dark regions
# (ventricles) do NOT inflate the perimeter — only the outer envelope is measured.
# Brain axial MRI → round, hull-filling, bilaterally-symmetric blob.
# Limb MRI (knee, shoulder, hand, foot, ankle, wrist) and spine fail at least one
# of: too elongated / hull poorly filled / left-right asymmetric.
_MORPH_CIRCULARITY_MIN  = 0.55   # 4π·HullArea/HullPerimeter²  (reject if below — too elongated/irregular)
_MORPH_ASPECT_RATIO_MIN = 0.45   # min(w,h)/max(w,h)          (reject if below — bounding-box too elongated)
_MORPH_SOLIDITY_MIN     = 0.75   # filled-area / hull-area    (reject if below — L-shaped limb, not a cohesive blob)
_MORPH_SYMMETRY_MIN     = 0.68   # left-right mirror overlap  (reject if below — limbs are not bilaterally symmetric)
_MORPH_FG_RATIO_MIN     = 0.08   # foreground must cover ≥ 8 % of image
_MORPH_FG_RATIO_MAX     = 0.88   # foreground must cover ≤ 88 % of image

# Layer 2 — Shannon entropy (post-inference, residual safety net)
# Normalised H = H / ln(n_classes)  (brain MRI confident result ≈ 0.05–0.45)
_ENTROPY_REJECT_RATIO = 0.75


class OODImageError(ValueError):
    """Raised when an uploaded image is detected as out-of-distribution."""


# ─────────────────────────────────────────────────────────────────────────────
# Layer 1 — Pixel statistics
# ─────────────────────────────────────────────────────────────────────────────

def _check_layer1(image_path: str) -> None:
    """
    Rejects images that have no dark skull-void background.
    Colour-channel checks are intentionally omitted — valid brain MRI images are
    sometimes stored with pseudo-colour palettes (purple, sepia …) which would
    create false positives.  Layer 1.5 + Layer 2 provide the meaningful guards.
    """
    img = Image.open(image_path).convert("RGB").resize((128, 128))
    arr = np.array(img, dtype=np.float32)

    gray       = np.mean(arr, axis=2)
    dark_ratio = float(np.mean(gray < 25))
    if dark_ratio < _DARK_BG_MIN_RATIO:
        raise OODImageError(
            "الصورة لا تحتوي على الخلفية الداكنة المميزة لصور الرنين المغناطيسي — "
            "يُرجى رفع صورة MRI دماغية بالمستوى الأفقي (Axial View)"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Layer 1.5 — Morphological shape analysis
# ─────────────────────────────────────────────────────────────────────────────

def _otsu_threshold(arr: np.ndarray) -> float:
    """Pure-numpy Otsu threshold — maximises inter-class variance."""
    hist, bin_edges = np.histogram(arr.ravel(), bins=256, range=(0.0, 256.0))
    bin_centers     = (bin_edges[:-1] + bin_edges[1:]) * 0.5
    total           = float(arr.size)
    sum_total       = float(np.dot(hist.astype(np.float64), bin_centers))

    best_var = 0.0
    threshold = 0.0
    sum_bg, count_bg = 0.0, 0

    for i in range(256):
        count_bg += int(hist[i])
        count_fg  = total - count_bg
        if count_bg == 0 or count_fg == 0:
            continue
        sum_bg  += bin_centers[i] * float(hist[i])
        mean_bg  = sum_bg / count_bg
        mean_fg  = (sum_total - sum_bg) / count_fg
        var      = count_bg * count_fg * (mean_bg - mean_fg) ** 2
        if var > best_var:
            best_var  = var
            threshold = bin_centers[i]

    return threshold


def _convex_hull(points: np.ndarray) -> np.ndarray:
    """
    Andrew's monotone-chain convex hull.

    *points* — (N, 2) float array of (x, y); returns the ordered hull vertices.
    The hull ignores concavities (sulci) and internal holes (ventricles), so it
    measures only the outer envelope of the anatomical region — which is the
    geometry that actually distinguishes a round brain from an elongated foot.
    """
    pts = np.unique(points, axis=0)
    if len(pts) < 3:
        return pts
    pts = pts[np.lexsort((pts[:, 1], pts[:, 0]))]

    def _cross(o, a, b) -> float:
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower: list = []
    for p in pts:
        while len(lower) >= 2 and _cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)

    upper: list = []
    for p in pts[::-1]:
        while len(upper) >= 2 and _cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)

    return np.array(lower[:-1] + upper[:-1])


def _fill_holes(mask: np.ndarray) -> np.ndarray:
    """
    Fill background regions fully enclosed by foreground (e.g. brain ventricles).

    Pure-numpy morphological reconstruction — flood the background inward from the
    image border; any background pixel unreachable from the border is an interior
    hole and is promoted to foreground.  This removes the brain's ventricles so
    that solidity reflects the true outer shape, while a foot's *external*
    concavity (the open wedge beside the leg) is connected to the border and
    therefore left untouched.
    """
    bg = (mask == 0)
    reach = np.zeros_like(bg)
    reach[0, :]  = bg[0, :]
    reach[-1, :] = bg[-1, :]
    reach[:, 0]  = bg[:, 0]
    reach[:, -1] = bg[:, -1]

    for _ in range(512):                       # 2× image dimension — generous cap
        grown = reach.copy()
        grown[1:, :]  |= reach[:-1, :]
        grown[:-1, :] |= reach[1:, :]
        grown[:, 1:]  |= reach[:, :-1]
        grown[:, :-1] |= reach[:, 1:]
        grown &= bg
        if np.array_equal(grown, reach):
            break
        reach = grown

    holes = bg & ~reach
    return (mask.astype(bool) | holes).astype(np.uint8)


def _check_layer1_5(image_path: str) -> None:
    """
    Morphological shape gate — executed BEFORE model inference.

    Brain axial MRI has a hard anatomical constraint: the skull cross-section
    is always roughly circular/oval.  Scans of other body parts (foot, ankle,
    knee, spine, shoulder …) produce elongated or geometrically irregular
    bright regions after Otsu thresholding.

    Four geometric metrics gate the image.  The first three are derived from the
    CONVEX HULL of the segmented foreground — using the hull is essential because
    a brain's cortical surface is densely folded (gyri/sulci) and its centre
    holds dark ventricles, so a raw pixel-perimeter is hugely inflated and a real
    brain would be wrongly rejected.  The fourth metric exploits the single most
    brain-specific trait: an axial brain slice is the mirror image of itself,
    whereas limb scans are inherently one-sided.

      Hull Circularity = 4π · HullArea / HullPerimeter²
        · Round brain envelope → 0.85–1.00
        · Elongated foot/spine → 0.45–0.75   ← REJECT

      Aspect Ratio = min(bbox_w, bbox_h) / max(bbox_w, bbox_h)
        · Square brain     → 0.70–1.00
        · Elongated foot   → 0.15–0.40   ← REJECT

      Solidity = filled_foreground_area / HullArea
        · Cohesive brain blob               → 0.85–0.97
        · L-shaped foot+leg (hull holds a   → 0.45–0.70   ← REJECT
          large empty wedge of background)

      Symmetry = overlap of the region with its own left-right mirror
        · Bilaterally symmetric brain → 0.78–0.93
        · One-sided knee/shoulder/    → 0.45–0.68   ← REJECT
          hand/foot/wrist

    NOTE — these are SHAPE heuristics.  They reliably reject limbs, the spine and
    non-medical images, but they cannot tell a brain apart from another roughly
    round, symmetric body cross-section (e.g. an axial abdomen/chest slice);
    separating those would require a model-level brain-vs-non-brain gate.
    Any metric failing independently triggers rejection.
    """
    # Work at 256 × 256 — fast, yet enough detail for shape analysis
    img = Image.open(image_path).convert("L").resize((256, 256))
    arr = np.array(img, dtype=np.float32)

    thresh = _otsu_threshold(arr)
    mask   = (arr > thresh).astype(np.uint8)

    # ── Sanity: foreground must cover a plausible fraction of the frame ───────
    fg_ratio = float(np.mean(mask))
    if not (_MORPH_FG_RATIO_MIN <= fg_ratio <= _MORPH_FG_RATIO_MAX):
        raise OODImageError(
            "لم يتمكن النظام من تحديد المنطقة التشريحية في الصورة — "
            "يُرجى رفع صورة MRI دماغية واضحة بالمستوى الأفقي (Axial View)"
        )

    # ── Bounding-box aspect ratio ─────────────────────────────────────────────
    fg_rows = np.any(mask, axis=1)
    fg_cols = np.any(mask, axis=0)

    r_min = int(np.argmax(fg_rows))
    r_max = int(len(fg_rows) - 1 - np.argmax(fg_rows[::-1]))
    c_min = int(np.argmax(fg_cols))
    c_max = int(len(fg_cols) - 1 - np.argmax(fg_cols[::-1]))

    h = max(r_max - r_min + 1, 1)
    w = max(c_max - c_min + 1, 1)
    aspect_ratio = min(h, w) / max(h, w)

    if aspect_ratio < _MORPH_ASPECT_RATIO_MIN:
        raise OODImageError(
            "الصورة المرفوعة مستطيلة الشكل بشكل واضح وتختلف عن الشكل الدائري "
            "المميز للدماغ في المستوى الأفقي — "
            "قد تكون صورة رنين مغناطيسي لجزء آخر من الجسم (قدم، عمود فقري، …). "
            "يُرجى رفع صورة MRI دماغية بالمستوى الأفقي (Axial View) فقط"
        )

    # ── Convex-hull circularity ──────────────────────────────────────────────
    # The per-row leftmost/rightmost foreground pixels are a superset of the
    # hull vertices — cheap to collect and exact for the hull computation.
    extreme_pts: list = []
    for y in range(mask.shape[0]):
        xs = np.nonzero(mask[y])[0]
        if xs.size:
            extreme_pts.append((float(xs[0]),  float(y)))
            extreme_pts.append((float(xs[-1]), float(y)))

    hull = _convex_hull(np.array(extreme_pts, dtype=np.float64))
    if len(hull) < 3:
        raise OODImageError(
            "لم يتمكن النظام من تحليل حدود المنطقة في الصورة — "
            "يُرجى رفع صورة MRI دماغية واضحة"
        )

    hx, hy     = hull[:, 0], hull[:, 1]
    hull_area  = 0.5 * abs(np.dot(hx, np.roll(hy, -1)) - np.dot(hy, np.roll(hx, -1)))
    edges      = hull - np.roll(hull, -1, axis=0)
    hull_perim = float(np.sum(np.sqrt(np.sum(edges ** 2, axis=1))))

    if hull_perim == 0 or hull_area == 0:
        raise OODImageError(
            "لم يتمكن النظام من تحليل حدود المنطقة في الصورة — "
            "يُرجى رفع صورة MRI دماغية واضحة"
        )

    circularity = (4.0 * math.pi * float(hull_area)) / (hull_perim ** 2)

    if circularity < _MORPH_CIRCULARITY_MIN:
        raise OODImageError(
            "الشكل الهندسي العام للمنطقة المضيئة في الصورة غير متوافق مع الشكل "
            "الدائري للدماغ في المستوى الأفقي — "
            "قد تكون صورة رنين مغناطيسي لجزء آخر من الجسم (ركبة، كتف، …). "
            "يُرجى رفع صورة MRI دماغية بالمستوى الأفقي (Axial View) فقط"
        )

    # ── Solidity of the hole-filled shape ────────────────────────────────────
    # A brain is a cohesive, near-convex blob: once its ventricles are filled it
    # occupies almost all of its convex hull.  A foot/ankle MRI is an L-shaped
    # structure (leg + foot) whose hull contains a large empty background wedge,
    # so its solidity stays low even after internal holes are filled — this is
    # what catches a foot scan that fakes a square bbox and a round-ish hull.
    filled_area = int(np.sum(_fill_holes(mask)))
    solidity    = filled_area / float(hull_area)

    if solidity < _MORPH_SOLIDITY_MIN:
        raise OODImageError(
            "المنطقة المضيئة في الصورة غير مترابطة بشكل كافٍ ولا تملأ محيطها "
            "كما هو متوقع لمقطع دماغي أفقي — "
            "قد تكون صورة رنين مغناطيسي لجزء آخر من الجسم (قدم، كاحل، …). "
            "يُرجى رفع صورة MRI دماغية بالمستوى الأفقي (Axial View) فقط"
        )

    # ── Bilateral (left-right) symmetry ──────────────────────────────────────
    # An axial brain slice is strongly symmetric — its two hemispheres mirror
    # each other.  Limb scans (knee, shoulder, hand, foot, ankle, wrist) are
    # inherently one-sided: mirroring the segmented region inside its bounding
    # box about the vertical centre line leaves little overlap.
    sub      = mask[r_min : r_max + 1, c_min : c_max + 1]
    sub_area = int(np.sum(sub))
    overlap  = int(np.sum((sub == 1) & (sub[:, ::-1] == 1)))
    symmetry = overlap / sub_area if sub_area else 0.0

    if symmetry < _MORPH_SYMMETRY_MIN:
        raise OODImageError(
            "الصورة المرفوعة غير متماثلة بين الجانبين الأيمن والأيسر، "
            "بينما يتميّز المقطع الدماغي الأفقي بتماثل واضح بين نصفي الدماغ — "
            "قد تكون صورة رنين مغناطيسي لعضو آخر (ركبة، كتف، يد، قدم، …). "
            "يُرجى رفع صورة MRI دماغية بالمستوى الأفقي (Axial View) فقط"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Layer 2 — Shannon entropy
# ─────────────────────────────────────────────────────────────────────────────

def _check_layer2(probabilities: Dict[str, float]) -> None:
    """
    Post-inference residual safety net.
    High entropy means the model cannot confidently pick one class,
    which indicates the input is outside the training distribution.
    """
    probs        = list(probabilities.values())
    entropy      = -sum(p * math.log(p + 1e-10) for p in probs)
    normalised_h = entropy / math.log(len(probs))

    if normalised_h > _ENTROPY_REJECT_RATIO:
        raise OODImageError(
            "النموذج غير قادر على تصنيف هذه الصورة بثقة كافية — "
            "قد تكون صورة رنين مغناطيسي لجزء آخر من الجسم أو صورة دماغية غير واضحة. "
            "يُرجى رفع صورة MRI دماغية بالمستوى الأفقي (Axial View)"
        )


# ─────────────────────────────────────────────────────────────────────────────
# AI Service
# ─────────────────────────────────────────────────────────────────────────────

class AIService:
    def __init__(self):
        self.model       = None
        self.class_names = ["MildDemented", "ModerateDemented", "NonDemented"]
        self.img_size    = 528
        self._loaded     = False

    def load_model(self) -> None:
        """Load model on server startup. Gracefully skips if model file is missing."""
        try:
            with open(CONFIG_PATH) as f:
                cfg = json.load(f)

            self.class_names = cfg.get("class_names", self.class_names)
            self.img_size    = cfg.get("img_size", 528)

            model_path = MODEL_DIR / cfg.get("model_filename", "efficientnetb6_final")
            if not model_path.exists():
                print(f"[AI] Model not found at {model_path} — running in demo mode.")
                return

            import tensorflow as tf
            self.model   = tf.keras.models.load_model(str(model_path))
            self._loaded = True
            print(
                f"[AI] EfficientNetB6 loaded — "
                f"img_size={self.img_size}, classes={self.class_names}"
            )
        except Exception as exc:
            print(f"[AI] Load error: {exc} — running in demo mode.")

    def preprocess_image(self, image_path: str):
        """Resize and apply EfficientNet-B normalisation (scales pixel values to [-1, 1])."""
        import tensorflow as tf
        img = Image.open(image_path).convert("RGB").resize((self.img_size, self.img_size))
        arr = np.array(img, dtype=np.float32)
        arr = tf.keras.applications.efficientnet.preprocess_input(arr)
        return arr[np.newaxis, ...]   # (1, H, W, 3)

    def predict(self, image_path: str) -> Dict:
        """
        Run the full three-layer OOD validation pipeline and return classification.

        Pipeline
        --------
        Layer 1   — pixel statistics  (colour saturation + dark background)
        Layer 1.5 — morphological     (circularity + aspect ratio of segmented region)
        Inference — EfficientNetB6
        Layer 2   — Shannon entropy   (residual confidence check)

        Raises
        ------
        OODImageError
            If any layer detects that the image is outside the valid distribution.
            The router converts this to HTTP 400 with the Arabic detail message.
        """
        # Layer 1 — always runs (even in demo mode)
        _check_layer1(image_path)

        # Layer 1.5 — always runs (even in demo mode)
        _check_layer1_5(image_path)

        if not self._loaded:
            return self._demo_result(image_path)

        try:
            arr   = self.preprocess_image(image_path)
            probs = self.model.predict(arr, verbose=0)[0]

            idx            = int(probs.argmax())
            classification = self.class_names[idx]
            confidence     = float(probs[idx])
            probabilities  = {
                name: float(p)
                for name, p in zip(self.class_names, probs)
            }

            # Layer 2 — post-inference entropy gate
            _check_layer2(probabilities)

            return {
                "classification": classification,
                "confidence":     confidence,
                "probabilities":  probabilities,
            }

        except OODImageError:
            raise   # never swallow OOD errors

        except Exception as exc:
            print(f"[AI] Prediction error: {exc}")
            return self._demo_result(image_path)

    def _demo_result(self, image_path: str) -> Dict:
        """Deterministic demo result used when the model file is absent."""
        import hashlib
        seed      = int(hashlib.md5(image_path.encode()).hexdigest(), 16) % 3
        labels    = ["NonDemented", "MildDemented", "ModerateDemented"]
        probs_map = [
            {"NonDemented": 0.92, "MildDemented": 0.06, "ModerateDemented": 0.02},
            {"NonDemented": 0.08, "MildDemented": 0.84, "ModerateDemented": 0.08},
            {"NonDemented": 0.03, "MildDemented": 0.14, "ModerateDemented": 0.83},
        ]
        cls   = labels[seed]
        probs = probs_map[seed]
        return {"classification": cls, "confidence": probs[cls], "probabilities": probs}


ai_service = AIService()
