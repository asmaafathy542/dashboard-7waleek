// ordersService.js
import { api } from "../../../api/axios";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

/** كل الأوردرات (All Branches) */
export const getOrders = async () => {
  const res = await api.get("/owner/orders/orders", { headers: authHeader() });
  return res.data;
};

/** أوردرات فرع معين */
export const getOrdersByBranch = async (placeId) => {
  const res = await api.get(
    `/owner/orders/place/${placeId}`,
    { headers: authHeader() }
  );
  return res.data;
};

export const updateOrderStatus = async (orderId, status) => {
  const res = await api.patch(
    `/owner/orders/orders/${orderId}/status?new_status=${status}`,
    {},
    { headers: authHeader() }
  );
  return res.data;
};

export const getOrderById = async (orderId) => {
  const cleanId = String(orderId).split(":")[0];
  const res = await api.get(`/owner/orders/orders/${cleanId}`, { headers: authHeader() });
  return res.data;
};


export const deleteOrder = async (orderId) => {
  const res = await api.delete(
    `/owner/orders/orders/${orderId}`,
    { headers: authHeader() }
  );
  return res.data;
};