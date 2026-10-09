import { useQuery } from "@tanstack/react-query";
import { moviesApi } from "../api/moviesApi";
import HeroCarousel from "../components/movies/HeroCarousel";
import MovieSection from "../components/movies/MovieSection";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import "../styles/home.css";

function normalizeMovies(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.movies)) return response.movies;
  return [];
}

export default function HomePage() {
  const featured = useQuery({
    queryKey: ["movies", "featured"],
    queryFn: moviesApi.getFeatured,
  });

  const nowPlaying = useQuery({
    queryKey: ["movies", "now-playing"],
    queryFn: moviesApi.getNowPlaying,
  });

  const comingSoon = useQuery({
    queryKey: ["movies", "coming-soon"],
    queryFn: moviesApi.getComingSoon,
  });

  const { recent } = useRecentlyViewed();

  const queries = [featured, nowPlaying, comingSoon];

  if (queries.some((query) => query.isPending)) {
    return (
      <main className="home-page" aria-busy="true">
        <div className="hero-skeleton skeleton" />
        <div className="movie-section">
          <div className="title-skeleton skeleton" />
          <div className="movie-grid">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="card-skeleton skeleton" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (queries.some((query) => query.isError)) {
    return (
      <main className="home-error">
        <h2>Unable to load movies</h2>
        <p>Something went wrong. Please try again.</p>
        <button
          className="btn btn-primary"
          onClick={() =>
            queries
              .filter((query) => query.isError)
              .forEach((query) => query.refetch())
          }
        >
          Retry
        </button>
      </main>
    );
  }

  return (
    <main className="home-page">
      <HeroCarousel movies={normalizeMovies(featured.data)} />

      {recent.length > 0 && (
        <MovieSection title="Recently viewed" movies={recent} />
      )}

      <MovieSection
        title="NOW PLAYING"
        movies={normalizeMovies(nowPlaying.data)}
      />

      <MovieSection
        title="COMING SOON..."
        movies={normalizeMovies(comingSoon.data)}
        comingSoon
      />
    </main>
  );
}
