import { api } from "../../../api/axios";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

export const getItems = async (placeId) => {
  const res = await api.get(`/mobile/items/place/${placeId}`);
  return Array.isArray(res.data) ? res.data : (res.data.items ?? []);
};

export const createItem = async (itemData) => {
  const res = await api.post("/v1/items", itemData, {  // ✅ غيرنا
    headers: authHeader(),
  });
  return res.data;
};

export const updateItem = async (itemId, itemData) => {
  const res = await api.put(`/v1/items/${itemId}`, itemData, {  // ✅ غيرنا
    headers: authHeader(),
  });
  return res.data;
};

export const deleteItem = async (itemId) => {
  const res = await api.delete(`/v1/items/${itemId}`, {  // ✅ غيرنا
    headers: authHeader(),
  });
  return res.data;
};

export const uploadItemImage = async (itemId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/v1/items/${itemId}/image`, formData, {  // ✅ غيرنا
    headers: {
      ...authHeader(),
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const getSubCategories = async (placeId) => {
  const res = await api.get(`/v1/subcategories/place/${placeId}`, {
    headers: authHeader(),
  });
  return Array.isArray(res.data) ? res.data : (res.data.subcategories ?? []);
};

export const createSubCategory = async (data) => {
  const res = await api.post("/v1/subcategories", data, {
    headers: authHeader(),
  });
  return res.data;
};

export const updateSubCategory = async (id, data) => {
  const res = await api.put(`/v1/subcategories/${id}`, data, {
    headers: authHeader(),
  });
  return res.data;
};

export const deleteSubCategory = async (id) => {
  const res = await api.delete(`/v1/subcategories/${id}`, {
    headers: authHeader(),
  });
  return res.data;
};

export const getItemsBySubCategory = async (subCategoryId) => {
  const res = await api.get(`/v1/items/subcategory/${subCategoryId}`);
  return Array.isArray(res.data) ? res.data : (res.data.items ?? []);
};

export const deleteItemsBulk = async (itemIds) => {
  await Promise.all(itemIds.map((id) => deleteItem(id)));
};