import axios from "axios";

export const api = axios.create({
  baseURL: "https://api.kinoxii.redberryinternship.ge/api",
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("kino_token");

    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "";

    const isAuthEndpoint =
      url.includes("/login") ||
      url.includes("/register") ||
      url.includes("/logout");

    if (status === 401 && !isAuthEndpoint) {
      window.dispatchEvent(new Event("auth:required"));
    }

    return Promise.reject(error);
  },
);
