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
import { parseApiError } from "../../utils/apiErrors";
const holdKey = (id) => `kino_hold_${id}`;
function isHoldExpired(hold) {
  if (!hold?.expiresAt) return true;
  const expiresAt = Date.parse(hold.expiresAt);
  return !Number.isFinite(expiresAt) || expiresAt <= Date.now();
}
function validateCheckoutField(name, value) {
  const text = String(value ?? "").trim();
  if (name === "fullName")
    return !text
      ? "Name is required"
      : text.length < 3
        ? "Name must be at least 3 characters"
        : text.length > 50
          ? "Name must not exceed 50 characters"
          : "";
  if (name === "email")
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
      ? ""
      : "Please enter a valid email address";
  if (name === "mobileNumber") {
    if (!text) return "Mobile number is required";
    if (!text.startsWith("5"))
      return "Georgian mobile numbers must start with 5";
    if (/^\d+$/.test(text) && text.length !== 9)
      return "Mobile number must be exactly 9 digits";
    return /^5\d{8}$/.test(text)
      ? ""
      : "Please enter a valid Georgian mobile number (9 digits starting with 5)";
  }
  if (name === "cardNumber")
    return /^\d{16}$/.test(text.replace(/\s/g, ""))
      ? ""
      : "Card number must contain 16 digits";
  if (name === "cvv")
    return /^\d{3}$/.test(text) ? "" : "CVV must contain 3 digits";
  if (name === "expiry") {
    const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(text);
    if (!match) return "Expiry must be in MM/YY format";
    const year = 2000 + Number(match[2]);
    const month = Number(match[1]);
    const now = new Date();
    return year > now.getFullYear() ||
      (year === now.getFullYear() && month >= now.getMonth() + 1)
      ? ""
      : "Card expiry must be in the future";
  }
  return "";
}
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
function formatSessionDate(session) {
  const date = session?.date ?? session?.startsAt?.slice(0, 10);
  if (!date) return "";
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(parsed);
}
function sessionSummary(session) {
  return [
    session?.venue?.name ?? session?.hall?.venue?.name,
    session?.hall?.name ? `Hall ${session.hall.name}` : null,
    formatSessionDate(session),
    session?.time,
    session?.format?.name,
    session?.language?.name,
  ]
    .filter(Boolean)
    .join(" · ");
}
const getError = (err) =>
  err?.response?.data?.message ?? err?.message ?? "Something went wrong.";
function SeatGrid({ sections, selected, onToggle, disabled = false }) {
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
          <h3>{section.name} </h3>
          {section.rows.map((row, rowIndex) => (
            <div className="kb-row" key={`${row.label}-${rowIndex}`}>
              <span className="kb-row-name">{row.label}</span>
              <div className="kb-row-cells">
                {row.seats.map((seat, seatIndex) => {
                  const picked = selected.some((s) => s.id === seat.id);
                  const available =
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
                          disabled={disabled || !available}
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
function Field({ label, name, value, onChange, onBlur, error, ...props }) {
  return (
    <label className="kb-field">
      <span>{label}</span>
      <input
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        {...props}
      />
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
  const {
    user,
    isAuthenticated,
    isLoginOpen,
    isRegisterOpen,
    openLogin,
    requireLogin,
  } = useAuth();
  const [selected, setSelected] = useState([]);
  const [step, setStep] = useState("seats");
  const [hold, setHold] = useState(null);
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    mobileNumber: user?.mobileNumber ?? "",
  }));
  const closingRef = useRef(false);
  const holdRef = useRef(null);
  const expiryHandledRef = useRef(false);
  const requestLockRef = useRef(false);
  const [restorationStatus, setRestorationStatus] = useState(() =>
    sessionStorage.getItem(holdKey(sessionId)) ? "pending" : "idle",
  );
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
  // Derive a safe selection instead of setting state inside an effect.
  const availableSeatIds = useMemo(
    () =>
      new Set(
        seats
          .filter(
            (seat) =>
              seat.status === "available" ||
              (seat.status === "held" && seat.isMine),
          )
          .map((seat) => String(seat.id)),
      ),
    [seats],
  );
  const validSelected = useMemo(() => {
    if (hold || !seatsQuery.data) return selected;
    return selected.filter((seat) => availableSeatIds.has(String(seat.id)));
  }, [selected, availableSeatIds, hold, seatsQuery.data]);
  const types = useMemo(
    () => getTicketTypes(optionsQuery.data, session?.movie),
    [optionsQuery.data, session?.movie],
  );
  const maxSeats = Math.min(3, getMaxSeats(optionsQuery.data));
  const validTypes =
    types.length > 0 && types.some((type) => type.slug === "adult");
  const basePrice = Number(session?.price ?? 0);
  const estimated = validSelected.reduce(
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
  const resetExpired = useCallback(async () => {
    if (expiryHandledRef.current) return;
    expiryHandledRef.current = true;
    holdRef.current = null;
    sessionStorage.removeItem(holdKey(sessionId));
    setHold(null);
    setSelected([]);
    setSecondsLeft(0);
    setStep("seats");
    setFieldErrors({});
    setError(
      "Your seat reservation has expired. Please select your seats again.",
    );
    await queryClient.invalidateQueries({
      queryKey: ["booking-seats", sessionId],
    });
  }, [queryClient, sessionId]);
  useEffect(() => {
    if (!isAuthenticated) return;
    const storedHoldId = sessionStorage.getItem(holdKey(sessionId));
    if (!storedHoldId) return;
    let cancelled = false;
    async function restoreHold() {
      try {
        const saved = await bookingApi.getHold(storedHoldId);
        if (cancelled) return;
        if (!saved?.isLive || isHoldExpired(saved)) {
          await resetExpired();
          return;
        }
        expiryHandledRef.current = false;
        holdRef.current = saved;
        setHold(saved);
        setSelected(
          (saved.seats ?? []).map((seat) => ({
            id: seat.seatId,
            code: seat.code,
            ticketType: seat.ticketType?.slug ?? seat.ticketType ?? "adult",
          })),
        );
        setSecondsLeft(
          Math.max(
            0,
            Math.ceil((Date.parse(saved.expiresAt) - Date.now()) / 1000),
          ),
        );
        setError("");
        setStep("checkout");
      } catch (err) {
        if (cancelled) return;
        if (!saved?.isLive || isHoldExpired(saved)) {
          setRestorationStatus("idle");
          await resetExpired();
          return;
        }
        setRestorationStatus("ready");
        if ([404, 410].includes(err.response?.status)) {
          setRestorationStatus("idle");
          sessionStorage.removeItem(holdKey(sessionId));
          setHold(null);
          holdRef.current = null;
          setSelected([]);
          setSecondsLeft(0);
          setStep("seats");
          setError("Your previous reservation is no longer available.");
        } else {
          setRestorationStatus("error");
          setError(
            "Could not restore your reservation. Please check your connection and reload.",
          );
        }
      }
    }
    void restoreHold();
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
      if (remaining === 0) void resetExpired();
    };
    const timeout = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(timer);
    };
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
    const movieIdentifier =
      session?.movie?.slug ?? session?.movie?.id ?? session?.movieId;
    if (movieIdentifier != null && movieIdentifier !== "") {
      navigate(`/movies/${encodeURIComponent(movieIdentifier)}`, {
        replace: true,
      });
    } else {
      onClose();
    }
  };
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && !busy && !isLoginOpen && !isRegisterOpen)
        close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  function toggleSeat(seat) {
    if (busy) return;
    if (sessionStarted) {
      setError(
        "This session has already started. Please choose another showtime.",
      );
      return;
    }
    if (hold) {
      setError(
        "Seats are already reserved. Continue to checkout or release your hold to change seats.",
      );
      return;
    }
    // Sidebar removal passes a selected item without a status field.
    if (selected.some((item) => item.id === seat.id)) {
      setSelected((previous) => previous.filter((item) => item.id !== seat.id));
      setError("");
      return;
    }
    const isAvailable =
      seat.status === "available" || (seat.status === "held" && seat.isMine);
    if (!isAvailable) {
      setError(
        `Seat ${seat.code} is no longer available. Please choose another seat.`,
      );
      return;
    }
    if (validSelected.length >= maxSeats) {
      setError(`You can select a maximum of ${maxSeats} seats per order.`);
      return;
    }
    setError("");
    setSelected((previous) => {
      const alreadySelected = previous.some((item) => item.id === seat.id);
      if (alreadySelected) {
        return previous.filter((item) => item.id !== seat.id);
      }
      if (
        previous.filter((item) => availableSeatIds.has(String(item.id)))
          .length >= maxSeats
      ) {
        return previous;
      }
      return [
        ...previous,
        {
          id: seat.id,
          code: seat.code,
          ticketType: "adult",
        },
      ];
    });
  }
  function changeTicketType(id, ticketType) {
    setSelected((prev) =>
      prev.map((seat) => (seat.id === id ? { ...seat, ticketType } : seat)),
    );
  }
  async function handleConflict(err) {
    const response = err.response?.data ?? {};
    const rawContested = response.contested;
    const contested = Array.isArray(rawContested) ? rawContested : [];
    const contestedCodes = new Set();
    const contestedIds = new Set();
    contested.forEach((item) => {
      if (typeof item === "string") {
        contestedCodes.add(item);
      } else if (typeof item === "number") {
        contestedIds.add(String(item));
      } else if (item && typeof item === "object") {
        if (item.code != null) {
          contestedCodes.add(String(item.code));
        }
        const id = item.seatId ?? item.id;
        if (id != null) {
          contestedIds.add(String(id));
        }
      }
    });
    setSelected((previous) =>
      previous.filter(
        (seat) =>
          !contestedCodes.has(String(seat.code)) &&
          !contestedIds.has(String(seat.id)),
      ),
    );
    setStep("seats");
    if (contested.length > 0) {
      const seatLabels = contested.map((item) => {
        if (typeof item === "object" && item !== null) {
          return item.code ?? item.seatId ?? item.id ?? "Unknown";
        }
        return item;
      });
      setError(
        `These seats are no longer available: ${seatLabels.join(", ")}. Please select other seats.`,
      );
    } else {
      setError(
        response.message ??
          "Some seats are no longer available. Please review the updated seat map.",
      );
    }
    try {
      await queryClient.invalidateQueries({
        queryKey: ["booking-seats", sessionId],
      });
    } catch (refreshError) {
      console.error("Failed to refresh seats:", refreshError);
      setError(
        "Seat availability changed, but the map could not be refreshed. Please retry.",
      );
    }
  }
  async function createBookingHold(currentUser) {
    setError("");
    if (!currentUser?.profileComplete) {
      setError("Complete your profile before booking.");
      return;
    }
    if (sessionStarted) {
      setError("That session has already started. Choose another showtime.");
      return;
    }
    if (
      !validSelected.length ||
      !validTypes ||
      requestLockRef.current ||
      restorationStatus === "pending" ||
      restorationStatus === "error" ||
      holdRef.current
    ) {
      return;
    }
    requestLockRef.current = true;
    setBusy(true);
    try {
      const result = await bookingApi.createHold(sessionId, validSelected);
      if (!result?.holdId || isHoldExpired(result)) {
        throw new Error("The server did not return a valid seat reservation.");
      }
      expiryHandledRef.current = false;
      holdRef.current = result;
      setHold(result);
      sessionStorage.setItem(holdKey(sessionId), result.holdId);
      setSecondsLeft(
        Math.max(
          0,
          Math.ceil((Date.parse(result.expiresAt) - Date.now()) / 1000),
        ),
      );
      setStep("checkout");
    } catch (err) {
      if (err.response?.status === 409) await handleConflict(err);
      else {
        setError(getError(err));
        if (err.response?.status === 401) {
          requireLogin((loggedInUser) => createBookingHold(loggedInUser));
        }
      }
    } finally {
      requestLockRef.current = false;
      setBusy(false);
    }
  }
  async function proceed() {
    if (!isAuthenticated) {
      requireLogin((loggedInUser) => createBookingHold(loggedInUser));
      return;
    }
    await createBookingHold(user);
  }
  async function updateHold() {
    if (busy) return;
    if (!hold) {
      setStep("seats");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await bookingApi.releaseHold(hold.holdId);
      sessionStorage.removeItem(holdKey(sessionId));
      holdRef.current = null;
      setHold(null);
      setSecondsLeft(0);
      expiryHandledRef.current = false;
      setStep("seats");
      await queryClient.invalidateQueries({
        queryKey: ["booking-seats", sessionId],
      });
    } catch (err) {
      setError(
        "Unable to release your previous reservation. Please try again.",
      );
      console.error("Failed to release hold:", err);
    } finally {
      setBusy(false);
    }
  }
  function changeForm(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }
  function blurCheckoutField(event) {
    const { name, value } = event.target;
    const message = validateCheckoutField(name, value);
    setFieldErrors((previous) => ({
      ...previous,
      [name]: message || undefined,
    }));
  }
  async function pay(event) {
    event.preventDefault();
    if (!hold || requestLockRef.current) return;
    if (isHoldExpired(hold)) {
      await resetExpired();
      return;
    }
    const validationErrors = {};
    for (const [name, value] of Object.entries(form)) {
      const message = validateCheckoutField(name, value);
      if (message) validationErrors[name] = message;
    }
    if (Object.keys(validationErrors).length) {
      setFieldErrors(validationErrors);
      return;
    }
    requestLockRef.current = true;
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const result = await bookingApi.pay({ holdId: hold.holdId, ...form });
      sessionStorage.removeItem(holdKey(sessionId));
      setOrder(result);
      holdRef.current = null;
      setHold(null);
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["booking-seats", sessionId] });
    } catch (err) {
      const status = err.response?.status;
      const parsed = parseApiError(err);
      if (status === 409) {
        await handleConflict(err);
      } else if (parsed.type === "validation") {
        setFieldErrors(parsed.fieldErrors);
        setError("");
      } else if (parsed.type === "rule") {
        const isExpiredHold = /hold|expired/i.test(parsed.message);
        if (isExpiredHold) {
          await resetExpired();
          setError(parsed.message);
        } else {
          setError(parsed.message);
        }
      } else if (status === 401) {
        openLogin();
        setError("Please log in again to continue.");
      } else {
        setError(parsed.message);
      }
    } finally {
      requestLockRef.current = false;
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
                <p>{sessionSummary(session)}</p>
              </div>
              {step === "checkout" && hold && (
                <div className="kb-timer" aria-live="off">
                  <span>{hold ? "SEATS HELD" : "NOT HELD"}</span>
                  <strong>
                    {hold
                      ? `${Math.floor(secondsLeft / 60)}:${pad(secondsLeft % 60)}`
                      : "--:--"}
                  </strong>
                </div>
              )}
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
                      disabled={busy}
                      onClick={() => {
                        if (step === "checkout") {
                          void updateHold();
                        }
                      }}
                    >
                      {busy && step === "checkout" ? "Releasing..." : "SEATS"}
                    </button>
                    <button
                      type="button"
                      className={step === "checkout" ? "active" : ""}
                      disabled={
                        busy ||
                        Boolean(hold) ||
                        sessionStarted ||
                        restorationStatus === "pending" ||
                        restorationStatus === "error" ||
                        !canCheckout
                      }
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
                          selected={validSelected}
                          onToggle={toggleSeat}
                          disabled={busy || Boolean(hold) || sessionStarted}
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
                        onBlur={blurCheckoutField}
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
                          onBlur={blurCheckoutField}
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
                          onBlur={blurCheckoutField}
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
                        onBlur={blurCheckoutField}
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
                          onBlur={blurCheckoutField}
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
                          onBlur={blurCheckoutField}
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
                        {validSelected.map((seat) => (
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
                                  disabled={busy || Boolean(hold)}
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
                          !validSelected.length ||
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
