import { Routes, Route } from "react-router-dom";

import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import HomePage from "./pages/HomePage";
import MovieDetailsPage from "./pages/MovieDetailsPage";
import LoginModal from "./components/auth/LoginModal";
import RegisterModal from "./components/auth/RegisterModal";
import ProfilePage from "./pages/ProfilePage";

function SessionsPage() {
  return <h1>Sessions Page</h1>;
}

function SessionBookingPlaceholder() {
  return (
    <main style={{ padding: "130px 5%", minHeight: "80vh" }}>
      <h1>Seat selection</h1>
      <p>Booking functionality is coming next.</p>
    </main>
  );
}

export default function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/sessions/:id" element={<SessionBookingPlaceholder />} />
        <Route path="/movies/:id" element={<MovieDetailsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>

      <Footer />
      <LoginModal />
      <RegisterModal />
    </>
  );
}
