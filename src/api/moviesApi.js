import { api } from "./client";

export const moviesApi = {
  notifyMovie: async (movieId) => {
    const response = await api.post(
      `/movies/${encodeURIComponent(movieId)}/notify`,
    );

    return response.data;
  },

  searchMovies: async (query) => {
    const response = await api.get("/search", {
      params: { q: query },
    });

    return response.data;
  },
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
    const response = await api.get(`/movies/${encodeURIComponent(id)}`);
    return response.data;
  },

  getMovieSessions: async (id, date) => {
    const response = await api.get(
      `/movies/${encodeURIComponent(id)}/sessions`,
      { params: date ? { date } : {} },
    );
    return response.data;
  },
};
