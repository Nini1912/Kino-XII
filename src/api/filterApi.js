import { api } from "./client";

export const filterApi = {
  getOptions: async () => {
    const response = await api.get("/filter-options");
    return response.data;
  },
};
