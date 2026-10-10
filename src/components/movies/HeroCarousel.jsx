import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ticket, Clock3, ChevronLeft, ChevronRight } from "lucide-react";

export default function HeroCarousel({ movies = [] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (movies.length <= 1) return;

    const interval = setInterval(() => {
      setActive((current) => (current + 1) % movies.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [movies.length]);

  if (!movies.length) return null;

  const movie = movies[active % movies.length];

  const movieId = movie.id ?? movie.slug;

  const backdrop =
    movie.backdrop_url ??
    movie.backdropUrl ??
    movie.backdrop ??
    movie.poster_url ??
    movie.posterUrl ??
    movie.poster;

  const duration = movie.duration_minutes ?? movie.duration;

  const ageRating =
    typeof movie.age_rating === "object"
      ? (movie.age_rating?.label ?? movie.age_rating?.name)
      : movie.age_rating;

  const formats = Array.isArray(movie.formats) ? movie.formats : [];

  const description = movie.synopsis ?? movie.description ?? "";

  const premiereLabel =
    movie.premiere_label ?? movie.premiereLabel ?? "FEATURED MOVIE";

  function nextMovie() {
    setActive((current) => (current + 1) % movies.length);
  }

  function previousMovie() {
    setActive((current) => (current - 1 + movies.length) % movies.length);
  }

  return (
    <section
      className="hero"
      aria-label="Featured movies"
      style={{
        backgroundImage: backdrop ? `url("${backdrop}")` : "none",
      }}
    >
      <div className="hero-overlay" />

      <div className="hero-content">
        <span className="hero-eyebrow">{premiereLabel}</span>

        <h1>{movie.title}</h1>

        <div className="hero-meta">
          {ageRating && <span className="hero-age">{ageRating}</span>}

          {duration && (
            <span>
              <Clock3 size={15} />
              {duration} Min
            </span>
          )}

          {formats.map((format, index) => {
            const name =
              typeof format === "string"
                ? format
                : (format.name ?? format.label);

            return <span key={format.id ?? name ?? index}>{name}</span>;
          })}
        </div>

        {description && <p className="hero-description">{description}</p>}

        <div className="hero-buttons">
          <Link
            to={`/movies/${movieId}#movie-sessions`}
            className="btn btn-primary"
          >
            <Ticket size={17} fill="currentColor" />
            Buy tickets
          </Link>

          <Link to={`/movies/${movieId}`} className="btn btn-outline">
            All sessions
          </Link>
        </div>
      </div>

      {movies.length > 1 && (
        <div className="hero-controls">
          <div className="hero-progress">
            {movies.map((featuredMovie, index) => (
              <button
                key={featuredMovie.id ?? featuredMovie.slug ?? index}
                type="button"
                className={index === active ? "active" : ""}
                onClick={() => setActive(index)}
                aria-label={`Show featured movie ${index + 1}`}
                aria-current={index === active ? "true" : undefined}
              />
            ))}
          </div>

          <div className="hero-arrows">
            <button
              type="button"
              onClick={previousMovie}
              aria-label="Previous movie"
            >
              <ChevronLeft size={20} />
            </button>

            <button type="button" onClick={nextMovie} aria-label="Next movie">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
