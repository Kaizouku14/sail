import { config } from "@/utils/config";
import { PageRoutes } from "@/utils/constants";
import axios, { AxiosError } from "axios";

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

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const msg = Array.isArray(error.response?.data?.message)
      ? error.response?.data?.message[0]
      : typeof error.response?.data?.message === "string"
        ? error.response?.data?.message
        : typeof error.response?.data?.error === "string"
          ? error.response?.data?.error
          : null;

    if (msg) return msg;
    if (!error.response) return "Network error. Please check your connection.";
    return `Request failed (${error.response.status})`;
  }

  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

const AUTH_PAGES = [PageRoutes.LOGIN, PageRoutes.REGISTER];

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;

      if (!AUTH_PAGES.includes(currentPath)) {
        localStorage.removeItem("token");
        window.location.href = PageRoutes.LOGIN;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
