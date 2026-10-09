import { Routes, Route } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import HomePage from "./pages/HomePage";
import LoginModal from "./components/auth/LoginModal";
import RegisterModal from "./components/auth/RegisterModal";

function SessionsPage() {
  return <h1>Sessions Page</h1>;
}

function MovieDetailsPage() {
  return <h1>Movie Details</h1>;
}

function ProfilePage() {
  return <h1>My Profile</h1>;
}

export default function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/movies/:id" element={<MovieDetailsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>

      <Footer />
      <LoginModal />
      <RegisterModal />
    </>
  );
}
