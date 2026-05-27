import { api } from "../../../api/axios";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

export const getNotifications = async () => {
  const res = await api.get("/owner/notifications/requests", { headers: authHeader() });
  return res.data;
};

// ✅ native fetch — avoids CORS preflight issues caused by withCredentials in axios instance
export const sendNotification = async ({ title, message, target_type, target_user_id }) => {
  const body = { title, message, target_type };
  if (target_type === "SPECIFIC_USER") body.target_user_id = Number(target_user_id);

  const baseURL = api.defaults.baseURL ?? "";

  const res = await fetch(`${baseURL}/owner/notifications/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err?.error?.message ?? "Send failed");
    error.status = res.status; // ✅ احتفظ بالـ status code
    throw error;
  }

  return res.json();
};