import { api } from "../../../api/axios";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

export const getReviews = async (placeId, page = 1, pageSize = 100) => {
  const res = await api.get(
    `/owner/places/${placeId}/reviews?page=${page}&page_size=${pageSize}`,
    { headers: authHeader() }
  );
  const items = Array.isArray(res.data) ? res.data : (res.data.items ?? []);
  return {
    items,
    total: res.data.total ?? items.length,
  };
};

export const getAllReviews = async () => {
  const res = await api.get(`/owner/reviews/list?page=1&page_size=100`, {
    headers: authHeader(),
  });
  const items = Array.isArray(res.data) ? res.data : (res.data.items ?? []);
  return {
    items,
    total: res.data.total ?? items.length,
  };
};

export const getReviewsSentiment = async (placeId) => {
  const res = await api.get(`/owner/reviews?place_id=${placeId}`, {
    headers: authHeader(),
  });
  return res.data;
};


export const getPropertyReviews = async (propertyId) => {
  const res = await api.get(
    `/mobile/properties/${propertyId}/reviews`,
    { headers: authHeader() }
  );
  const items = Array.isArray(res.data) ? res.data : (res.data.items ?? []);
  return {
    items,
    total: res.data.total ?? items.length,
  };
};