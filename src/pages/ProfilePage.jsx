import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronDown } from "lucide-react";

import { profileApi } from "../api/profileApi";
import { ticketsApi } from "../api/ticketsApi";
import { useAuth } from "../hooks/useAuth";
import MyTickets from "../components/profile/MyTickets";

import "../styles/profile.css";

function countUpcomingTickets(orders) {
  if (!Array.isArray(orders)) return 0;

  return orders.reduce((total, order) => {
    if (order.status === "refunded") return total;

    const tickets = Array.isArray(order.tickets) ? order.tickets : [];

    return total + tickets.length;
  }, 0);
}

export default function ProfilePage({ venues = [] }) {
  const { user, isAuthenticated, isInitializing, openLogin, refreshUser } =
    useAuth();

  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab =
    searchParams.get("tab") === "tickets" ? "tickets" : "information";

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

  // Fetch upcoming tickets for the red badge.
  // This uses the same query key as MyTickets.jsx.

  const upcomingTicketsQuery = useQuery({
    queryKey: ["my-tickets", "upcoming"],
    queryFn: () => ticketsApi.getTickets("upcoming"),
    enabled: isAuthenticated && !isInitializing,
  });

  const upcomingTicketCount = countUpcomingTickets(upcomingTicketsQuery.data);

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

    setValues((current) => ({
      ...current,
      [name]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [name]: [],
    }));

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

  function renderErrors(field) {
    const messages = fieldErrors[field];

    if (!messages) return null;

    const errorList = Array.isArray(messages) ? messages : [messages];

    return errorList.map((message, index) => (
      <span className="profile-field-error" key={`${field}-${index}`}>
        {message}
      </span>
    ));
  }

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

          <button
            type="button"
            className="profile-save-button"
            onClick={openLogin}
          >
            Log in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <div className="profile-container">
        <h1 className="profile-page-title">My Profile</h1>

        {/* PROFILE TABS */}

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
            <span>My Tickets</span>

            {upcomingTicketsQuery.isSuccess && upcomingTicketCount > 0 && (
              <span className="profile-ticket-count">
                {upcomingTicketCount}
              </span>
            )}
          </button>
        </div>

        {/* PERSONAL INFORMATION */}

        {activeTab === "information" ? (
          <section className="profile-info-panel">
            <form className="profile-form" onSubmit={handleSubmit} noValidate>
              {/* FULL NAME */}

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

              {/* EMAIL */}

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

              {/* MOBILE NUMBER */}

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

              {/* DATE OF BIRTH */}

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

              {/* PREFERRED VENUE */}

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

              {/* ERROR MESSAGE */}

              {error && (
                <p className="profile-message profile-error" role="alert">
                  {error}
                </p>
              )}

              {/* SUCCESS MESSAGE */}

              {success && (
                <p className="profile-message profile-success" role="status">
                  {success}
                </p>
              )}

              {/* SAVE BUTTON */}

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
          /* MY TICKETS */
          <MyTickets />
        )}
      </div>
    </main>
  );
}
