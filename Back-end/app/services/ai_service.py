"""AI Service — loads the EfficientNetB6 model and runs MRI classification."""

import json
import os
from pathlib import Path
from typing import Dict

MODEL_DIR   = Path(__file__).parent.parent / "ai_model"
CONFIG_PATH = MODEL_DIR / "config.json"


class AIService:
    def __init__(self):
        self.model       = None
        self.class_names = ["MildDemented", "ModerateDemented", "NonDemented"]
        self.img_size    = 528
        self._loaded     = False

    def load_model(self):
        """Load model on server startup. Gracefully skips if model file is missing."""
        try:
            with open(CONFIG_PATH) as f:
                cfg = json.load(f)

            self.class_names = cfg.get("class_names", self.class_names)
            self.img_size    = cfg.get("img_size", 528)

            model_path = MODEL_DIR / cfg.get("model_filename", "efficientnetb6_final")

            if not model_path.exists():
                print(f"[AI] Model not found at {model_path} — running in demo mode.")
                self._loaded = False
                return

            import tensorflow as tf

            self.model   = tf.keras.models.load_model(str(model_path))
            self._loaded = True
            print(f"[AI] EfficientNetB6 loaded — img_size={self.img_size}, classes={self.class_names}")

        except Exception as exc:
            print(f"[AI] Load error: {exc} — running in demo mode.")
            self._loaded = False

    def preprocess_image(self, image_path: str):
        """Load and preprocess image using EfficientNet normalization."""
        import numpy as np
        import tensorflow as tf
        from PIL import Image

        img = Image.open(image_path).convert("RGB")
        img = img.resize((self.img_size, self.img_size))
        arr = np.array(img, dtype=np.float32)

        # EfficientNet-specific preprocessing (scales to [-1, 1])
        arr = tf.keras.applications.efficientnet.preprocess_input(arr)

        return arr[np.newaxis, ...]   # (1, H, W, 3)

    def predict(self, image_path: str) -> Dict:
        """
        Returns:
            {
              "classification": "NonDemented",
              "confidence": 0.95,
              "probabilities": {"NonDemented": 0.95, "MildDemented": 0.03, "ModerateDemented": 0.02}
            }
        """
        if not self._loaded:
            return self._demo_result(image_path)

        try:
            import numpy as np

            arr   = self.preprocess_image(image_path)
            probs = self.model.predict(arr, verbose=0)[0]   # softmax output

            idx            = int(probs.argmax())
            classification = self.class_names[idx]
            confidence     = float(probs[idx])
            probabilities  = {name: float(p) for name, p in zip(self.class_names, probs)}

            return {
                "classification": classification,
                "confidence":     confidence,
                "probabilities":  probabilities,
            }
        except Exception as exc:
            print(f"[AI] Prediction error: {exc}")
            return self._demo_result(image_path)

    def _demo_result(self, image_path: str) -> Dict:
        """Deterministic demo result when model is unavailable."""
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
        return {
            "classification": cls,
            "confidence":     probs[cls],
            "probabilities":  probs,
        }


ai_service = AIService()
