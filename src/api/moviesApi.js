import { api } from "./client";

export const moviesApi = {
  getFeatured: async () => {
    const response = await api.get("/movies/featured");
    return response.data;
  },

  getNowPlaying: async () => {
    const response = await api.get("/movies/now-playing");
    return response.data;
  },

  getComingSoon: async () => {
    const response = await api.get("/movies/coming-soon");
    return response.data;
  },

  getMovie: async (id) => {
    const response = await api.get(`/movies/${id}`);
    return response.data;
  },
};
