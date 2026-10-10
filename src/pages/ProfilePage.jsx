import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, ChevronDown } from "lucide-react";

import { profileApi } from "../api/profileApi";
import { useAuth } from "../hooks/useAuth";
import "../styles/profile.css";

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

function getTicketDate(ticket) {
  return (
    ticket?.session?.startsAt ??
    ticket?.session?.startTime ??
    ticket?.startsAt ??
    ticket?.dateTime ??
    null
  );
}

function formatSessionDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TicketCard({ ticket, onRefund }) {
  const movie = ticket.movie ?? ticket.session?.movie ?? {};
  const session = ticket.session ?? {};
  const venue = session.venue ?? ticket.venue ?? {};
  const date = getTicketDate(ticket);

  const movieTitle = movie.title ?? ticket.movieTitle ?? "Movie";
  const poster = movie.posterUrl ?? movie.poster ?? ticket.posterUrl;
  const orderCode = ticket.orderNumber ?? ticket.orderCode ?? ticket.id;
  const amount = ticket.totalPaid ?? ticket.totalPrice ?? ticket.total;
  const seats = asArray(ticket.seats);
  const isPast = date ? new Date(date).getTime() < Date.now() : false;

  return (
    <article className="profile-ticket-card">
      <div className="profile-ticket-main">
        {poster ? (
          <img
            className="profile-ticket-poster"
            src={poster}
            alt={movieTitle}
          />
        ) : (
          <div className="profile-ticket-poster profile-ticket-poster-empty">
            KINO XII
          </div>
        )}

        <div className="profile-ticket-content">
          <div className="profile-ticket-title-line">
            <h3>{movieTitle}</h3>
            {movie.ageRating && (
              <span className="profile-ticket-rating">{movie.ageRating}</span>
            )}
            {movie.duration && (
              <span className="profile-ticket-duration">
                {movie.duration} min
              </span>
            )}
          </div>

          <div className="profile-ticket-details">
            <div>
              <span className="profile-ticket-label">DATE</span>
              <strong>{formatSessionDate(date)}</strong>
            </div>
            <div>
              <span className="profile-ticket-label">VENUE</span>
              <strong>
                {venue.name ?? session.venueName ?? "—"}
                {session.hall?.name ? ` · ${session.hall.name}` : ""}
              </strong>
            </div>
            <div>
              <span className="profile-ticket-label">FORMAT</span>
              <strong>
                {session.format?.name ?? session.formatName ?? "—"}
              </strong>
            </div>
          </div>

          {seats.length > 0 && (
            <div className="profile-ticket-seats">
              <span>SEATS</span>
              {seats.map((seat, index) => (
                <span className="profile-seat-pill" key={seat.id ?? index}>
                  {typeof seat === "string"
                    ? seat
                    : (seat.label ?? `${seat.row ?? ""}${seat.number ?? ""}`)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="profile-ticket-order">
        <div className="profile-order-number">
          <span>ORDER</span>
          <strong>{orderCode ? `#${orderCode}` : "—"}</strong>
        </div>

        <div className="profile-ticket-total">
          <span>Total paid</span>
          <strong>{amount != null ? `₾${amount}` : "—"}</strong>
        </div>

        <button
          type="button"
          className="profile-refund-button"
          disabled={isPast || !onRefund}
          onClick={() => onRefund?.(ticket)}
          title={!onRefund ? "Refund integration is not available yet" : ""}
        >
          Refund
        </button>

        {ticket.refundableUntil && (
          <small>
            Refundable until {formatSessionDate(ticket.refundableUntil)}
          </small>
        )}
      </div>
    </article>
  );
}

export default function ProfilePage({ tickets = [], venues = [], onRefund }) {
  const { user, isAuthenticated, isInitializing, openLogin, refreshUser } =
    useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab =
    searchParams.get("tab") === "tickets" ? "tickets" : "information";

  const [ticketFilter, setTicketFilter] = useState("upcoming");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [values, setValues] = useState({
    fullName: "",
    mobileNumber: "",
    dateOfBirth: "",
    preferredVenueId: "",
  });

  useEffect(() => {
    if (!user) return;

    setValues({
      fullName: user.fullName ?? "",
      mobileNumber: user.mobileNumber ?? "",
      dateOfBirth: user.dateOfBirth
        ? String(user.dateOfBirth).slice(0, 10)
        : "",
      preferredVenueId: user.preferredVenue?.id
        ? String(user.preferredVenue.id)
        : "",
    });
  }, [user]);

  function changeTab(tab) {
    setSearchParams(tab === "tickets" ? { tab: "tickets" } : {});
    setError("");
    setSuccess("");
  }

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: [] }));
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError("");
    setSuccess("");
    setFieldErrors({});

    try {
      await profileApi.updateProfile({
        fullName: values.fullName.trim(),
        mobileNumber: values.mobileNumber,
        dateOfBirth: values.dateOfBirth,
        preferredVenueId: values.preferredVenueId,
      });

      const updatedUser = await refreshUser();
      setSuccess(
        updatedUser.profileComplete
          ? "Changes saved successfully."
          : "Changes saved. Complete all required fields to finish your profile.",
      );
    } catch (requestError) {
      const data = requestError.response?.data;
      if (requestError.response?.status === 422 && data?.errors) {
        setFieldErrors(data.errors);
      } else {
        setError(data?.message ?? "Unable to save changes.");
      }
    } finally {
      setSaving(false);
    }
  }

  const allTickets = useMemo(() => asArray(tickets), [tickets]);

  const upcomingTickets = allTickets.filter((ticket) => {
    const date = getTicketDate(ticket);
    return date && new Date(date).getTime() >= Date.now();
  });

  const pastTickets = allTickets.filter((ticket) => {
    const date = getTicketDate(ticket);
    return date && new Date(date).getTime() < Date.now();
  });

  const displayedTickets =
    ticketFilter === "upcoming" ? upcomingTickets : pastTickets;

  if (isInitializing) {
    return (
      <main className="profile-page">
        <div className="profile-container">Loading profile...</div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="profile-page">
        <div className="profile-container">
          <h1>My Profile</h1>
          <p>Please log in to view your profile.</p>
          <button className="profile-save-button" onClick={openLogin}>
            Log in
          </button>
        </div>
      </main>
    );
  }

  const renderErrors = (field) =>
    (fieldErrors[field] ?? []).map((message, index) => (
      <span className="profile-field-error" key={index}>
        {message}
      </span>
    ));

  return (
    <main className="profile-page">
      <div className="profile-container">
        <h1 className="profile-page-title">My Profile</h1>

        <div
          className="profile-tabs"
          role="tablist"
          aria-label="Profile sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "information"}
            className={`profile-tab ${
              activeTab === "information" ? "active" : ""
            }`}
            onClick={() => changeTab("information")}
          >
            Personal Information
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "tickets"}
            className={`profile-tab ${activeTab === "tickets" ? "active" : ""}`}
            onClick={() => changeTab("tickets")}
          >
            My Tickets
            {allTickets.length > 0 && (
              <span className="profile-ticket-count">{allTickets.length}</span>
            )}
          </button>
        </div>

        {activeTab === "information" ? (
          <section className="profile-info-panel">
            <form className="profile-form" onSubmit={handleSubmit} noValidate>
              <div className="profile-field">
                <label htmlFor="profile-fullName">Full Name</label>
                <input
                  id="profile-fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={values.fullName}
                  onChange={updateField}
                  placeholder="Enter full name"
                  disabled={saving}
                />
                {renderErrors("fullName")}
              </div>

              <div className="profile-field">
                <label htmlFor="profile-email">Email</label>
                <input
                  id="profile-email"
                  type="email"
                  value={user.email ?? ""}
                  readOnly
                />
                <span className="profile-field-hint">
                  Set at registration and cannot be changed
                </span>
              </div>

              <div className="profile-field">
                <label htmlFor="profile-mobileNumber">Mobile number</label>
                <input
                  id="profile-mobileNumber"
                  name="mobileNumber"
                  type="tel"
                  autoComplete="tel"
                  value={values.mobileNumber}
                  onChange={updateField}
                  placeholder="599 123 456"
                  disabled={saving}
                />
                {renderErrors("mobileNumber")}
              </div>

              <div className="profile-field">
                <label htmlFor="profile-dateOfBirth">Date of birth</label>
                <div className="profile-date-wrap">
                  <input
                    id="profile-dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={values.dateOfBirth}
                    onChange={updateField}
                    disabled={saving}
                  />
                  <CalendarDays size={17} aria-hidden="true" />
                </div>
                {renderErrors("dateOfBirth")}
              </div>

              <div className="profile-field">
                <label htmlFor="profile-venue">
                  Preferred Venue <span>(Optional)</span>
                </label>
                <div className="profile-select-wrap">
                  <select
                    id="profile-venue"
                    name="preferredVenueId"
                    value={values.preferredVenueId}
                    onChange={updateField}
                    disabled={saving}
                  >
                    <option value="">Select venue</option>
                    {user.preferredVenue &&
                      !venues.some(
                        (venue) =>
                          String(venue.id) === String(user.preferredVenue.id),
                      ) && (
                        <option value={user.preferredVenue.id}>
                          {user.preferredVenue.name}
                        </option>
                      )}
                    {venues.map((venue) => (
                      <option key={venue.id} value={venue.id}>
                        {venue.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={17} aria-hidden="true" />
                </div>
                {renderErrors("preferredVenueId")}
              </div>

              {error && (
                <p className="profile-message profile-error" role="alert">
                  {error}
                </p>
              )}
              {success && (
                <p className="profile-message profile-success" role="status">
                  {success}
                </p>
              )}

              <button
                type="submit"
                className="profile-save-button"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </form>
          </section>
        ) : (
          <section className="profile-tickets-panel">
            <div className="profile-ticket-filters">
              <button
                type="button"
                className={ticketFilter === "upcoming" ? "active" : ""}
                onClick={() => setTicketFilter("upcoming")}
              >
                Upcoming <span>{upcomingTickets.length}</span>
              </button>
              <button
                type="button"
                className={ticketFilter === "past" ? "active" : ""}
                onClick={() => setTicketFilter("past")}
              >
                Past <span>{pastTickets.length}</span>
              </button>
            </div>

            <div className="profile-ticket-list">
              {displayedTickets.length > 0 ? (
                displayedTickets.map((ticket, index) => (
                  <TicketCard
                    key={ticket.id ?? index}
                    ticket={ticket}
                    onRefund={onRefund}
                  />
                ))
              ) : (
                <div className="profile-tickets-empty">
                  No {ticketFilter} tickets yet.
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
