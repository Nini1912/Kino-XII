import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "kinoxii_recent_movies";
const CHANGE_EVENT = "kinoxii:recent-movies-changed";

function readRecentMovies() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function useRecentlyViewed() {
  const [recent, setRecent] = useState(readRecentMovies);

  useEffect(() => {
    function syncRecentMovies() {
      setRecent(readRecentMovies());
    }

    window.addEventListener(CHANGE_EVENT, syncRecentMovies);
    window.addEventListener("storage", syncRecentMovies);

    return () => {
      window.removeEventListener(CHANGE_EVENT, syncRecentMovies);
      window.removeEventListener("storage", syncRecentMovies);
    };
  }, []);

  const addRecentlyViewed = useCallback((movie) => {
    if (!movie?.id && !movie?.slug) return;

    const movieId = movie.id ?? movie.slug;

    const updated = [
      movie,
      ...readRecentMovies().filter(
        (item) => (item.id ?? item.slug) !== movieId,
      ),
    ].slice(0, 6);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { recent, addRecentlyViewed };
}
