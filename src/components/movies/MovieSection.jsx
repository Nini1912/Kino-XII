import { Link } from "react-router-dom";
import MovieCard from "./MovieCard";
import ComingSoonCard from "./ComingSoonCard";

export default function MovieSection({
  title,
  movies = [],
  comingSoon = false,
}) {
  return (
    <section className="movie-section">
      <div className="section-header">
        <h2>{title}</h2>
        <Link to="/sessions" className="see-all">
          See all
        </Link>
      </div>

      {movies.length === 0 ? (
        <p className="empty-message">No movies available at the moment.</p>
      ) : (
        <div className={comingSoon ? "coming-soon-grid" : "movie-grid"}>
          {movies.map((movie) =>
            comingSoon ? (
              <ComingSoonCard key={movie.id ?? movie.slug} movie={movie} />
            ) : (
              <MovieCard key={movie.id ?? movie.slug} movie={movie} />
            ),
          )}
        </div>
      )}
    </section>
  );
}
