import { api } from "./client";

export const authApi = {
  login: async (credentials) => {
    const { data } = await api.post("/login", credentials);
    return data;
  },

  register: async (payload) => {
    const { data } = await api.post("/register", payload);
    return data;
  },

  me: async () => {
    const { data } = await api.get("/me");
    return data;
  },

  logout: async () => {
    const { data } = await api.post("/logout");
    return data;
  },
};
