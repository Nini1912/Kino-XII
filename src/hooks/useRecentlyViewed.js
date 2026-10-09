import { useState } from "react";

const STORAGE_KEY = "kinoxii_recent_movies";

export function useRecentlyViewed() {
  const [recent, setRecent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  function addRecentlyViewed(movie) {
    setRecent((previous) => {
      const updated = [
        movie,
        ...previous.filter((item) => item.id !== movie.id),
      ].slice(0, 6);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  return { recent, addRecentlyViewed };
}
