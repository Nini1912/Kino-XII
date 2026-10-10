import { api } from "./client";

const unwrap = (response) => response.data?.data ?? response.data;

export const bookingApi = {
  session: async (id) => unwrap(await api.get(`/sessions/${id}`)),
  seats: async (id) => unwrap(await api.get(`/sessions/${id}/seats`)),
  options: async () => unwrap(await api.get("/filter-options")),
  createHold: async (sessionId, seats) =>
    unwrap(await api.post(`/sessions/${sessionId}/holds`, {
      seats: seats.map(({ id, ticketType }) => ({ seatId: id, ticketType })),
    })),
  getHold: async (holdId) => unwrap(await api.get(`/holds/${encodeURIComponent(holdId)}`)),
  releaseHold: async (holdId) => api.delete(`/holds/${encodeURIComponent(holdId)}`),
  pay: async (payload) => unwrap(await api.post("/orders", payload)),
};
