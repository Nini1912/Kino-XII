import { Link } from "react-router-dom";

export default function MovieCard({ movie }) {
  const id = movie.id ?? movie.slug;

  const poster = movie.poster_url ?? movie.posterUrl ?? movie.poster;

  const duration = movie.duration_minutes ?? movie.duration;

  const price = movie.fromPrice;

  const genre = Array.isArray(movie.genres)
    ? movie.genres
        .map((item) => (typeof item === "string" ? item : item.name))
        .filter(Boolean)
        .join(", ")
    : (movie.genre ?? "");

  const rating = movie.age_rating ?? movie.ageRating;

  const ageRating =
    typeof rating === "object"
      ? (rating?.label ?? rating?.name ?? rating?.code)
      : rating;

  return (
    <article className="movie-card">
      <Link to={`/movies/${id}`} className="movie-poster-link">
        {poster ? (
          <img src={poster} alt={movie.title} className="movie-poster" />
        ) : (
          <div className="movie-poster movie-poster-empty">No poster</div>
        )}
      </Link>

      <div className="movie-info">
        <Link to={`/movies/${id}`}>
          <h3>{movie.title}</h3>
        </Link>

        <p className="movie-details">
          {genre}
          {genre && duration ? " · " : ""}
          {duration ? `${duration} min` : ""}
        </p>

        {ageRating && <span className="movie-age-badge">{ageRating}</span>}

        <div className="movie-card-bottom">
          <span className="movie-price">
            {price != null ? `From ₾ ${price}` : "Price unavailable"}
          </span>

          <Link to={`/movies/${id}#movie-sessions`} className="btn btn-primary">
            Buy Ticket
          </Link>
        </div>
      </div>
    </article>
  );
}
