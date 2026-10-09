import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Menu, X } from "lucide-react";

export default function Navbar() {
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  function handleSearch(e) {
    e.preventDefault();

    if (search.trim()) {
      navigate(`/sessions?search=${encodeURIComponent(search.trim())}`);
    }
  }

  return (
    <header className="navbar">
      <Link to="/" className="logo">
        KINO <span>XII</span>
      </Link>

      <Link to="/sessions" className="nav-link">
        SESSIONS
      </Link>

      <div className="nav-spacer" />

      <form className="nav-search" onSubmit={handleSearch}>
        <Search size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search films and events"
          aria-label="Search films and events"
        />
      </form>

      <div className="nav-actions">
        <button className="btn btn-primary" type="button">
          Sign up
        </button>
        <button className="btn btn-light" type="button">
          Log in
        </button>
      </div>

      <button
        className="mobile-menu-btn"
        type="button"
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X /> : <Menu />}
      </button>

      {menuOpen && (
        <div className="mobile-nav">
          <Link to="/sessions" onClick={() => setMenuOpen(false)}>
            Sessions
          </Link>
          <button type="button">Sign up</button>
          <button type="button">Log in</button>
        </div>
      )}
    </header>
  );
}
