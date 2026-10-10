import { useQuery } from "@tanstack/react-query";

import { moviesApi } from "../api/moviesApi";

import HeroCarousel from "../components/movies/HeroCarousel";
import MovieSection from "../components/movies/MovieSection";

import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { useAuth } from "../hooks/useAuth";

import "../styles/home.css";

function normalizeMovies(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.movies)) return response.movies;
  if (Array.isArray(response?.data?.movies)) {
    return response.data.movies;
  }

  return [];
}

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const { recent } = useRecentlyViewed();

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
          type="button"
          className="btn btn-primary"
          onClick={() => {
            queries
              .filter((query) => query.isError)
              .forEach((query) => query.refetch());
          }}
        >
          Retry
        </button>
      </main>
    );
  }

  const featuredMovies = normalizeMovies(featured.data);
  const nowPlayingMovies = normalizeMovies(nowPlaying.data);
  const comingSoonMovies = normalizeMovies(comingSoon.data);

  return (
    <main className="home-page">
      {/* Featured Movies */}
      <HeroCarousel movies={featuredMovies} />

      {/* Recently Viewed - Logged-in users only */}
      {isAuthenticated && recent.length > 0 && (
        <MovieSection title="Recently viewed" movies={recent} />
      )}

      {/* Now Playing */}
      <MovieSection title="NOW PLAYING" movies={nowPlayingMovies} />

      {/* Coming Soon */}
      <MovieSection
        title="COMING SOON..."
        movies={comingSoonMovies}
        comingSoon
      />
    </main>
  );
}
