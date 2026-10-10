import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clapperboard, Search, X } from "lucide-react";

import { moviesApi } from "../../api/moviesApi";
import "./SearchOverlay.css";

const SEARCH_DELAY = 300;
const MAX_RESULTS = 12;

function extractMovies(response) {
  const body = response?.data ?? response;

  if (Array.isArray(body)) {
    return body;
  }

  if (Array.isArray(body?.movies)) {
    return body.movies;
  }

  if (Array.isArray(body?.data)) {
    return body.data;
  }

  if (Array.isArray(body?.data?.movies)) {
    return body.data.movies;
  }

  return [];
}

function highlightSearch(title, query) {
  const text = String(title ?? "");
  const search = query.trim();

  if (!search) return text;

  const index = text.toLowerCase().indexOf(search.toLowerCase());

  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <mark className="kino-search-highlight">
        {text.slice(index, index + search.length)}
      </mark>
      {text.slice(index + search.length)}
    </>
  );
}

export default function SearchOverlay({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const inputRef = useRef(null);
  const navigate = useNavigate();

  const trimmed = query.trim();

  // Debounce search input.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEARCH_DELAY);

    return () => clearTimeout(timer);
  }, [query]);

  // Search movies using the backend API.
  const moviesQuery = useQuery({
    queryKey: ["movie-search", debouncedQuery],
    queryFn: () => moviesApi.searchMovies(debouncedQuery),
    enabled: open && debouncedQuery.length > 0,
    staleTime: 60_000,
    retry: 1,
  });

  const matches =
    trimmed === debouncedQuery && moviesQuery.isSuccess
      ? extractMovies(moviesQuery.data).slice(0, MAX_RESULTS)
      : [];

  const isSearching =
    trimmed.length > 0 && (trimmed !== debouncedQuery || moviesQuery.isPending);

  // Focus input and handle Escape.
  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement;

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      previous?.focus?.();
    };
  }, [open, onClose]);

  function closeSearch() {
    setQuery("");
    setDebouncedQuery("");
    onClose();
  }

  function go(path) {
    closeSearch();
    navigate(path);
  }

  if (!open) return null;

  return (
    <div
      className="kino-search-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeSearch();
        }
      }}
    >
      <div
        className="kino-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Search films and events"
      >
        <form
          className="kino-search-field"
          onSubmit={(event) => {
            event.preventDefault();

            if (isSearching || moviesQuery.isError) return;

            if (matches[0]) {
              const movie = matches[0];
              go(`/movies/${movie.id ?? movie.slug}`);
            }
          }}
        >
          <Search size={20} />

          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search films and live events"
            aria-label="Search films and events"
            autoComplete="off"
          />

          <button
            type="button"
            className="kino-search-dismiss"
            aria-label="Close search"
            onClick={closeSearch}
          >
            <X size={18} />
          </button>
        </form>

        <div className="kino-search-panel" aria-live="polite">
          {!trimmed ? (
            <div className="kino-search-empty">
              <span className="kino-search-icon">
                <Clapperboard size={24} />
              </span>

              <strong>What do you want to watch?</strong>

              <p>Search by title, director or cast.</p>

              <button type="button" onClick={() => go("/sessions")}>
                Browse all sessions
              </button>
            </div>
          ) : isSearching ? (
            <div className="kino-search-empty">
              <span className="kino-search-icon">
                <Search size={24} />
              </span>

              <p>Searching movies...</p>
            </div>
          ) : moviesQuery.isError ? (
            <div className="kino-search-empty">
              <strong>Unable to load movies</strong>

              <p>Please try again.</p>

              <button type="button" onClick={() => moviesQuery.refetch()}>
                Retry
              </button>
            </div>
          ) : matches.length > 0 ? (
            <>
              <div className="kino-search-results-head">
                <strong>FILMS &amp; EVENTS</strong>

                <span>
                  {matches.length} {matches.length === 1 ? "result" : "results"}
                </span>
              </div>

              <div className="kino-search-results">
                {matches.map((movie) => {
                  const id = movie.id ?? movie.slug;

                  const poster =
                    movie.posterUrl ?? movie.poster_url ?? movie.poster;

                  const age =
                    movie.ageRating?.code ??
                    movie.age_rating?.code ??
                    movie.ageRating ??
                    movie.age_rating;

                  const duration =
                    movie.runtimeMinutes ??
                    movie.duration_minutes ??
                    movie.duration;

                  const soon = movie.isComingSoon ?? movie.is_coming_soon;

                  return (
                    <Link
                      key={id}
                      to={`/movies/${id}`}
                      className="kino-search-result"
                      onClick={closeSearch}
                    >
                      <div className="kino-search-poster">
                        {poster && <img src={poster} alt="" loading="lazy" />}
                      </div>

                      <div className="kino-search-result-info">
                        <strong className="kino-search-result-title">
                          {highlightSearch(movie.title, trimmed)}
                        </strong>

                        <span>
                          {movie.kind === "event" ? "Event" : "Film"}

                          {age && typeof age !== "object" ? ` · ${age}` : ""}

                          {duration ? ` · ${duration} min` : ""}
                        </span>
                      </div>

                      <span
                        className={
                          soon ? "kino-search-coming" : "kino-search-price"
                        }
                      >
                        {soon
                          ? "Coming Soon"
                          : movie.fromPrice != null
                            ? `from ₾${movie.fromPrice}`
                            : "View details"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="kino-search-empty">
              <span className="kino-search-icon">
                <Search size={24} />
              </span>

              <strong>No results for “{trimmed}”</strong>

              <p>Check the spelling or try another film or live event.</p>

              <button type="button" onClick={() => go("/sessions")}>
                Browse all sessions
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
