import { Link } from "react-router-dom";
import { BellRing } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../hooks/useAuth";
import { moviesApi } from "../../api/moviesApi";

export default function ComingSoonCard({ movie }) {
  const { isAuthenticated, requireLogin } = useAuth();
  const queryClient = useQueryClient();

  const id = movie.id ?? movie.slug;

  const poster = movie.poster_url ?? movie.posterUrl ?? movie.poster;

  const genre = Array.isArray(movie.genres)
    ? movie.genres
        .map((item) => (typeof item === "string" ? item : item.name))
        .filter(Boolean)
        .join(", ")
    : (movie.genre ?? "");

  const duration = movie.duration_minutes ?? movie.duration;

  const rating = movie.age_rating ?? movie.ageRating;

  const ageRating =
    typeof rating === "object"
      ? (rating?.label ?? rating?.name ?? rating?.code)
      : rating;

  const releaseDate = movie.release_date ?? movie.releaseDate;

  const formattedDate = releaseDate
    ? new Date(releaseDate)
        .toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
        })
        .toUpperCase()
    : null;

  const notifyMutation = useMutation({
    mutationFn: () => moviesApi.notifyMovie(movie.slug),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["coming-soon"],
      });

      queryClient.invalidateQueries({
        queryKey: ["movie", id],
      });
    },
  });

  const isNotified = movie.isNotified || notifyMutation.isSuccess;

  function handleNotify() {
    if (notifyMutation.isPending) {
      return;
    }

    if (!movie.slug) {
      return;
    }

    if (!isAuthenticated) {
      requireLogin(() => notifyMutation.mutateAsync());
      return;
    }

    notifyMutation.mutate();
  }

  return (
    <article className="coming-soon-card">
      <Link to={`/movies/${id}`} className="coming-soon-image">
        {poster && <img src={poster} alt={movie.title} />}
      </Link>

      <div className="coming-soon-info">
        <span className="coming-soon-label">
          {formattedDate ? `IN CINEMAS ${formattedDate}` : "COMING SOON"}
        </span>

        <Link to={`/movies/${id}`}>
          <h3>{movie.title}</h3>
        </Link>

        <p className="coming-soon-details">
          {genre}
          {genre && duration ? " · " : ""}
          {duration ? `${duration} min` : ""}
        </p>

        {ageRating && <span className="coming-soon-age">{ageRating}</span>}

        <button
          type="button"
          className="notify-button"
          onClick={handleNotify}
          disabled={notifyMutation.isPending}
        >
          <BellRing size={16} />

          {notifyMutation.isPending
            ? "Saving..."
            : isNotified
              ? "Notification Enabled ✓"
              : "Notify Me"}
        </button>

        {notifyMutation.isError && (
          <p className="md-warning" role="alert">
            {notifyMutation.error?.response?.status === 404
              ? "Movie not found. Unable to enable notifications."
              : (notifyMutation.error?.response?.data?.message ??
                "Unable to enable notifications. Please try again.")}
          </p>
        )}
      </div>
    </article>
  );
}
