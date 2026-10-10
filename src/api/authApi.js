import { api } from "./client";

export const authApi = {
  login: async (credentials) => {
    const { data } = await api.post("/login", credentials);
    return data;
  },

  register: async (payload) => {
    const { avatar, ...fields } = payload;

    if (avatar instanceof File) {
      const formData = new FormData();

      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
      });

      formData.append("avatar", avatar);

      const { data } = await api.post("/register", formData, {
        headers: {
          "Content-Type": undefined,
        },
      });

      return data;
    }

    const { data } = await api.post("/register", fields);
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
