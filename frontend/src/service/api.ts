import { config } from "@/utils/config";
import { PageRoutes } from "@/utils/constants";
import axios from "axios";

const api = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((axiosConfig) => {
  const token = localStorage.getItem("token");
  if (token) {
    axiosConfig.headers.Authorization = `Bearer ${token}`;
  }
  return axiosConfig;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = PageRoutes.LOGIN;
    }
    return Promise.reject(error);
  },
);

export default api;
