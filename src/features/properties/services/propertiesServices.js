import { api } from "../../../api/axios";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

export const getMyProperties = async () => {
  const res = await api.get("/mobile/properties/my", { headers: authHeader() });
  return Array.isArray(res.data) ? res.data : (res.data?.properties ?? res.data?.items ?? []);
};

export const getPropertyById = async (id) => {
  const res = await api.get(`/mobile/properties/${id}`, { headers: authHeader() });
  return res.data;
};

export const deleteProperty = async (id) => {
  const res = await api.delete(`/mobile/properties/${id}`, { headers: authHeader() });
  return res.data;
};

export const createProperty = async (data) => {
  const formData = new FormData();
  formData.append("title", data.title);
  formData.append("price", data.price);
  formData.append("lat", data.lat);
  formData.append("lng", data.lng);
  if (data.description)     formData.append("description", data.description);
  if (data.owner_name)      formData.append("owner_name", data.owner_name);
  if (data.whatsapp_number) formData.append("whatsapp_number", data.whatsapp_number);
  if (data.contact_number?.length > 0) {
    data.contact_number.forEach((num) => formData.append("contact_number", num));
  }
  if (data.image) formData.append("image", data.image);

  const res = await api.post("/mobile/properties/", formData, {
    headers: {
      ...authHeader(),
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const updateProperty = async (id, data) => {
  const formData = new FormData();
  formData.append("title", data.title);
  formData.append("price", data.price);
  formData.append("lat", data.lat);
  formData.append("lng", data.lng);
  if (data.description)     formData.append("description", data.description);
  if (data.owner_name)      formData.append("owner_name", data.owner_name);
  if (data.whatsapp_number) formData.append("whatsapp_number", data.whatsapp_number);
  if (data.contact_number?.length > 0) {
    data.contact_number.forEach((num) => formData.append("contact_number", num));
  }
  if (data.image) formData.append("image", data.image);

  const res = await api.put(`/mobile/properties/${id}`, formData, {
    headers: {
      ...authHeader(),
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const toggleAvailability = async (id, isAvailable) => {
  const formData = new FormData();
  formData.append("is_available", isAvailable);

  const res = await api.put(`/mobile/properties/${id}`, formData, {
    headers: {
      ...authHeader(),
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};