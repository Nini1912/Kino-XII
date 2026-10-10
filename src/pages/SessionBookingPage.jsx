import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { bookingApi } from "../api/bookingApi";
import BookingModal from "../components/booking/BookingModal";

import "../styles/booking.css";

export default function SessionBookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: session,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["booking-session", id],
    queryFn: () => bookingApi.session(id),
    enabled: Boolean(id),
    retry: (failureCount, error) => {
      const status = error.response?.status;

      if (status === 404 || status === 403) {
        return false;
      }

      return failureCount < 2;
    },
  });

  function handleClose() {
    // Prefer the movie details page when possible.
    // This also works for directly opened booking links.
    const movieId = session?.movie?.id ?? session?.movie?.slug;

    if (movieId) {
      navigate(`/movies/${movieId}`, { replace: true });
    } else {
      navigate("/sessions", { replace: true });
    }
  }

  if (isPending) {
    return (
      <main className="kb-page">
        <div className="kb-page-state" role="status">
          <h1>Loading session...</h1>
          <p>Please wait while we prepare your booking.</p>
        </div>
      </main>
    );
  }

  if (isError) {
    const status = error?.response?.status;
    const notFound = status === 404;

    return (
      <main className="kb-page">
        <div className="kb-page-state" role="alert">
          <h1>{notFound ? "Session not found" : "Unable to load session"}</h1>

          <p>
            {notFound
              ? "This screening may have been removed or is no longer available."
              : status === 403
                ? "You do not have permission to view this session."
                : "Something went wrong while loading the screening. Please try again."}
          </p>

          <div className="kb-page-actions">
            {!notFound && status !== 403 && (
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                {isFetching ? "Retrying..." : "Try again"}
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate("/sessions", { replace: true })}
            >
              Browse sessions
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="kb-page">
        <div className="kb-page-state">
          <h1>Session unavailable</h1>
          <p>We could not find the requested screening.</p>

          <button
            type="button"
            onClick={() => navigate("/sessions", { replace: true })}
          >
            Browse sessions
          </button>
        </div>
      </main>
    );
  }

  const movie = session.movie;

  return (
    <main className="kb-page">
      <div
        className="kb-hero"
        style={
          movie?.backdropUrl
            ? {
                backgroundImage: `linear-gradient(90deg, rgba(7,11,27,.85), rgba(7,11,27,.25)), url("${movie.backdropUrl}")`,
              }
            : undefined
        }
      >
        <div className="kb-hero-content">
          {movie?.posterUrl && (
            <img src={movie.posterUrl} alt={movie.title ?? "Movie poster"} />
          )}

          <div>
            <span className="kb-now-playing">NOW PLAYING</span>

            <h1>{movie?.title ?? "Movie booking"}</h1>

            {movie?.description && <p>{movie.description}</p>}

            <small>
              {[
                movie?.runtimeMinutes ? `${movie.runtimeMinutes} min` : null,
                session?.format?.name,
              ]
                .filter(Boolean)
                .join(" · ")}
            </small>
          </div>
        </div>
      </div>

      <div className="kb-background-content">
        <h2>Session details</h2>

        <p>
          {[session?.venue?.name, session?.date, session?.time]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <BookingModal sessionId={id} onClose={handleClose} />
    </main>
  );
}
