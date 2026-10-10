import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsApi } from "../../api/ticketsApi";

const filters = ["upcoming", "past"];

function money(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₾${amount.toFixed(2)}` : "—";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TicketCard({ order, onRefund, refunding }) {
  const session = order.session ?? {};
  const movie = session.movie ?? {};
  const venue = session.venue ?? {};
  const hall = session.hall ?? {};
  const format = session.format ?? {};
  const language = session.language ?? {};

  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

  const startsAt = Date.parse(session.startsAt);

  const outsideRefundWindow =
    Number.isFinite(startsAt) && startsAt - Date.now() > TWO_HOURS_MS;

  const canRefund =
    order.status === "paid" &&
    order.isUpcoming === true &&
    order.isRefundable === true &&
    outsideRefundWindow;

  const ageRating =
    typeof movie.ageRating === "object"
      ? movie.ageRating?.code
      : movie.ageRating;

  return (
    <article className="profile-ticket-card">
      <div className="profile-ticket-main">
        {movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={movie.title ?? "Movie poster"}
            className="profile-ticket-poster"
          />
        ) : (
          <div className="profile-ticket-poster profile-ticket-poster-empty">
            KINO XII
          </div>
        )}

        <div className="profile-ticket-content">
          <div className="profile-ticket-title-line">
            <h3>{movie.title ?? "Movie"}</h3>

            {ageRating && (
              <span className="profile-ticket-rating">{ageRating}</span>
            )}

            {movie.runtimeMinutes != null && (
              <span className="profile-ticket-duration">
                {movie.runtimeMinutes} min
              </span>
            )}
          </div>

          <div className="profile-ticket-details">
            <div>
              <span className="profile-ticket-label">DATE</span>
              <strong>{formatDate(session.startsAt)}</strong>
            </div>

            <div>
              <span className="profile-ticket-label">VENUE</span>
              <strong>
                {venue.name ?? "—"}
                {hall.name ? ` · Hall ${hall.name}` : ""}
              </strong>
            </div>

            <div>
              <span className="profile-ticket-label">FORMAT</span>
              <strong>
                {format.name ?? "—"}
                {language.name ? ` · ${language.name}` : ""}
              </strong>
            </div>
          </div>

          <div className="profile-ticket-seats">
            <span>SEATS</span>
            {(order.tickets ?? []).map((ticket) => (
              <span className="profile-seat-pill" key={ticket.id}>
                {ticket.seatCode}
                {ticket.ticketType?.name ? ` · ${ticket.ticketType.name}` : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="profile-ticket-order">
        <div className="profile-order-number">
          <span>ORDER</span>
          <strong>#{order.reference}</strong>
        </div>

        <div className="profile-ticket-total">
          <span>Total paid</span>
          <strong>{money(order.totalPrice)}</strong>
        </div>

        <button
          type="button"
          className="profile-refund-button"
          disabled={!canRefund || refunding}
          onClick={() => onRefund(order)}
        >
          {refunding ? "Processing..." : "Refund"}
        </button>

        <small>
          {order.status === "refunded"
            ? "Refunded"
            : order.status === "paid" &&
                order.isUpcoming === true &&
                Number.isFinite(startsAt) &&
                !outsideRefundWindow
              ? "Refunds close 2 hours before the session"
              : canRefund
                ? "Refund available"
                : "Refund unavailable"}
        </small>
      </div>
    </article>
  );
}

export default function MyTickets() {
  const [filter, setFilter] = useState("upcoming");
  const [refundTarget, setRefundTarget] = useState(null);
  const [refundError, setRefundError] = useState("");

  const queryClient = useQueryClient();

  const ticketsQuery = useQuery({
    queryKey: ["my-tickets", filter],
    queryFn: () => ticketsApi.getTickets(filter),
  });

  const refundMutation = useMutation({
    mutationFn: (reference) => ticketsApi.refundOrder(reference),

    onSuccess: async () => {
      setRefundError("");
      setRefundTarget(null);

      await queryClient.invalidateQueries({
        queryKey: ["my-tickets"],
      });
    },

    onError: (error) => {
      const data = error.response?.data;
      const validationMessage = data?.errors
        ? Object.values(data.errors).flat()[0]
        : null;

      setRefundError(
        validationMessage ?? data?.message ?? "Unable to refund this order.",
      );
    },
  });

  const orders = Array.isArray(ticketsQuery.data) ? ticketsQuery.data : [];

  async function confirmRefund() {
    if (!refundTarget || refundMutation.isPending) return;
    await refundMutation.mutateAsync(refundTarget.reference).catch(() => {});
  }

  return (
    <section className="profile-tickets-panel">
      <div className="profile-ticket-filters">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            className={filter === item ? "active" : ""}
            onClick={() => {
              setFilter(item);
              setRefundError("");
            }}
          >
            {item === "upcoming" ? "Upcoming" : "Past"}
          </button>
        ))}
      </div>

      {refundError && (
        <p className="profile-message profile-error" role="alert">
          {refundError}
        </p>
      )}

      {ticketsQuery.isPending ? (
        <div className="profile-tickets-empty">Loading tickets...</div>
      ) : ticketsQuery.isError ? (
        <div className="profile-tickets-empty">
          <p>Unable to load your tickets.</p>
          <button type="button" onClick={() => ticketsQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="profile-tickets-empty">No {filter} tickets yet.</div>
      ) : (
        <div className="profile-ticket-list">
          {orders.map((order) => (
            <TicketCard
              key={order.id}
              order={order}
              onRefund={setRefundTarget}
              refunding={
                refundMutation.isPending && refundTarget?.id === order.id
              }
            />
          ))}
        </div>
      )}

      {refundTarget && (
        <div
          className="ticket-refund-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !refundMutation.isPending
            ) {
              setRefundTarget(null);
              setRefundError("");
            }
          }}
        >
          <section
            className="ticket-refund-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="refund-title"
            aria-describedby="refund-description"
          >
            <h2 id="refund-title">Refund this order?</h2>

            <p id="refund-description">
              Order <strong>#{refundTarget.reference}</strong> will be refunded.
              This action cannot be undone.
            </p>

            {refundError && (
              <p className="profile-message profile-error" role="alert">
                {refundError}
              </p>
            )}

            <div className="ticket-refund-actions">
              <button
                type="button"
                className="ticket-refund-cancel"
                disabled={refundMutation.isPending}
                onClick={() => {
                  setRefundTarget(null);
                  setRefundError("");
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="ticket-refund-confirm"
                disabled={refundMutation.isPending}
                onClick={confirmRefund}
              >
                {refundMutation.isPending ? "Refunding..." : "Confirm refund"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
