// ordersService.js
import { api } from "../../../api/axios";

/** كل الأوردرات (All Branches) */
export const getOrders = async () => {
  const res = await api.get("/owner/orders/");
  return res.data;
};

/** أوردرات فرع معين */
export const getOrdersByBranch = async (placeId) => {
  const res = await api.get(`/owner/orders/place/${placeId}`);
  return res.data;
};

/** تغيير status الأوردر */
export const updateOrderStatus = async (orderId, status) => {
  const res = await api.patch(
    `/owner/orders/${orderId}/status?new_status=${status}`,
    {}
  );
  return res.data;
};

/** جيب أوردر بالـ ID */
export const getOrderById = async (orderId) => {
  const cleanId = String(orderId).split(":")[0];
  const res = await api.get(`/owner/orders/${cleanId}`);
  return res.data;
};

/** حذف أوردر */
export const deleteOrder = async (orderId) => {
  const res = await api.delete(`/owner/orders/${orderId}`);
  return res.data;
};
