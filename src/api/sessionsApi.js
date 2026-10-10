import { api } from "./client";

export const sessionsApi = {
  getFilterOptions: async () => {
    const { data } = await api.get("/filter-options");
    return data.data ?? data;
  },

  getSessions: async (params = {}) => {
    const query = new URLSearchParams();

    if (params.date) query.set("date", params.date);
    if (params.search) query.set("search", params.search);
    if (params.sort) query.set("sort", params.sort);

    query.set("page", String(params.page ?? 1));

    const arrayFilters = {
      venues: params.venues,
      formats: params.formats,
      languages: params.languages,
      bands: params.bands,
    };

    Object.entries(arrayFilters).forEach(([key, values]) => {
      if (!Array.isArray(values)) return;

      values.forEach((value) => {
        query.append(`${key}[]`, value);
      });
    });

    const { data } = await api.get("/sessions", {
      params: query,
    });

    return data;
  },

  getSession: async (id) => {
    const { data } = await api.get(`/sessions/${id}`);
    return data.data ?? data;
  },

  getSessionSeats: async (id) => {
    const { data } = await api.get(`/sessions/${id}/seats`);
    return data.data ?? data;
  },
};
