import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { bookingApi } from "../../api/bookingApi";
import { useAuth } from "../../hooks/useAuth";
import {
  allSeats,
  getMaxSeats,
  getTicketTypes,
  normalizeSections,
} from "./seatLayout.jsx";

const holdKey = (id) => `kino_hold_${id}`;
const emptyForm = {
  fullName: "",
  email: "",
  mobileNumber: "",
  cardNumber: "",
  expiry: "",
  cvv: "",
};
const pad = (n) => String(n).padStart(2, "0");
const formatMoney = (n) =>
  `₾ ${Number(n ?? 0)
    .toFixed(2)
    .replace(/\.00$/, "")}`;
const getError = (err) =>
  err?.response?.data?.message ?? err?.message ?? "Something went wrong.";

function SeatGrid({ sections, selected, onToggle }) {
  const widest = Math.max(
    1,
    ...sections.flatMap((section) =>
      section.rows.map((row) =>
        row.seats.reduce((n, seat) => n + 1 + (seat.aisleAfter ? 0.5 : 0), 0),
      ),
    ),
  );
  return (
    <div className="kb-seat-map" style={{ "--kb-columns": widest }}>
      <div className="kb-screen">SCREEN</div>
      {sections.map((section, index) => (
        <section className="kb-section" key={`${section.name}-${index}`}>
          <h3>{section.name}</h3>
          {section.rows.map((row, rowIndex) => (
            <div className="kb-row" key={`${row.label}-${rowIndex}`}>
              <span className="kb-row-name">{row.label}</span>
              <div className="kb-row-cells">
                {row.seats.map((seat, seatIndex) => {
                  const picked = selected.some((s) => s.id === seat.id);
                  const available =
                    picked ||
                    seat.status === "available" ||
                    (seat.status === "held" && seat.isMine);
                  return (
                    <div
                      className="kb-seat-position"
                      key={seat.id ?? seat.key ?? seatIndex}
                    >
                      {seat.gap ? (
                        <span className="kb-gap" />
                      ) : (
                        <button
                          type="button"
                          disabled={!available}
                          onClick={() => onToggle(seat)}
                          className={`kb-seat ${picked ? "kb-picked" : ""} ${!available ? `kb-${seat.status}` : ""}`}
                          aria-label={`${seat.code}, ${picked ? "selected" : seat.status}`}
                          aria-pressed={picked}
                        >
                          {seat.label}
                        </button>
                      )}
                      {seat.aisleAfter && <span className="kb-aisle" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ))}
      <div className="kb-legend">
        <span>
          <i className="kb-key kb-key-available" />
          Available
        </span>
        <span>
          <i className="kb-key kb-key-selected" />
          Selected
        </span>
        <span>
          <i className="kb-key kb-key-sold" />
          Sold
        </span>
        <span>
          <i className="kb-key kb-key-held" />
          Held by another user
        </span>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, error, ...props }) {
  return (
    <label className="kb-field">
      <span>{label}</span>
      <input name={name} value={value} onChange={onChange} {...props} />
      {error && (
        <small className="kb-field-error">
          {Array.isArray(error) ? error.join(" ") : error}
        </small>
      )}
    </label>
  );
}

export default function BookingModal({ sessionId, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, openLogin } = useAuth();
  const [selected, setSelected] = useState([]);
  const [step, setStep] = useState("seats");
  const [hold, setHold] = useState(null);
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const closingRef = useRef(false);
  const holdRef = useRef(null);
  const expiryHandledRef = useRef(false);

  const sessionQuery = useQuery({
    queryKey: ["booking-session", sessionId],
    queryFn: () => bookingApi.session(sessionId),
  });
  const seatsQuery = useQuery({
    queryKey: ["booking-seats", sessionId],
    queryFn: () => bookingApi.seats(sessionId),
    refetchOnWindowFocus: true,
  });
  const optionsQuery = useQuery({
    queryKey: ["filter-options"],
    queryFn: bookingApi.options,
    staleTime: 3600000,
  });
  const session = sessionQuery.data;
  const sections = useMemo(
    () => normalizeSections(seatsQuery.data),
    [seatsQuery.data],
  );
  const seats = useMemo(() => allSeats(sections), [sections]);
  const types = useMemo(
    () => getTicketTypes(optionsQuery.data, session?.movie),
    [optionsQuery.data, session?.movie],
  );
  const maxSeats = getMaxSeats(optionsQuery.data);
  const validTypes =
    types.length > 0 && types.some((type) => type.slug === "adult");
  const basePrice = Number(session?.price ?? 0);
  const estimated = selected.reduce(
    (sum, seat) =>
      sum +
      basePrice * (types.find((t) => t.slug === seat.ticketType)?.ratio ?? 1),
    0,
  );
  const subtotal = hold?.subtotal ?? estimated;
  const hasError =
    sessionQuery.isError || seatsQuery.isError || optionsQuery.isError;
  const isLoading =
    !hasError &&
    (sessionQuery.isPending || seatsQuery.isPending || optionsQuery.isPending);
  const loadingError = [sessionQuery, seatsQuery, optionsQuery]
    .filter((query) => query.isError)
    .map(
      (query) =>
        query.error?.response?.data?.message ||
        query.error?.message ||
        "Request failed",
    )
    .join(" · ");
  const sessionStarted = Boolean(
    session?.startsAt && Date.parse(session.startsAt) <= Date.now(),
  );

  useEffect(() => {
    holdRef.current = hold;
  }, [hold]);
  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName || user.fullName || "",
      email: prev.email || user.email || "",
      mobileNumber: prev.mobileNumber || user.mobileNumber || "",
    }));
  }, [user]);

  const resetExpired = useCallback(async () => {
    if (expiryHandledRef.current) return;
    expiryHandledRef.current = true;
    sessionStorage.removeItem(holdKey(sessionId));
    setHold(null);
    setSelected([]);
    setStep("seats");
    setError("Your hold time expired. Please re-select your seats.");
    await queryClient.invalidateQueries({
      queryKey: ["booking-seats", sessionId],
    });
  }, [queryClient, sessionId]);

  useEffect(() => {
    const stored = sessionStorage.getItem(holdKey(sessionId));
    if (!stored || !isAuthenticated) return;
    let cancelled = false;
    bookingApi
      .getHold(stored)
      .then((saved) => {
        if (cancelled) return;
        if (!saved.isLive || Date.parse(saved.expiresAt) <= Date.now()) {
          resetExpired();
          return;
        }
        expiryHandledRef.current = false;
        setHold(saved);
        setSelected(
          (saved.seats ?? []).map((seat) => ({
            id: seat.seatId,
            code: seat.code,
            ticketType: seat.ticketType?.slug ?? "adult",
          })),
        );
        setStep("checkout");
      })
      .catch(() => {
        if (!cancelled) sessionStorage.removeItem(holdKey(sessionId));
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, isAuthenticated, resetExpired]);

  useEffect(() => {
    if (!hold?.expiresAt || step === "success") return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((Date.parse(hold.expiresAt) - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);
      if (remaining === 0) resetExpired();
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [hold?.expiresAt, step, resetExpired]);

  const close = async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    const live = holdRef.current;
    sessionStorage.removeItem(holdKey(sessionId));
    if (live && step !== "success") {
      try {
        await bookingApi.releaseHold(live.holdId);
      } catch (err) {
        console.warn("Hold release failed", err);
      }
    }
    onClose();
  };

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && !busy) close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (hold || !seatsQuery.data) return;
    const availableIds = new Set(
      seats
        .filter(
          (seat) =>
            seat.status === "available" ||
            (seat.status === "held" && seat.isMine),
        )
        .map((seat) => seat.id),
    );
    setSelected((prev) => prev.filter((seat) => availableIds.has(seat.id)));
  }, [seats, seatsQuery.data, hold]);

  function toggleSeat(seat) {
    if (sessionStarted) {
      setError("That session has already started. Choose another showtime.");
      return;
    }
    if (hold) {
      setError(
        "Seats are already held. Continue to checkout or close this booking to start again.",
      );
      return;
    }
    setError("");
    setSelected((prev) =>
      prev.some((s) => s.id === seat.id)
        ? prev.filter((s) => s.id !== seat.id)
        : prev.length >= maxSeats
          ? prev
          : [...prev, { id: seat.id, code: seat.code, ticketType: "adult" }],
    );
  }

  function changeTicketType(id, ticketType) {
    setSelected((prev) =>
      prev.map((seat) => (seat.id === id ? { ...seat, ticketType } : seat)),
    );
  }

  async function handleConflict(err) {
    const contested = err.response?.data?.contested ?? [];
    setSelected((prev) =>
      prev.filter((seat) => !contested.includes(seat.code)),
    );
    setHold(null);
    setStep("seats");
    sessionStorage.removeItem(holdKey(sessionId));
    setError(
      contested.length
        ? `These seats were just taken: ${contested.join(", ")}. Please choose other seats.`
        : getError(err),
    );
    await queryClient.invalidateQueries({
      queryKey: ["booking-seats", sessionId],
    });
  }

  async function proceed() {
    setError("");
    if (!isAuthenticated) {
      openLogin();
      setError("Log in to continue booking.");
      return;
    }
    if (!user?.profileComplete) {
      setError("Complete your profile before booking.");
      return;
    }
    if (sessionStarted) {
      setError("That session has already started. Choose another showtime.");
      return;
    }
    if (!selected.length || !validTypes) return;
    setBusy(true);
    try {
      const result = await bookingApi.createHold(sessionId, selected);
      expiryHandledRef.current = false;
      setHold(result);
      sessionStorage.setItem(holdKey(sessionId), result.holdId);
      setStep("checkout");
    } catch (err) {
      if (err.response?.status === 409) await handleConflict(err);
      else {
        setError(getError(err));
        if (err.response?.status === 401) openLogin();
      }
    } finally {
      setBusy(false);
    }
  }

  async function updateHold() {
    if (!hold) return;
    setStep("seats");
    setError("");
  }

  async function replaceHold() {
    setError("");
    if (sessionStarted) {
      setError("That session has already started. Choose another showtime.");
      return;
    }
    if (!selected.length) return;
    setBusy(true);
    try {
      const result = await bookingApi.createHold(sessionId, selected);
      expiryHandledRef.current = false;
      setHold(result);
      sessionStorage.setItem(holdKey(sessionId), result.holdId);
      setStep("checkout");
    } catch (err) {
      if (err.response?.status === 409) await handleConflict(err);
      else setError(getError(err));
    } finally {
      setBusy(false);
    }
  }

  function changeForm(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function pay(event) {
    event.preventDefault();
    if (!hold || busy) return;
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const result = await bookingApi.pay({ holdId: hold.holdId, ...form });
      sessionStorage.removeItem(holdKey(sessionId));
      setOrder(result);
      setHold(null);
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["booking-seats", sessionId] });
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) await handleConflict(err);
      else if (
        status === 422 &&
        !err.response?.data?.errors &&
        /hold|expired/i.test(getError(err))
      )
        await resetExpired();
      else {
        setError(getError(err));
        setFieldErrors(err.response?.data?.errors ?? {});
        if (status === 401) openLogin();
      }
    } finally {
      setBusy(false);
    }
  }

  const ticketSummary = (tickets) => {
    const counts = tickets.reduce((acc, item) => {
      const key =
        item.ticketType?.name ??
        item.ticketType?.slug ??
        item.ticketType ??
        "Adult";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, count]) => `${count} × ${name}`)
      .join(", ");
  };
  const heading = order?.session ?? session;
  const canCheckout = Boolean(hold && secondsLeft > 0);

  return (
    <div
      className="kb-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) close();
      }}
    >
      <div
        className={`kb-dialog ${step === "success" ? "kb-dialog-success" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Book cinema tickets"
      >
        <button
          className="kb-close"
          type="button"
          onClick={close}
          disabled={busy}
          aria-label="Close booking"
        >
          <X size={22} />
        </button>
        {step === "success" && order ? (
          <div className="kb-confirmation">
            <span className="kb-success-icon">
              <Check size={32} />
            </span>
            <h1>Booking confirmed!</h1>
            <p>Your tickets are ready. Your order has been completed.</p>
            <span className="kb-order-reference">ORDER #{order.reference}</span>
            <div className="kb-confirm-card">
              <div className="kb-confirm-movie">
                {heading?.movie?.posterUrl && (
                  <img src={heading.movie.posterUrl} alt="" />
                )}
                <div>
                  <strong>{heading?.movie?.title}</strong>
                  <small>
                    {heading?.venue?.name} · Hall {heading?.hall?.name} ·{" "}
                    {heading?.date} · {heading?.time}
                  </small>
                </div>
              </div>
              <div className="kb-confirm-line">
                <span>Seats</span>
                <strong>
                  {order.tickets?.map((t) => t.seatCode).join(", ")}
                </strong>
              </div>
              <div className="kb-confirm-line">
                <span>Tickets</span>
                <strong>{ticketSummary(order.tickets ?? [])}</strong>
              </div>
              <div className="kb-confirm-line kb-confirm-total">
                <span>TOTAL PAID</span>
                <strong>{formatMoney(order.totalPrice)}</strong>
              </div>
            </div>
            <div className="kb-confirm-actions">
              <button
                type="button"
                className="kb-primary"
                onClick={() => {
                  onClose();
                  navigate("/profile?tab=tickets");
                }}
              >
                View my tickets
              </button>
              <button
                type="button"
                className="kb-secondary"
                onClick={() => {
                  onClose();
                  navigate("/");
                }}
              >
                Back to home
              </button>
            </div>
          </div>
        ) : (
          <>
            <header className="kb-header">
              <div>
                <h2>{session?.movie?.title ?? "Booking"}</h2>
                <p>
                  {session?.venue?.name} · Hall {session?.hall?.name} ·{" "}
                  {session?.date} · {session?.time} · {session?.format?.name} ·{" "}
                  {session?.language?.name}
                </p>
              </div>
              <div className="kb-timer" aria-live="off">
                <span>{hold ? "SEATS HELD" : "NOT HELD"}</span>
                <strong>
                  {hold
                    ? `${Math.floor(secondsLeft / 60)}:${pad(secondsLeft % 60)}`
                    : "--:--"}
                </strong>
              </div>
            </header>
            {(error || sessionStarted) && (
              <div className="kb-alert" role="alert">
                {error || "That session has already started."}{" "}
                {error.includes("profile") && (
                  <button type="button" onClick={() => navigate("/profile")}>
                    Go to profile
                  </button>
                )}
              </div>
            )}
            {isLoading ? (
              <div className="kb-state">Loading booking details...</div>
            ) : hasError ? (
              <div className="kb-state">
                Unable to load booking details: {loadingError}.{" "}
                <button
                  onClick={() => {
                    sessionQuery.refetch();
                    seatsQuery.refetch();
                    optionsQuery.refetch();
                  }}
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="kb-columns">
                <div className="kb-main">
                  <div className="kb-tabs">
                    <button
                      type="button"
                      className={step === "seats" ? "active" : ""}
                      onClick={() => {
                        if (step === "checkout") updateHold();
                      }}
                    >
                      SEATS
                    </button>
                    <button
                      type="button"
                      className={step === "checkout" ? "active" : ""}
                      disabled={!canCheckout}
                      onClick={() => setStep("checkout")}
                    >
                      CHECKOUT
                    </button>
                  </div>
                  {step === "seats" ? (
                    <div className="kb-seat-scroll">
                      {sections.length ? (
                        <SeatGrid
                          sections={sections}
                          selected={selected}
                          onToggle={toggleSeat}
                        />
                      ) : (
                        <p className="kb-state">
                          The seat layout is missing from the API response.
                          Check the /sessions/{"{id}"}/seats JSON.
                        </p>
                      )}
                    </div>
                  ) : (
                    <form
                      id="kb-checkout-form"
                      className="kb-checkout-form"
                      onSubmit={pay}
                    >
                      <Field
                        label="Full name"
                        name="fullName"
                        value={form.fullName}
                        onChange={changeForm}
                        error={fieldErrors.fullName}
                        required
                        autoComplete="name"
                      />
                      <div className="kb-form-row">
                        <Field
                          label="Email"
                          name="email"
                          value={form.email}
                          onChange={changeForm}
                          error={fieldErrors.email}
                          type="email"
                          required
                          autoComplete="email"
                        />
                        <Field
                          label="Mobile number"
                          name="mobileNumber"
                          value={form.mobileNumber}
                          onChange={changeForm}
                          error={fieldErrors.mobileNumber}
                          required
                          autoComplete="tel"
                        />
                      </div>
                      <hr />
                      <Field
                        label="Card number"
                        name="cardNumber"
                        value={form.cardNumber}
                        onChange={changeForm}
                        error={fieldErrors.cardNumber}
                        placeholder="e.g. 4242 4242 4242 4242"
                        inputMode="numeric"
                        required
                        autoComplete="cc-number"
                      />
                      <div className="kb-form-row">
                        <Field
                          label="Expiry"
                          name="expiry"
                          value={form.expiry}
                          onChange={changeForm}
                          error={fieldErrors.expiry}
                          placeholder="MM/YY"
                          required
                          autoComplete="cc-exp"
                        />
                        <Field
                          label="CVV"
                          name="cvv"
                          value={form.cvv}
                          onChange={changeForm}
                          error={fieldErrors.cvv}
                          type="password"
                          inputMode="numeric"
                          placeholder="123"
                          required
                          autoComplete="cc-csc"
                        />
                      </div>
                    </form>
                  )}
                </div>
                <aside className="kb-sidebar">
                  {step === "seats" ? (
                    <>
                      <h3>Your seats · Max {maxSeats}</h3>
                      <p className="kb-side-hint">
                        Pick up to {maxSeats} seats from the map. Each seat can
                        carry its own ticket type.
                      </p>
                      <div className="kb-seat-selection-list">
                        {selected.map((seat) => (
                          <div className="kb-selection" key={seat.id}>
                            <div className="kb-selection-head">
                              <span>
                                Seat <strong>{seat.code}</strong>
                              </span>
                              <span>
                                {formatMoney(
                                  basePrice *
                                    (types.find(
                                      (t) => t.slug === seat.ticketType,
                                    )?.ratio ?? 1),
                                )}{" "}
                                <button
                                  type="button"
                                  onClick={() => toggleSeat(seat)}
                                  aria-label={`Remove seat ${seat.code}`}
                                >
                                  ×
                                </button>
                              </span>
                            </div>
                            <div className="kb-ticket-types">
                              {types.map((type) => (
                                <button
                                  type="button"
                                  key={type.slug}
                                  disabled={Boolean(hold)}
                                  className={
                                    seat.ticketType === type.slug
                                      ? "active"
                                      : ""
                                  }
                                  onClick={() =>
                                    changeTicketType(seat.id, type.slug)
                                  }
                                >
                                  {type.name} {Math.round(type.ratio * 100)}%
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <h3>Summary</h3>
                      <div className="kb-summary-box">
                        <strong>{session?.movie?.title}</strong>
                        <small>
                          Hall {session?.hall?.name} · {session?.date} ·{" "}
                          {session?.time}
                        </small>
                        <hr />
                        <div>
                          <span>Seats</span>
                          <strong>
                            {hold?.seats?.map((s) => s.code).join(", ")}
                          </strong>
                        </div>
                        <div>
                          <span>Tickets</span>
                          <strong>{ticketSummary(hold?.seats ?? [])}</strong>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="kb-sidebar-bottom">
                    <div className="kb-subtotal">
                      <span>SUBTOTAL</span>
                      <strong>{formatMoney(subtotal)}</strong>
                    </div>
                    {step === "seats" ? (
                      <button
                        type="button"
                        className="kb-primary kb-action"
                        disabled={
                          busy ||
                          sessionStarted ||
                          !selected.length ||
                          !validTypes ||
                          !sections.length ||
                          Boolean(hold)
                        }
                        onClick={proceed}
                      >
                        {busy
                          ? "Reserving..."
                          : hold
                            ? "Seats held — open checkout tab"
                            : "Next: Checkout"}
                      </button>
                    ) : (
                      <button
                        type="submit"
                        form="kb-checkout-form"
                        className="kb-primary kb-action"
                        disabled={busy || !canCheckout}
                      >
                        {busy ? "Processing..." : "Pay: Complete order"}
                      </button>
                    )}
                  </div>
                </aside>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
