/**
 * Central API client — wraps fetch with auth headers.
 * Next.js rewrites: /api/* → http://localhost:8000/*
 * So BASE = "/api" and all paths are like "/patients/me" (no double /api/).
 */

import { getToken, clearAuth } from "./auth";

const BASE = "/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    const err = await res.json().catch(() => ({}));
    if (path !== "/auth/login") {
      clearAuth();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:expired"));
      }
      throw new ApiError(401, "انتهت الجلسة — الرجاء تسجيل الدخول مجدداً");
    }
    throw new ApiError(401, err.detail ?? "بريد إلكتروني أو كلمة مرور خاطئة");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, err.detail ?? "حدث خطأ في الطلب");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get:       <T>(path: string)                    => request<T>("GET",    path),
  post:      <T>(path: string, body: unknown)     => request<T>("POST",   path, body),
  put:       <T>(path: string, body: unknown)     => request<T>("PUT",    path, body),
  delete:    <T>(path: string)                    => request<T>("DELETE", path),
  upload:    <T>(path: string, form: FormData)    => request<T>("POST",   path, form, true),
  uploadPut: <T>(path: string, form: FormData)    => request<T>("PUT",    path, form, true),
};

/* ─── Auth ─── */
type AuthToken = {
  access_token: string; user_id: number; full_name: string;
  role: string; is_approved?: boolean | null; is_verified?: boolean;
};

export const authApi = {
  register: (data: {
    email: string; password: string; full_name: string;
    phone?: string; role?: string; remember_me?: boolean;
  }) => api.post<AuthToken>("/auth/register", data),

  registerDoctor: (form: FormData) =>
    api.upload<AuthToken>("/auth/register-doctor", form),

  login: (email: string, password: string, rememberMe = false) =>
    api.post<AuthToken>("/auth/login", { email, password, remember_me: rememberMe }),

  me: () => api.get<{
    id: number; email: string; full_name: string; role: string;
    phone?: string; profile_image?: string; is_verified?: boolean;
  }>("/auth/me"),

  updateProfile: (data: { full_name?: string; phone?: string }) =>
    api.put("/auth/me", data),

  changePassword: (current_password: string, new_password: string) =>
    api.post("/auth/change-password", { current_password, new_password }),

  uploadAvatar: (form: FormData) =>
    api.upload<{ profile_image?: string }>("/auth/me/avatar", form),
};

/* ─── Verification & Password Reset ─── */
export const verificationApi = {
  sendOtp: (identifier: string, method: "email", purpose: "verify" | "reset") =>
    api.post<{ message: string; expires_in: number; dev_code?: string }>(
      "/auth/send-otp", { identifier, method, purpose }
    ),

  verifyOtp: (identifier: string, code: string, purpose: "verify" | "reset") =>
    api.post<{ message: string }>(
      "/auth/verify-otp", { identifier, code, purpose }
    ),

  resetPassword: (identifier: string, code: string, new_password: string) =>
    api.post<{ message: string }>(
      "/auth/reset-password", { identifier, code, new_password }
    ),
};

/* ─── Patients ─── */
export const patientApi = {
  me:     ()              => api.get("/patients/me"),
  update: (data: unknown) => api.put("/patients/me", data),
  list:   ()              => api.get("/patients"),
  get:    (id: number)    => api.get(`/patients/${id}`),
};

/* ─── Doctors ─── */
export const doctorApi = {
  me:     ()              => api.get("/doctors/me"),
  update: (data: unknown) => api.put("/doctors/me", data),
  list:   ()              => api.get("/doctors"),
  get:    (id: number)    => api.get(`/doctors/${id}`),
  cvUrl:  (doctorId: number) => `/api/doctors/${doctorId}/cv`,
};

/* ─── Appointments ─── */
export const appointmentApi = {
  request:  (data: { doctor_id: number; scheduled_at: string; notes?: string }) =>
    api.post("/appointments", data),
  my:       ()           => api.get("/appointments/my"),
  approve:  (id: number) => api.post(`/appointments/${id}/approve`, {}),
  cancel:   (id: number) => api.post(`/appointments/${id}/cancel`, {}),
  complete: (id: number) => api.post(`/appointments/${id}/complete`, {}),
};

/* ─── Diagnosis / MRI ─── */
export const diagnosisApi = {
  upload:      (form: FormData)    => api.upload("/diagnosis/upload", form),
  history:     (patientId: number) => api.get(`/diagnosis/patient/${patientId}`),
  latest:      (patientId: number) => api.get(`/diagnosis/patient/${patientId}/latest`),
  updateNotes: (id: number, notes: string) =>
    api.put(`/diagnosis/${id}/notes`, { doctor_notes: notes }),
  approve:     (id: number, notes?: string) =>
    api.post(`/diagnosis/${id}/approve`, { doctor_notes: notes }),
  imageUrl:    (diagnosisId: number) => `/api/diagnosis/${diagnosisId}/image`,
  myPendingCount: () => api.get<{ pending: number }>("/diagnosis/my/pending-count"),
};

/* ─── MMSE ─── */
export const mmseApi = {
  submit:  (data: unknown)        => api.post("/mmse/submit", data),
  history: (patientId: number)    => api.get(`/mmse/patient/${patientId}`),
  latest:  (patientId: number)    => api.get(`/mmse/patient/${patientId}/latest`),
  summary: (patientId: number)    => api.get(`/mmse/patient/${patientId}/summary`),
};

/* ─── Symptoms ─── */
export const symptomApi = {
  submit:  (data: unknown)        => api.post("/symptoms/submit", data),
  history: (patientId: number)    => api.get(`/symptoms/patient/${patientId}`),
  latest:  (patientId: number)    => api.get(`/symptoms/patient/${patientId}/latest`),
  summary: (patientId: number)    => api.get(`/symptoms/patient/${patientId}/summary`),
};

/* ─── Check-in ─── */
export const checkinApi = {
  submit:         (mood: string)       => api.post("/checkin", { mood }),
  history:        ()                   => api.get("/checkin/history"),
  today:          ()                   => api.get("/checkin/today"),
  patientHistory: (patientId: number)  => api.get(`/checkin/patient/${patientId}`),
};

/* ─── Messages ─── */
export const messageApi = {
  send:          (receiver_id: number, content: string) =>
    api.post("/messages", { receiver_id, content }),
  conversations: ()               => api.get("/messages/conversations"),
  with:          (partnerId: number) => api.get(`/messages/with/${partnerId}`),
  unreadCount:   ()               => api.get<{ unread_count: number }>("/messages/unread-count"),
  contacts:      ()               => api.get<{ id: number; full_name: string; role: string; role_label: string; context: string | null }[]>("/messages/contacts"),
};

/* ─── Family ─── */
export const familyApi = {
  addContact:     (data: unknown)     => api.post("/family/contacts", data),
  contacts:       (patientId: number) => api.get(`/family/contacts/patient/${patientId}`),
  deleteContact:  (id: number)        => api.delete(`/family/contacts/${id}`),
  patientSummary: (patientId: number) => api.get(`/family/patient/${patientId}/summary`),
  myPatients:     ()                  => api.get<{ patient_id: number; full_name: string; relation_type: string }[]>("/family/my-patients"),
};

/* ─── Caregiver ─── */
export const caregiverApi = {
  submit:  (data: unknown)        => api.post("/caregiver/submit", data),
  history: (patientId: number)    => api.get(`/caregiver/history/${patientId}`),
  latest:  (patientId: number)    => api.get(`/caregiver/latest/${patientId}`),
};

/* ─── Reports ─── */
export const reportApi = {
  generate: (patientId: number, notes = "") =>
    api.post(`/reports/generate/${patientId}`, { doctor_notes: notes }),
  list:     ()                   => api.get("/reports/list"),
  download: (filename: string)   => `/api/reports/download/${filename}`,
};

/* ─── Games ─── */
export const gameApi = {
  submit:  (data: { game_type: string; difficulty: string; score: number; level_reached: number; time_seconds: number }) =>
    api.post("/games/submit", data),
  history: () => api.get("/games/history"),
  stats:   () => api.get("/games/stats"),
  patientStats: (patientId: number) => api.get(`/games/patient/${patientId}/stats`),
  byType:  (patientId: number, gameType: string) => api.get(`/games/by-type/${patientId}/${gameType}`),
};

/* ─── Doctor Dashboard ─── */
export const doctorDashboardApi = {
  stats:           ()                => api.get("/doctor/stats"),
  myPatients:      ()                => api.get("/doctor/my-patients"),
  riskAssessment:  (id: number)      => api.get(`/doctor/risk-assessment/${id}`),
  patientSummary:  (id: number)      => api.get(`/doctor/patient-summary/${id}`),
  patientTimeline: (id: number)      => api.get(`/doctor/patient-timeline/${id}`),
};

/* ─── Admin ─── */
export const adminApi = {
  stats:          ()           => api.get("/admin/stats"),
  pendingDoctors: ()           => api.get("/admin/doctors/pending"),
  allDoctors:     ()           => api.get("/admin/doctors"),
  allUsers:       ()           => api.get("/admin/users"),
  approve:        (id: number) => api.post(`/admin/doctors/${id}/approve`, {}),
  reject:         (id: number, reason?: string) => api.post(`/admin/doctors/${id}/reject`, { reason }),
  suspend:        (id: number) => api.post(`/admin/doctors/${id}/suspend`, {}),
  unsuspend:      (id: number) => api.post(`/admin/doctors/${id}/unsuspend`, {}),
  deactivate:     (id: number) => api.post(`/admin/users/${id}/deactivate`, {}),
  activate:       (id: number) => api.post(`/admin/users/${id}/activate`, {}),
  deleteUser:     (id: number) => api.delete(`/admin/users/${id}`),
  activity:       (limit = 30) => api.get(`/admin/activity?limit=${limit}`),
  assignDoctor:   (patientId: number, doctorId: number | null) =>
    api.post(`/admin/patients/${patientId}/assign-doctor`, { doctor_id: doctorId }),
};
