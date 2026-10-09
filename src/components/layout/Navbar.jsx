import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Search, UserRound, Menu, X } from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();

  const {
    user,
    isAuthenticated,
    isInitializing,
    openLogin,
    openRegister,
    logout,
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  function handleSearch(event) {
    event.preventDefault();

    const query = searchQuery.trim();
    if (!query) return;

    navigate(`/search?q=${encodeURIComponent(query)}`);
    setSearchQuery("");
    closeMenu();
  }

  function handleLogin() {
    closeMenu();
    openLogin();
  }

  function handleRegister() {
    closeMenu();
    openRegister();
  }

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await logout();
      closeMenu();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          KINO <span>XII</span>
        </Link>

        <nav
          className={`navbar-links ${isMenuOpen ? "navbar-links-open" : ""}`}
          aria-label="Main navigation"
        >
          <NavLink
            to="/sessions"
            onClick={closeMenu}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Sessions
          </NavLink>
        </nav>

        <div className="navbar-actions">
          <form className="navbar-search" onSubmit={handleSearch} role="search">
            <Search size={19} aria-hidden="true" />

            <input
              type="search"
              placeholder="Search movies..."
              aria-label="Search movies"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </form>

          {!isInitializing && (
            <>
              {isAuthenticated ? (
                <div className="navbar-user-actions">
                  <Link
                    to="/profile"
                    className="navbar-profile"
                    onClick={closeMenu}
                    title="My profile"
                  >
                    <UserRound size={19} />
                    <span>{user?.name ?? user?.fullName ?? "My Profile"}</span>
                  </Link>

                  <button
                    type="button"
                    className="navbar-login-btn"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </button>
                </div>
              ) : (
                <div className="navbar-auth-actions">
                  <button
                    type="button"
                    className="navbar-login-btn"
                    onClick={handleLogin}
                  >
                    Log In
                  </button>

                  <button
                    type="button"
                    className="navbar-signup-btn"
                    onClick={handleRegister}
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </>
          )}

          <button
            type="button"
            className="navbar-menu-toggle"
            onClick={() => setIsMenuOpen((current) => !current)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </header>
  );
}
