/**import { api } from "../../../api/axios";

export const login = async (data) => {
  const response = await api.post("/mobile/auth/login", data);

  return response.data;
}; **/

/**import { api } from "../../../api/axios";

export const login = async (data) => {
  const formData = new FormData();

  formData.append("username", data.email);
  formData.append("password", data.password);

  const response = await api.post(
    "/mobile/auth/login",
    formData
  );

  return response.data;
}; **/

import { api } from "../../../api/axios";
import { saveAuth } from "../../../store/authStore.js";

export const login = async (data) => {
  const formData = new FormData();

  formData.append("username", data.email);
  formData.append("password", data.password);

  const response = await api.post(
    "/mobile/auth/login",
    formData
  );

  console.log(response);

  return response.data;
};