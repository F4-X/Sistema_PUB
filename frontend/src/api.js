import axios from "axios";

export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    (window?.location?.protocol === "file:"
      ? "http://127.0.0.1:3001"
      : "http://localhost:3001"),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;

    if (status === 401) {
      console.warn("Requisição não autorizada:", err?.response?.data);
    }

    return Promise.reject(err);
  }
);