import { api } from "../../../api/axios";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

export const getProfile = async () => {
  const res = await api.get("/mobile/auth/profile", { headers: authHeader() });
  return res.data;
};

export const updateProfile = async (data) => {
  const res = await api.put("/mobile/auth/profile", data, { headers: authHeader() });
  return res.data;
};

export const changePassword = async (data) => {
  const res = await api.post("/mobile/auth/change-password", {
    current_password: data.old_password,
    new_password: data.new_password,
  }, { headers: authHeader() });
  return res.data;
};