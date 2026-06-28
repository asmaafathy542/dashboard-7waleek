import { api } from "../../../api/axios";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

export const getPlaces = async () => {
  const res = await api.get("/owner/my-place", { headers: authHeader() });
  return res.data;
};

export const getPlaceById = async (placeId) => {
  const res = await api.get(`/mobile/places/${placeId}`, { headers: authHeader() });
  return res.data?.data ?? res.data;
};

export const getMyPlaces = async () => {
  const res = await api.get("/owner/my-places", { headers: authHeader() });
  const data = res.data;
  console.log("[getMyPlaces] raw response:", JSON.stringify(data)?.slice(0, 300));
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.places)) return data.places;
  if (data && typeof data === "object" && data.id) return [data];
  return [];
};

export const addBranch = async (branchData) => {
  const res = await api.post("/owner/add-branch", branchData, {
    headers: authHeader(),
  });
  return res.data;
};

export const deletePlaceImage = async (imageId) => {
  const res = await api.delete(`/owner/place-images/${imageId}`, {
    headers: authHeader(),
  });
  return res.data;
};

export const uploadPlaceImage = async (placeId, file, imageType, caption = "") => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("place_id", placeId);
  formData.append("image_type", imageType);
  if (caption) formData.append("caption", caption);

  const baseURL = api.defaults.baseURL ?? "";

  const res = await fetch(`${baseURL}/dashboard/upload/place-image`, {
    method: "POST",
    headers: {
      ...authHeader(),
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Upload failed");
  }

  return res.json();
};

export const updatePlace = async (placeId, data) => {
  const res = await api.put(`/dashboard/places/${placeId}`, data, {
    headers: authHeader(),
  });
  return res.data;
};

export const getDeliveryPrice = async (placeId) => {
  const res = await api.get(`/owner/my-place/delivery-price?place_id=${placeId}`, {
    headers: authHeader(),
  });
  return res.data?.data ?? res.data;
};

export const updateDeliveryPrice = async (placeId, payload) => {
  const res = await api.put(
    `/owner/my-place/delivery-price?place_id=${placeId}`,
    payload,
    { headers: authHeader() }
  );
  return res.data?.data ?? res.data;
};

export const getWorkingHours = async (placeId) => {
  const res = await api.get(`/owner/my-place/working-hours?place_id=${placeId}`, {
    headers: authHeader(),
  });
  return res.data;
};

export const updateWorkingHours = async (placeId, workingHoursString) => {
  const res = await api.put(
    `/owner/my-place/working-hours?place_id=${placeId}`,
    { working_hours: workingHoursString },
    { headers: authHeader() }
  );
  return res.data;
};

// ✅ التعديل هنا — ضفنا placeId
export const updatePlaceStatus = async (isOpen, placeId) => {
  const res = await api.put(
    `/owner/my-place/status?place_id=${placeId}`,
    { is_open: isOpen },
    { headers: authHeader() }
  );
  return res.data;
};

// ✅ NEW: Soft Delete — إخفاء الفرع من التطبيق مع الاحتفاظ بالبيانات
export const deactivateBranch = async (branchId) => {
  const res = await api.patch(
    `/owner/branches/${branchId}`,
    { is_active: false },
    { headers: authHeader() }
  );
  return res.data;
};

export const activateBranch = async (branchId) => {
  const res = await api.patch(
    `/owner/branches/${branchId}`,
    { is_active: true },
    { headers: authHeader() }
  );
  return res.data;
};

export const getCategories = async () => {
  const res = await api.get("/v1/categories");
  return res.data;
};

// ── Order Settings ──────────────────────────────────────────────────────────

export const getOrderSettings = async (placeId) => {
  const res = await api.get(`/owner/my-place/order-settings?place_id=${placeId}`, {
    headers: authHeader(),
  });
  console.log("[getOrderSettings] raw response:", res.data);
  return res.data?.data ?? res.data;
};

export const updateOrderSettings = async (placeId, settings) => {
  const res = await api.put(
    `/owner/my-place/order-settings?place_id=${placeId}`,
    settings,
    { headers: authHeader() }
  );
  return res.data?.data ?? res.data;
};