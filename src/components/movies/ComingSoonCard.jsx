import { Link } from "react-router-dom";
import { BellRing } from "lucide-react";

export default function ComingSoonCard({ movie, onNotify }) {
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
          onClick={() => onNotify?.(movie)}
        >
          <BellRing size={16} />
          Notify Me
        </button>
      </div>
    </article>
  );
}
