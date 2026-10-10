import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { bookingApi } from "../api/bookingApi";
import BookingModal from "../components/booking/BookingModal";
import "../styles/booking.css";

export default function SessionBookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: session } = useQuery({
    queryKey: ["booking-session", id],
    queryFn: () => bookingApi.session(id),
  });
  return (
    <main className="kb-page">
      <div
        className="kb-hero"
        style={
          session?.movie?.backdropUrl
            ? {
                backgroundImage: `linear-gradient(90deg,rgba(7,11,27,.85),rgba(7,11,27,.25)),url("${session.movie.backdropUrl}")`,
              }
            : undefined
        }
      >
        <div className="kb-hero-content">
          {session?.movie?.posterUrl && (
            <img src={session.movie.posterUrl} alt="" />
          )}
          <div>
            <span className="kb-now-playing">NOW PLAYING</span>
            <h1>{session?.movie?.title ?? "Movie booking"}</h1>
            <p>{session?.movie?.description}</p>
            <small>
              {session?.movie?.runtimeMinutes} min · {session?.format?.name}
            </small>
          </div>
        </div>
      </div>
      <div className="kb-background-content">
        <h2>Sessions</h2>
        <p>
          {session?.venue?.name} · {session?.date} · {session?.time}
        </p>
      </div>
      <BookingModal sessionId={id} onClose={() => navigate(-1)} />
    </main>
  );
}
