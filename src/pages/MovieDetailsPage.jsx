import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Clock3, MapPin, Ticket } from "lucide-react";

import { moviesApi } from "../api/moviesApi";
import { useAuth } from "../hooks/useAuth";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";

import "../styles/movieDetails.css";

function unwrapMovie(response) {
  const data = response?.data ?? response;
  return data?.movie ?? data;
}

function unwrapSessions(response) {
  const data = response?.data ?? response;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.sessions)) return data.sessions;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

function getGenreNames(genres) {
  if (Array.isArray(genres)) {
    return genres
      .map((genre) =>
        typeof genre === "string" ? genre : (genre?.name ?? genre?.label),
      )
      .filter(Boolean)
      .join(", ");
  }

  return typeof genres === "string" ? genres : "";
}

function getAgeRating(movie) {
  const rating = movie.age_rating ?? movie.ageRating;

  return typeof rating === "object"
    ? (rating?.label ?? rating?.name ?? rating?.code)
    : rating;
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
}

function formatTime(value) {
  if (!value) return "Time unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

function SessionCard({ session }) {
  const start =
    session.startsAt ??
    session.startTime ??
    session.start_time ??
    session.datetime ??
    session.dateTime;

  const venue =
    session.venue?.name ??
    session.venueName ??
    session.cinema?.name ??
    "Venue to be confirmed";

  const hall =
    session.hall?.name ?? session.hallName ?? session.auditorium?.name;

  const format =
    session.format?.name ??
    session.format?.label ??
    (typeof session.format === "string" ? session.format : null);

  const price = session.fromPrice ?? session.priceFrom ?? session.price;

  return (
    <article className="details-session-card">
      <div className="details-session-main">
        <div className="details-session-date">
          <CalendarDays size={17} />
          <span>{formatDate(start)}</span>
        </div>

        <strong className="details-session-time">{formatTime(start)}</strong>

        <div className="details-session-location">
          <MapPin size={15} />
          <span>
            {venue}
            {hall ? ` · ${hall}` : ""}
          </span>
        </div>

        {format && <span className="details-session-format">{format}</span>}
      </div>

      <div className="details-session-action">
        {price != null && <span>From ₾ {price}</span>}

        <Link to={`/sessions/${session.id}`} className="details-book-button">
          Select seats
        </Link>
      </div>
    </article>
  );
}

export default function MovieDetailsPage() {
  const { id } = useParams();

  const { isAuthenticated } = useAuth();
  const { addRecentlyViewed } = useRecentlyViewed();

  const movieQuery = useQuery({
    queryKey: ["movie", id],
    queryFn: () => moviesApi.getMovie(id),
    enabled: Boolean(id),
  });

  const sessionsQuery = useQuery({
    queryKey: ["movie", id, "sessions"],
    queryFn: () => moviesApi.getMovieSessions(id),
    enabled: Boolean(id),
  });

  const movie = unwrapMovie(movieQuery.data);

  useEffect(() => {
    if (!isAuthenticated || !movie?.id) return;

    addRecentlyViewed(movie);
  }, [movie, isAuthenticated, addRecentlyViewed]);

  if (movieQuery.isPending) {
    return (
      <main className="movie-details-page">
        <div className="movie-details-container">
          <p>Loading movie...</p>
        </div>
      </main>
    );
  }

  if (movieQuery.isError || !movie) {
    return (
      <main className="movie-details-page">
        <div className="movie-details-container">
          <h1>Movie unavailable</h1>
          <p>We couldn't load this movie.</p>
          <Link to="/" className="details-back-link">
            <ArrowLeft size={17} />
            Back to movies
          </Link>
        </div>
      </main>
    );
  }

  const poster = movie.poster_url ?? movie.posterUrl ?? movie.poster;

  const backdrop =
    movie.backdrop_url ?? movie.backdropUrl ?? movie.backdrop ?? poster;

  const duration = movie.duration_minutes ?? movie.duration;

  const description =
    movie.synopsis ?? movie.description ?? "Description unavailable.";

  const genre = getGenreNames(movie.genres ?? movie.genre);

  const ageRating = getAgeRating(movie);
  const sessions = unwrapSessions(sessionsQuery.data);

  return (
    <main className="movie-details-page">
      <div
        className="movie-details-backdrop"
        style={{
          backgroundImage: backdrop ? `url("${backdrop}")` : "none",
        }}
      />

      <div className="movie-details-container">
        <Link to="/" className="details-back-link">
          <ArrowLeft size={17} />
          Back to movies
        </Link>

        <section className="movie-details-hero">
          <div className="movie-details-poster">
            {poster ? (
              <img src={poster} alt={movie.title} />
            ) : (
              <div className="details-poster-empty">No poster available</div>
            )}
          </div>

          <div className="movie-details-content">
            <span className="details-eyebrow">KINO XII</span>

            <h1>{movie.title}</h1>

            <div className="details-meta">
              {ageRating && <span className="details-age">{ageRating}</span>}

              {duration && (
                <span>
                  <Clock3 size={16} />
                  {duration} min
                </span>
              )}

              {genre && <span>{genre}</span>}
            </div>

            <p className="details-description">{description}</p>

            {movie.fromPrice != null && (
              <p className="details-price">
                From <strong>₾ {movie.fromPrice}</strong>
              </p>
            )}

            <a href="#movie-sessions" className="details-primary-button">
              <Ticket size={18} />
              Buy tickets
            </a>
          </div>
        </section>

        <section id="movie-sessions" className="movie-sessions-section">
          <div className="movie-sessions-heading">
            <h2>Available sessions</h2>
            <p>Choose a screening to continue booking.</p>
          </div>

          {sessionsQuery.isPending ? (
            <p className="details-status">Loading sessions...</p>
          ) : sessionsQuery.isError ? (
            <div className="details-status">
              <p>Unable to load sessions.</p>
              <button type="button" onClick={() => sessionsQuery.refetch()}>
                Try again
              </button>
            </div>
          ) : sessions.length === 0 ? (
            <p className="details-status">
              No sessions are currently available.
            </p>
          ) : (
            <div className="details-sessions-list">
              {sessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
