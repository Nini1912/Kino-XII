import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Check,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Ticket,
  UserRound,
  X,
} from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import "./Navbar.css";
import SearchOverlay from "./SearchOverlay";

export default function Navbar() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const {
    user,
    isAuthenticated,
    isInitializing,
    openLogin,
    openRegister,
    logout,
  } = useAuth();

  const [searchOpen, setSearchOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isProfileComplete = user?.profileComplete === true;

  useEffect(() => {
    function handleOutsideClick(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleLogout() {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    logout();
    navigate("/");
  }

  function closeMenus() {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  }

  const displayName = user?.username || "My account";

  function ProfileAvatar({ dropdown = false }) {
    const avatarClass = dropdown
      ? "navbar-dropdown-avatar"
      : "navbar-account-avatar";

    return (
      <span className="navbar-profile-avatar-wrapper">
        {user?.avatar ? (
          <img src={user.avatar} alt="" className={avatarClass} />
        ) : (
          <span className={`${avatarClass} navbar-account-fallback`}>
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}

        {dropdown && (
          <span
            className={`navbar-avatar-status-dot ${
              isProfileComplete ? "complete" : "incomplete"
            }`}
            aria-label={
              isProfileComplete ? "Profile complete" : "Profile incomplete"
            }
          />
        )}
      </span>
    );
  }

  return (
    <>
      <header className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo" onClick={closeMenus}>
            KINO <span>XII</span>
          </Link>

          <nav
            className={`navbar-links ${
              mobileMenuOpen ? "navbar-links-open" : ""
            }`}
          >
            <NavLink to="/sessions" onClick={closeMenus}>
              Sessions
            </NavLink>
          </nav>

          <div className="navbar-right">
            <button
              type="button"
              className="navbar-search navbar-search-trigger"
              onClick={() => setSearchOpen(true)}
              aria-label="Search films and live events"
            >
              <Search size={16} />
              <span>Search films and live events</span>
            </button>

            {!isInitializing && (
              <>
                {isAuthenticated ? (
                  <div className="navbar-account" ref={dropdownRef}>
                    <button
                      type="button"
                      className="navbar-account-trigger"
                      aria-label="Open account menu"
                      aria-haspopup="menu"
                      aria-expanded={dropdownOpen}
                      onClick={() => setDropdownOpen((previous) => !previous)}
                    >
                      <ProfileAvatar />

                      <span className="navbar-account-name">{displayName}</span>

                      <ChevronDown
                        size={14}
                        className={dropdownOpen ? "navbar-chevron-open" : ""}
                      />
                    </button>

                    {dropdownOpen && (
                      <div className="navbar-account-dropdown" role="menu">
                        <div className="navbar-dropdown-user">
                          <ProfileAvatar dropdown />

                          <div>
                            <strong>{displayName}</strong>
                            <small>{user?.email}</small>
                          </div>
                        </div>

                        {isProfileComplete ? (
                          <div className="navbar-profile-status navbar-status-complete">
                            <span>Profile Complete</span>
                            <Check size={17} strokeWidth={2.5} />
                          </div>
                        ) : (
                          <Link
                            to="/profile"
                            className="navbar-profile-status navbar-status-incomplete"
                            onClick={closeMenus}
                            role="menuitem"
                          >
                            <strong>Profile incomplete</strong>
                            <small>
                              Please complete your profile to enable booking
                            </small>
                          </Link>
                        )}

                        <div className="navbar-dropdown-divider" />

                        <Link
                          to="/profile"
                          className="navbar-dropdown-item"
                          onClick={closeMenus}
                          role="menuitem"
                        >
                          <UserRound size={16} />
                          My Profile
                        </Link>

                        <Link
                          to="/profile?tab=tickets"
                          className="navbar-dropdown-item"
                          onClick={closeMenus}
                          role="menuitem"
                        >
                          <Ticket size={16} />
                          My Tickets
                        </Link>

                        <div className="navbar-dropdown-divider" />

                        <button
                          type="button"
                          className="navbar-dropdown-item navbar-dropdown-logout"
                          onClick={handleLogout}
                          role="menuitem"
                        >
                          <LogOut size={16} />
                          Log out
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="navbar-auth-actions">
                    <button
                      type="button"
                      className="navbar-login-button"
                      onClick={openLogin}
                    >
                      Log In
                    </button>

                    <button
                      type="button"
                      className="navbar-signup-button"
                      onClick={openRegister}
                    >
                      Sign Up
                    </button>
                  </div>
                )}
              </>
            )}

            <button
              type="button"
              className="navbar-mobile-toggle"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((previous) => !previous)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
