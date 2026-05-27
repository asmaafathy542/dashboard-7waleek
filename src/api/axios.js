/*import axios from "axios";

export const api = axios.create({
  baseURL: "https://aroundubackend-production.up.railway.app/api", // عدليه يا اسماء علي حسب لينك الباك اند اللي عبدالله شغال عليه
  withCredentials: true,
}); 
*/

import axios from "axios";

export const api = axios.create({
  baseURL: "https://aroundubackend-production.up.railway.app/api",
});

// بيضيف الـ token تلقائياً في كل request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// مش بيعمل logout تلقائي — بس بيرجع الـ error عشان كل service تتعامل معاه
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);