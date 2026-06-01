
//admin notification 
import { api } from "../../../api/axios";

const BASE = "https://aroundubackend-production.up.railway.app/api";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

// ── GET all owner requests ──────────────────────────────────────────────────
export const getNotificationRequests = async () => {
  const res = await api.get("/dashboard/admin/notifications/requests", {
    headers: authHeader(),
  });
  return res.data;
};

// ── Approve a request ──────────────────────────────────────────────────────
export const approveRequest = async (requestId) => {
  const res = await fetch(
    `${BASE}/dashboard/admin/notifications/requests/${requestId}/approve`,
    { method: "POST", headers: authHeader() }
  );
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

// ── Reject a request ───────────────────────────────────────────────────────
export const rejectRequest = async (requestId) => {
  const res = await fetch(
    `${BASE}/dashboard/admin/notifications/requests/${requestId}/reject`,
    { method: "POST", headers: authHeader() }
  );
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

// ── Archive a request ──────────────────────────────────────────────────────
export const archiveRequest = async (requestId) => {
  const res = await fetch(
    `${BASE}/dashboard/admin/notifications/requests/${requestId}/archive`,
    { method: "POST", headers: authHeader() }
  );
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

// ── Admin sends a notification directly ───────────────────────────────────
export const sendAdminNotification = async ({ title, message, target_type, target_user_id }) => {
  const body = { title, message, target_type };
  if (target_type === "SPECIFIC_USER") body.target_user_id = Number(target_user_id);

  const res = await fetch(`${BASE}/dashboard/admin/notifications/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

// ── GET global notification logs ───────────────────────────────────────────
export const getNotificationLogs = async () => {
  const res = await api.get("/dashboard/admin/notifications/all", {
    headers: authHeader(),
  });
  return res.data;
};