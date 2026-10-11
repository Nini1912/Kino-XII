import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

import MovieCard from "./MovieCard";
import ComingSoonCard from "./ComingSoonCard";
import RecentlyViewedCard from "./RecentlyViewedCard";

export default function MovieSection({
  title,
  movies = [],
  comingSoon = false,
  recentlyViewed = false,
}) {
  const carouselRef = useRef(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const carousel = carouselRef.current;

    if (!carousel) return;

    function updateScrollState() {
      const maxScroll = carousel.scrollWidth - carousel.clientWidth;

      setCanScrollLeft(carousel.scrollLeft > 2);

      setCanScrollRight(maxScroll > 2 && carousel.scrollLeft < maxScroll - 2);
    }

    updateScrollState();

    carousel.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);

    return () => {
      carousel.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [movies, comingSoon, recentlyViewed]);

  function scroll(direction) {
    const carousel = carouselRef.current;

    if (!carousel) return;

    const firstCard = carousel.firstElementChild;

    if (!firstCard) return;

    const gap = parseFloat(getComputedStyle(carousel).columnGap) || 0;

    const distance = firstCard.getBoundingClientRect().width + gap;

    carousel.scrollBy({
      left: direction * distance,
      behavior: "smooth",
    });
  }

  const gridClassName = recentlyViewed
    ? "recently-viewed-grid"
    : comingSoon
      ? "coming-soon-grid"
      : "movie-grid";

  return (
    <section className="movie-section">
      <div className="section-header">
        <h2>{title}</h2>

        <div className="movie-section-actions">
          <div className="movie-section-arrows">
            <button
              type="button"
              onClick={() => scroll(-1)}
              disabled={!canScrollLeft}
              aria-label={`Previous ${title} movies`}
            >
              <ChevronLeft size={19} />
            </button>

            <button
              type="button"
              onClick={() => scroll(1)}
              disabled={!canScrollRight}
              aria-label={`Next ${title} movies`}
            >
              <ChevronRight size={19} />
            </button>
          </div>
          {!recentlyViewed && (
            <Link to="/sessions" className="see-all">
              See all
            </Link>
          )}
        </div>
      </div>

      {movies.length === 0 ? (
        <p className="empty-message">No movies available at the moment.</p>
      ) : (
        <div
          className={`movie-carousel-wrapper ${
            canScrollLeft ? "has-left-overflow" : ""
          } ${canScrollRight ? "has-right-overflow" : ""}`}
        >
          <div ref={carouselRef} className={gridClassName}>
            {movies.map((movie) => {
              const key = movie.id ?? movie.slug;

              if (recentlyViewed) {
                return <RecentlyViewedCard key={key} movie={movie} />;
              }

              if (comingSoon) {
                return <ComingSoonCard key={key} movie={movie} />;
              }

              return <MovieCard key={key} movie={movie} />;
            })}
          </div>
        </div>
      )}
    </section>
  );
}
