// authStore.js
export const saveAuth = (data) => {
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  localStorage.setItem("user", JSON.stringify(data.user));
};

export const getToken = () => localStorage.getItem("access_token");

export const clearAuth = () => localStorage.clear();

// ── Branch helpers ──────────────────────────────────────────────────────────

/** حفظ الـ place_id المختار */
export const saveSelectedBranch = (placeId) => {
  localStorage.setItem("selected_place_id", String(placeId));
};

/** جيب الـ place_id المحفوظ (أو null) */
export const getSelectedBranch = () => {
  const val = localStorage.getItem("selected_place_id");
  return val ? Number(val) : null;
};

/** امسح الفرع المختار (مثلاً عند logout) */
export const clearSelectedBranch = () => {
  localStorage.removeItem("selected_place_id");
};