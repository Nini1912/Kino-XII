import { api } from "./client";

export const ticketsApi = {
  getTickets: async (filter = "upcoming") => {
    const { data } = await api.get("/tickets", {
      params: { filter },
    });

    return data.data ?? data;
  },

  refundOrder: async (reference) => {
    const { data } = await api.post(
      `/orders/${encodeURIComponent(reference)}/refund`,
    );

    return data.data ?? data;
  },
};
