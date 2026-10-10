import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clapperboard, Search, X } from "lucide-react";
import { moviesApi } from "../../api/moviesApi";
import "./SearchOverlay.css";

function extractMovies(response) {
  const body = response?.data ?? response;
  if (Array.isArray(body)) return body;
  return body?.movies ?? body?.data?.movies ?? [];
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
function searchableText(movie) {
  const people = [movie.director, movie.directors, movie.cast, movie.mainCast];
  const names = people
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .map((v) => (typeof v === "string" ? v : (v?.name ?? "")));
  return [movie.title, movie.originalTitle, ...names]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}
export default function SearchOverlay({ open, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const moviesQuery = useQuery({
    queryKey: ["overlay-search-movies"],
    enabled: open,
    staleTime: 60_000,
    queryFn: async () => {
      const results = await Promise.allSettled([
        moviesApi.getNowPlaying(),
        moviesApi.getComingSoon(),
        moviesApi.getFeatured(),
      ]);
      const fulfilled = results.filter(
        (result) => result.status === "fulfilled",
      );
      if (!fulfilled.length) throw new Error("Unable to load movies");
      const unique = new Map();
      fulfilled.forEach(({ value }) =>
        extractMovies(value).forEach((movie) => {
          if (movie?.id != null || movie?.slug)
            unique.set(String(movie.id ?? movie.slug), movie);
        }),
      );
      return [...unique.values()];
    },
  });
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    function keydown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", keydown);
    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener("keydown", keydown);
      previous?.focus?.();
    };
  }, [open, onClose]);
  const trimmed = query.trim();
  const matches = useMemo(() => {
  if (!trimmed) return [];

  const search = trimmed.toLocaleLowerCase();

  return (moviesQuery.data ?? [])
    .filter((movie) => searchableText(movie).includes(search))
    .sort((a, b) => {
      const titleA = searchableText(a);
      const titleB = searchableText(b);

      const score = (title) => {
        if (title === search) return 0;
        if (title.startsWith(search)) return 1;
        if (title.includes(` ${search}`)) return 2;
        return 3;
      };

      return score(titleA) - score(titleB);
    })
    .slice(0, 12);
}, [moviesQuery.data, trimmed]);
  if (!open) return null;
  function go(path) {
    onClose();
    setQuery("");
    navigate(path);
  }
  return (
    <div
      className="kino-search-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
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
          onSubmit={(e) => {
            e.preventDefault();
            if (matches[0]) go(`/movies/${matches[0].id ?? matches[0].slug}`);
          }}
        >
          <Search size={20} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search films and live events"
            aria-label="Search films and events"
          />
          <button
            type="button"
            className="kino-search-dismiss"
            aria-label="Close search"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </form>
        <div className="kino-search-panel">
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
          ) : moviesQuery.isPending ? (
            <div className="kino-search-empty">
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
          ) : matches.length ? (
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
                      onClick={() => {
                        onClose();
                        setQuery("");
                      }}
                    >
                      <div className="kino-search-poster">
                        {poster && <img src={poster} alt="" />}
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
