import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock3 } from "lucide-react";
import { moviesApi } from "../api/moviesApi";
import { useAuth } from "../hooks/useAuth";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import "../styles/movieDetails.css";

const unwrap = (response) => response?.data ?? response;
const prettyDate = (value) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
const longDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}T12:00:00Z`))
    : "—";

export default function MovieDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { addRecentlyViewed } = useRecentlyViewed();
  const [selectedDate, setSelectedDate] = useState("");
  const movieQuery = useQuery({
    queryKey: ["movie", id],
    queryFn: () => moviesApi.getMovie(id),
    enabled: !!id,
  });
  const movie = unwrap(movieQuery.data);
  const availableDates = movie?.availableDates ?? [];
  const date = availableDates.includes(selectedDate)
    ? selectedDate
    : (availableDates[0] ?? "");
  const sessionsQuery = useQuery({
    queryKey: ["movie", id, "sessions", date],
    queryFn: () => moviesApi.getMovieSessions(id, date),
    enabled: !!id && !!date && !movie?.isComingSoon,
  });
  const venueGroups = useMemo(() => {
    const result = unwrap(sessionsQuery.data);
    return Array.isArray(result) ? result : [];
  }, [sessionsQuery.data]);

  useEffect(() => {
    if (isAuthenticated && movie?.id) addRecentlyViewed(movie);
  }, [isAuthenticated, movie?.id, addRecentlyViewed]);
  useEffect(() => {
    if (location.hash !== "#movie-sessions" || movieQuery.isPending) return;
    const frame = requestAnimationFrame(() =>
      document
        .getElementById("movie-sessions")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [location.hash, movieQuery.isPending]);

  if (movieQuery.isPending)
    return <main className="md-status-page">Loading movie...</main>;
  if (movieQuery.isError || !movie)
    return (
      <main className="md-status-page">
        <h1>Movie unavailable</h1>
        <p>
          {movieQuery.error?.response?.data?.message ??
            "We couldn't load this movie."}
        </p>
        <Link to="/">Back to movies</Link>
      </main>
    );

  const poster = movie.posterUrl ?? movie.poster_url ?? movie.poster;
  const backdrop =
    movie.backdropUrl ?? movie.backdrop_url ?? movie.backdrop ?? poster;
  const age = movie.ageRating ?? movie.age_rating;
  const ageCode = typeof age === "object" ? age?.code : age;
  const ageRestricted =
    isAuthenticated &&
    user?.age != null &&
    age?.minAge != null &&
    Number(user.age) < Number(age.minAge);
  const genres = (movie.genres ?? [])
    .map((item) => (typeof item === "string" ? item : item.name))
    .filter(Boolean)
    .join(", ");
  const formats = (movie.formats ?? [])
    .map((item) => (typeof item === "string" ? item : item.name))
    .filter(Boolean)
    .join(", ");
  const isUpcoming = movie.isComingSoon || !availableDates.length;

  return (
    <main className="md-page">
      <section
        className="md-hero"
        style={{
          backgroundImage: backdrop
            ? `linear-gradient(90deg,rgba(6,10,23,.78),rgba(6,10,23,.30)),url("${backdrop}")`
            : undefined,
        }}
      >
        <div className="md-container md-hero-inner">
          <div className="md-poster">
            {poster && <img src={poster} alt={movie.title} />}
          </div>
          <div className="md-hero-copy">
            <span className="md-eyebrow">
              {movie.isComingSoon ? "COMING SOON" : "NOW PLAYING"}
            </span>
            <h1>{movie.title}</h1>
            <p>{movie.synopsis ?? movie.description}</p>
            <div className="md-chips">
              {ageCode && (
                <span className="md-age" title={age?.description ?? ""}>
                  {ageCode}
                </span>
              )}
              {movie.runtimeMinutes && (
                <span>
                  <Clock3 size={14} /> {movie.runtimeMinutes} Min
                </span>
              )}
              {(movie.formats ?? []).map((f) => (
                <span key={f.id ?? f.slug ?? f}>
                  {typeof f === "string" ? f : f.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
      <div className="md-container md-main">
        <section id="movie-sessions" className="md-sessions">
          <h2>Sessions</h2>
          {availableDates.length > 0 && (
            <div className="md-dates" aria-label="Choose session date">
              {availableDates.slice(0, 7).map((day) => (
                <button
                  key={day}
                  type="button"
                  className={date === day ? "selected" : ""}
                  onClick={() => setSelectedDate(day)}
                >
                  <span>{prettyDate(day).split(" ")[0]}</span>
                  <strong>{day.slice(-2)}</strong>
                </button>
              ))}
            </div>
          )}
          {ageRestricted && (
            <p className="md-warning">
              You must be at least {age.minAge} to book this film.
            </p>
          )}
          {isUpcoming ? (
            <p className="md-muted">
              {movie.isComingSoon
                ? "Sessions will be announced soon."
                : "No upcoming sessions are available."}
            </p>
          ) : sessionsQuery.isPending ? (
            <p className="md-muted">Loading sessions...</p>
          ) : sessionsQuery.isError ? (
            <div className="md-muted">
              Could not load sessions:{" "}
              {sessionsQuery.error?.response?.data?.message ??
                sessionsQuery.error?.message}
              <button type="button" onClick={() => sessionsQuery.refetch()}>
                Retry
              </button>
            </div>
          ) : !venueGroups.length ? (
            <p className="md-muted">No sessions for this date.</p>
          ) : (
            venueGroups.map((group, gi) => (
              <div className="md-venue" key={group.venue?.id ?? gi}>
                <h3>{group.venue?.name ?? "Cinema"}</h3>
                <div className="md-halls">
                  {Object.entries(
                    (group.sessions ?? []).reduce((acc, session) => {
                      const key = session.hall?.name ?? "Hall";
                      (acc[key] ??= []).push(session);
                      return acc;
                    }, {}),
                  ).map(([hall, sessions]) => (
                    <div className="md-hall" key={hall}>
                      <h4>Hall {hall}</h4>
                      <div className="md-showtimes">
                        {sessions.map((session) => {
                          const disabled =
                            session.isSoldOut ||
                            session.seatsLeft <= 0 ||
                            ageRestricted ||
                            (session.startsAt &&
                              Date.parse(session.startsAt) <= Date.now());
                          return (
                            <button
                              key={session.id}
                              type="button"
                              disabled={disabled}
                              className="md-showtime"
                              onClick={() =>
                                navigate(`/sessions/${session.id}`)
                              }
                              title={
                                disabled
                                  ? "This session cannot be booked"
                                  : `Book ${session.time}`
                              }
                            >
                              <span className="md-showtime-top">
                                <strong>{session.time ?? "—"}</strong>
                                <b>₾ {session.price}</b>
                              </span>
                              <span className="md-showtime-bottom">
                                <span>{session.language?.code ?? "—"}</span>
                                <span>
                                  {session.format?.name ?? "Standard"}
                                </span>
                                <span>
                                  {session.isSoldOut
                                    ? "Sold out"
                                    : `${session.seatsLeft} left`}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
        <aside className="md-details">
          <h2>Details</h2>
          <dl>
            <dt>DIRECTOR</dt>
            <dd>{movie.director ?? "—"}</dd>
            <dt>MAIN CAST</dt>
            <dd>{movie.cast ?? "—"}</dd>
            <dt>DURATION</dt>
            <dd>
              {movie.runtimeMinutes ? `${movie.runtimeMinutes} minutes` : "—"}
            </dd>
            <dt>RELEASE DATE</dt>
            <dd>{longDate(movie.releaseDate)}</dd>
            <dt>FORMATS</dt>
            <dd>{formats || "—"}</dd>
            <dt>FROM</dt>
            <dd>{movie.fromPrice != null ? `₾${movie.fromPrice}` : "—"}</dd>
          </dl>
          {age?.description && (
            <div className="md-rating-note">
              <strong>RATING NOTE</strong>
              <p>{age.description}</p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
