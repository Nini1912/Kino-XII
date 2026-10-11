import { Link } from "react-router-dom";

export default function RecentlyViewedCard({ movie }) {
  const id = movie.slug ?? movie.id;
  const poster = movie.posterUrl ?? movie.poster_url ?? movie.poster;
  const duration =
    movie.runtimeMinutes ?? movie.duration_minutes ?? movie.duration;

  const genres = Array.isArray(movie.genres)
    ? movie.genres
        .map((genre) => (typeof genre === "string" ? genre : genre.name))
        .filter(Boolean)
        .join(", ")
    : (movie.genre ?? "");

  const rating = movie.ageRating ?? movie.age_rating;
  const ageRating =
    typeof rating === "object" ? (rating?.code ?? rating?.label) : rating;

  return (
    <Link to={`/movies/${id}`} className="recently-viewed-card">
      <div className="recently-viewed-poster">
        {poster && <img src={poster} alt={movie.title} />}
      </div>

      <div className="recently-viewed-info">
        <h3>{movie.title}</h3>

        <p>
          {genres}
          {genres && duration ? " · " : ""}
          {duration ? `${duration} min` : ""}
        </p>

        {ageRating && <span className="recently-viewed-age">{ageRating}</span>}
      </div>
    </Link>
  );
}
