import { Routes, Route, Link } from "react-router-dom";

function HomePage() {
  return <h1>Home Page</h1>;
}

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
      <nav className="navbar">
        <Link to="/" className="logo">
          KINO <span>XII</span>
        </Link>

        <Link to="/sessions">SESSIONS</Link>
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/movies/:id" element={<MovieDetailsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </>
  );
}
