import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { sessionsApi } from "../api/sessionsApi";
import "../styles/sessions.css";

const FILTER_KEYS = ["venues", "formats", "languages", "bands"];

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDates() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      value: localDateString(date),
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      number: date.getDate(),
    };
  });
}

function getValues(searchParams, key) {
  return searchParams.getAll(`${key}[]`);
}

function SessionCard({ session, onSelect }) {
  const soldOut = session.isSoldOut;
  const seats = Number(session.seatsLeft ?? 0);
  const lowSeats = seats > 0 && seats <= 5;

  return (
    <button
      type="button"
      className={`sessions-showtime-card ${soldOut ? "is-sold-out" : ""}`}
      disabled={soldOut}
      onClick={() => onSelect(session.id)}
    >
      <div className="sessions-showtime-top">
        <strong>{session.time}</strong>
        <span className="sessions-format-badge">{session.format?.name}</span>
      </div>

      <div className="sessions-showtime-middle">
        <span>{session.language?.name ?? "—"}</span>

        {soldOut ? (
          <span className="sessions-sold-out-label">Sold out</span>
        ) : (
          <span className={`sessions-seats-count ${lowSeats ? "low" : ""}`}>
            <Zap size={12} fill="currentColor" />
            {seats} left
          </span>
        )}
      </div>

      <div className="sessions-showtime-bottom">
        <span>
          {session.venue?.name ?? "—"}
          {session.hall?.name ? ` · Hall ${session.hall.name}` : ""}
        </span>
        <strong>₾{session.price}</strong>
      </div>
    </button>
  );
}

function MovieSessionsRow({ group, onSelect }) {
  const { movie, sessions } = group;

  return (
    <article className="sessions-movie-row">
      <div className="sessions-movie-heading">
        {movie?.posterUrl ? (
          <img src={movie.posterUrl} alt="" />
        ) : (
          <div className="sessions-poster-placeholder">KINO XII</div>
        )}

        <div>
          <div className="sessions-movie-title-line">
            <h2>{movie?.title ?? "Untitled movie"}</h2>
            {movie?.ageRating?.code && (
              <span className="sessions-age-badge">{movie.ageRating.code}</span>
            )}
          </div>
          <p>{movie?.runtimeMinutes ?? "—"} min</p>
        </div>
      </div>

      <div className="sessions-showtimes-scroll">
        <div className="sessions-showtimes">
          {(sessions ?? []).map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </article>
  );
}

function CheckboxGroup({
  title,
  items,
  selected,
  onToggle,
  getValue,
  getLabel,
}) {
  return (
    <section className="sessions-filter-group">
      <h3>{title}</h3>
      <div className="sessions-filter-items">
        {items.map((item) => {
          const value = getValue(item);
          const checked = selected.includes(value);

          return (
            <label className="sessions-checkbox-label" key={value}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(value)}
              />
              <span className="sessions-checkbox-custom" />
              <span>{getLabel(item)}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const date = searchParams.get("date") || localDateString(new Date());
  const sort = searchParams.get("sort") || "time_asc";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const search = searchParams.get("search") || "";

  const venues = getValues(searchParams, "venues");
  const formats = getValues(searchParams, "formats");
  const languages = getValues(searchParams, "languages");
  const bands = getValues(searchParams, "bands");

  const dates = useMemo(getDates, []);

  const optionsQuery = useQuery({
    queryKey: ["filter-options"],
    queryFn: sessionsApi.getFilterOptions,
    staleTime: 1000 * 60 * 60,
  });

  const options = optionsQuery.data;

  const availableFormats = useMemo(() => {
    if (!options) return [];

    if (venues.length === 0) {
      return options.formats ?? [];
    }

    const selectedVenues = (options.venues ?? []).filter((venue) =>
      venues.includes(venue.slug),
    );

    const allowed = new Set(
      selectedVenues.flatMap((venue) =>
        (venue.formats ?? []).map((format) => format.slug),
      ),
    );

    return (options.formats ?? []).filter((format) => allowed.has(format.slug));
  }, [options, venues.join("|")]);

  useEffect(() => {
    if (!options || venues.length === 0) return;

    const allowed = new Set(availableFormats.map((item) => item.slug));
    const validFormats = formats.filter((value) => allowed.has(value));

    if (validFormats.length !== formats.length) {
      const next = new URLSearchParams(searchParams);
      next.delete("formats[]");
      validFormats.forEach((value) => next.append("formats[]", value));
      next.set("page", "1");
      setSearchParams(next, { replace: true });
    }
  }, [options, availableFormats, searchParams, setSearchParams]);

  const queryParams = {
    date,
    sort,
    page,
    search,
    venues,
    formats,
    languages,
    bands,
  };

  const sessionsQuery = useQuery({
    queryKey: ["sessions", searchParams.toString()],
    queryFn: () => sessionsApi.getSessions(queryParams),
    placeholderData: (previous) => previous,
  });

  const groups = sessionsQuery.data?.data ?? [];
  const meta = sessionsQuery.data?.meta ?? {};

  const activeFilterCount = FILTER_KEYS.reduce(
    (total, key) => total + (getValues(searchParams, key).length > 0 ? 1 : 0),
    0,
  );

  function updateParams(updater) {
    const next = new URLSearchParams(searchParams);
    updater(next);
    next.set("page", "1");
    setSearchParams(next);
  }

  function toggleFilter(key, value) {
    updateParams((next) => {
      const name = `${key}[]`;
      const selected = next.getAll(name);

      const updated = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];

      next.delete(name);
      updated.forEach((item) => next.append(name, item));
    });
  }

  function toggleVenue(value) {
    updateParams((next) => {
      const current = next.getAll("venues[]");
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      next.delete("venues[]");
      updated.forEach((item) => next.append("venues[]", item));

      if (options && updated.length > 0) {
        const allowed = new Set(
          (options.venues ?? [])
            .filter((venue) => updated.includes(venue.slug))
            .flatMap((venue) =>
              (venue.formats ?? []).map((format) => format.slug),
            ),
        );

        const valid = next
          .getAll("formats[]")
          .filter((format) => allowed.has(format));

        next.delete("formats[]");
        valid.forEach((format) => next.append("formats[]", format));
      }
    });
  }

  function clearFilters() {
    updateParams((next) => {
      FILTER_KEYS.forEach((key) => next.delete(`${key}[]`));
    });
  }

  function changePage(nextPage) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectSession(id) {
    navigate(`/sessions/${id}`);
  }

  const lastPage = Number(meta.lastPage) || 1;
  const currentPage = Number(meta.currentPage) || page;

  return (
    <main className="sessions-page">
      <header className="sessions-page-header">
        <h1>Sessions</h1>
        <p>Browse showtimes across all venues</p>
      </header>

      <div className="sessions-page-layout">
        <aside className="sessions-filters-sidebar">
          <h2>Filters</h2>

          {optionsQuery.isPending && <p>Loading filters...</p>}
          {optionsQuery.isError && <p>Unable to load filters.</p>}

          {options && (
            <>
              <CheckboxGroup
                title="VENUE"
                items={options.venues ?? []}
                selected={venues}
                onToggle={toggleVenue}
                getValue={(item) => item.slug}
                getLabel={(item) => `${item.name} · ${item.city}`}
              />

              <section className="sessions-filter-group">
                <h3>DATE</h3>
                <div className="sessions-date-scroll">
                  <div className="sessions-date-list">
                    {dates.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={`sessions-date-button ${
                          date === item.value ? "active" : ""
                        }`}
                        onClick={() =>
                          updateParams((next) => next.set("date", item.value))
                        }
                      >
                        <span>{item.day}</span>
                        <strong>{item.number}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <CheckboxGroup
                title="FORMAT"
                items={availableFormats}
                selected={formats}
                onToggle={(value) => toggleFilter("formats", value)}
                getValue={(item) => item.slug}
                getLabel={(item) => item.name}
              />

              <CheckboxGroup
                title="LANGUAGE"
                items={options.languages ?? []}
                selected={languages}
                onToggle={(value) => toggleFilter("languages", value)}
                getValue={(item) => item.slug}
                getLabel={(item) => item.name}
              />

              <CheckboxGroup
                title="TIME OF DAY"
                items={options.timeBands ?? []}
                selected={bands}
                onToggle={(value) => toggleFilter("bands", value)}
                getValue={(item) => item.id}
                getLabel={(item) => item.label}
              />

              <div className="sessions-filter-footer">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    className="sessions-clear-filters"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                )}
                <p>{activeFilterCount} filters active</p>
              </div>
            </>
          )}
        </aside>

        <section className="sessions-results">
          <div className="sessions-results-toolbar">
            <strong>Showing {meta.totalSessions ?? 0} sessions</strong>

            <label className="sessions-sort">
              <span>Sort:</span>
              <select
                value={sort}
                onChange={(event) =>
                  updateParams((next) => next.set("sort", event.target.value))
                }
              >
                {(options?.sorts ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {sessionsQuery.isPending ? (
            <div className="sessions-state">Loading sessions...</div>
          ) : sessionsQuery.isError ? (
            <div className="sessions-state">
              <p>Unable to load sessions.</p>
              <button type="button" onClick={() => sessionsQuery.refetch()}>
                Retry
              </button>
            </div>
          ) : groups.length === 0 ? (
            <div className="sessions-state">
              No sessions match your filters.
            </div>
          ) : (
            <>
              <div className="sessions-movie-list">
                {groups.map((group) => (
                  <MovieSessionsRow
                    key={group.movie?.id}
                    group={group}
                    onSelect={selectSession}
                  />
                ))}
              </div>

              {lastPage > 1 && (
                <nav
                  className="sessions-pagination"
                  aria-label="Sessions pages"
                >
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => changePage(currentPage - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={17} />
                  </button>

                  {Array.from(
                    { length: lastPage },
                    (_, index) => index + 1,
                  ).map((number) => (
                    <button
                      key={number}
                      type="button"
                      className={number === currentPage ? "active" : ""}
                      onClick={() => changePage(number)}
                      aria-current={number === currentPage ? "page" : undefined}
                    >
                      {number}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={currentPage >= lastPage}
                    onClick={() => changePage(currentPage + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRight size={17} />
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
