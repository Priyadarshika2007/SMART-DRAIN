import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "./common/Button.js";
import { hasStoredAuth, getStoredUser, clearAuthSession } from "../utils/auth.js";
import logoImg from "../assets/urbandrainx-logo.png";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(hasStoredAuth());
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [activeNav, setActiveNav] = useState("home");

  useEffect(() => {
    setIsAuthenticated(hasStoredAuth());
    setCurrentUser(getStoredUser());
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Update active navigation item based on route, hash, and scroll position
  useEffect(() => {
    if (location.pathname === "/login") {
      setActiveNav("login");
      return;
    }
    if (location.pathname === "/about") {
      setActiveNav("about");
      return;
    }
    if (location.pathname !== "/") {
      setActiveNav("");
      return;
    }

    // When on home page ("/")
    if (location.hash === "#about") {
      setActiveNav("about");
      const el = document.getElementById("about");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        setTimeout(() => {
          const delayedEl = document.getElementById("about");
          if (delayedEl) delayedEl.scrollIntoView({ behavior: "smooth" });
        }, 150);
      }
      return;
    }

    if (location.hash === "#how-it-works") {
      setActiveNav("how-it-works");
      const el = document.getElementById("how-it-works");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        setTimeout(() => {
          const delayedEl = document.getElementById("how-it-works");
          if (delayedEl) delayedEl.scrollIntoView({ behavior: "smooth" });
        }, 150);
      }
      return;
    }

    // Default to 'home' at top of home page
    const handleScrollSpy = () => {
      if (location.pathname !== "/") return;
      const scrollPos = window.scrollY + 180;
      const howEl = document.getElementById("how-it-works");
      const aboutEl = document.getElementById("about");

      if (howEl && scrollPos >= howEl.offsetTop) {
        setActiveNav("how-it-works");
      } else if (aboutEl && scrollPos >= aboutEl.offsetTop) {
        setActiveNav("about");
      } else {
        setActiveNav("home");
      }
    };

    window.addEventListener("scroll", handleScrollSpy, { passive: true });
    handleScrollSpy();
    return () => window.removeEventListener("scroll", handleScrollSpy);
  }, [location.pathname, location.hash]);

  const handleSignOut = () => {
    clearAuthSession();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setMobileMenuOpen(false);
    navigate("/");
  };

  const handleHomeClick = () => {
    setMobileMenuOpen(false);
    setActiveNav("home");
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (window.location.hash) {
        window.history.pushState(null, "", "/");
      }
    } else {
      navigate("/");
    }
  };

  const handleAboutClick = () => {
    setMobileMenuOpen(false);
    setActiveNav("about");
    if (location.pathname === "/") {
      const el = document.getElementById("about");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", "/#about");
      }
    } else {
      navigate("/#about");
      setTimeout(() => {
        const el = document.getElementById("about");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const handleHowItWorksClick = () => {
    setMobileMenuOpen(false);
    setActiveNav("how-it-works");
    if (location.pathname === "/") {
      const el = document.getElementById("how-it-works");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", "/#how-it-works");
      }
    } else {
      navigate("/#how-it-works");
      setTimeout(() => {
        const el = document.getElementById("how-it-works");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const handleSignInClick = () => {
    setMobileMenuOpen(false);
    setActiveNav("login");
    navigate("/login");
  };

  return (
    <>
      <style>{`
        .udx-nav-item-btn {
          background: transparent;
          border: 1px solid transparent;
          color: #B8C5D6;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          padding: 7px 16px;
          border-radius: 8px;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }
        .udx-nav-item-btn:hover {
          color: #F4F7FB;
          background: rgba(53, 214, 194, 0.08);
        }
        .udx-nav-item-btn.is-active {
          color: #35D6C2 !important;
          background: rgba(53, 214, 194, 0.14) !important;
          border: 1px solid rgba(53, 214, 194, 0.38) !important;
          font-weight: 600;
          box-shadow: 0 0 14px rgba(53, 214, 194, 0.15);
        }

        .udx-mobile-nav-item-btn {
          background: transparent;
          border: 1px solid transparent;
          color: #B8C5D6;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          padding: 10px 14px;
          border-radius: 8px;
          text-align: left;
          width: 100%;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .udx-mobile-nav-item-btn:hover {
          color: #F4F7FB;
          background: rgba(53, 214, 194, 0.08);
        }
        .udx-mobile-nav-item-btn.is-active {
          color: #35D6C2 !important;
          background: rgba(53, 214, 194, 0.14) !important;
          border: 1px solid rgba(53, 214, 194, 0.38) !important;
          font-weight: 600;
        }
      `}</style>

      <header
        className={`udx-navbar-wrap ${scrolled ? "is-scrolled" : ""}`}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backgroundColor: scrolled ? "rgba(11, 18, 32, 0.95)" : "#0B1220",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--color-border-subtle)",
          transition: "background-color var(--transition-normal)",
        }}
      >
        <nav
          className="udx-container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "72px",
          }}
          aria-label="Main Navigation"
        >
          {/* Brand */}
          <button
            onClick={handleHomeClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              textAlign: "left",
            }}
            aria-label="URBANDRAINX 2.0 Home"
          >
            {/* Official URBANDRAINX 2.0 Sewer Telemetry Logo */}
            <img
              src={logoImg}
              alt="URBANDRAINX 2.0 Sewer Telemetry Logo"
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid rgba(53, 214, 194, 0.5)",
                boxShadow: "0 0 14px rgba(53, 214, 194, 0.28)",
                flexShrink: 0,
                display: "block",
              }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    fontFamily: "var(--font-family-display)",
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    color: "#F4F7FB",
                  }}
                >
                  URBANDRAIN<span style={{ color: "var(--color-aqua)" }}>X 2.0</span>
                </span>
              </div>
              <span
                style={{
                  display: "block",
                  fontSize: "0.58rem",
                  color: "var(--color-text-secondary)",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  lineHeight: 1.2,
                  maxWidth: "340px",
                }}
              >
                SMART AI-BASED INSPECTION CHAMBER MONITORING FOR URBAN DRAINAGE NETWORKS
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <div
            className="udx-nav-links-desktop"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(16, 34, 53, 0.6)",
              padding: "4px 6px",
              borderRadius: "10px",
              border: "1px solid rgba(48, 66, 86, 0.5)",
            }}
          >
            <button
              onClick={handleHomeClick}
              className={`udx-nav-item-btn ${activeNav === "home" ? "is-active" : ""}`}
            >
              Home
            </button>
            <button
              onClick={handleAboutClick}
              className={`udx-nav-item-btn ${activeNav === "about" ? "is-active" : ""}`}
            >
              About
            </button>
            <button
              onClick={handleHowItWorksClick}
              className={`udx-nav-item-btn ${activeNav === "how-it-works" ? "is-active" : ""}`}
            >
              How It Works
            </button>
            {!isAuthenticated ? (
              <button
                onClick={handleSignInClick}
                className={`udx-nav-item-btn ${activeNav === "login" ? "is-active" : ""}`}
              >
                Sign In
              </button>
            ) : (
              <button
                onClick={() => navigate("/dashboard")}
                className={`udx-nav-item-btn ${location.pathname.startsWith("/dashboard") ? "is-active" : ""}`}
              >
                Dashboard
              </button>
            )}
          </div>

          {/* Right Actions: Authenticated Session Actions or Mobile Trigger */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {isAuthenticated ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </div>
            ) : null}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="udx-mobile-toggle"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle Mobile Menu"
              aria-expanded={mobileMenuOpen}
              style={{
                display: "none",
                background: "none",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-text-primary)",
                padding: "6px",
                cursor: "pointer",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </nav>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div
            className="udx-mobile-drawer"
            style={{
              backgroundColor: "#0B1220",
              borderBottom: "1px solid var(--color-border-subtle)",
              padding: "1rem var(--container-padding) 1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <button
              onClick={handleHomeClick}
              className={`udx-mobile-nav-item-btn ${activeNav === "home" ? "is-active" : ""}`}
            >
              <span>Home</span>
              {activeNav === "home" && <span style={{ color: "#35D6C2" }}>&bull;</span>}
            </button>
            <button
              onClick={handleAboutClick}
              className={`udx-mobile-nav-item-btn ${activeNav === "about" ? "is-active" : ""}`}
            >
              <span>About</span>
              {activeNav === "about" && <span style={{ color: "#35D6C2" }}>&bull;</span>}
            </button>
            <button
              onClick={handleHowItWorksClick}
              className={`udx-mobile-nav-item-btn ${activeNav === "how-it-works" ? "is-active" : ""}`}
            >
              <span>How It Works</span>
              {activeNav === "how-it-works" && <span style={{ color: "#35D6C2" }}>&bull;</span>}
            </button>
            {!isAuthenticated ? (
              <button
                onClick={handleSignInClick}
                className={`udx-mobile-nav-item-btn ${activeNav === "login" ? "is-active" : ""}`}
              >
                <span>Sign In</span>
                {activeNav === "login" && <span style={{ color: "#35D6C2" }}>&bull;</span>}
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", paddingTop: "0.5rem" }}>
                <Button
                  variant="primary"
                  size="md"
                  style={{ width: "100%" }}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/dashboard");
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  style={{ width: "100%" }}
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
}

export default Navbar;
