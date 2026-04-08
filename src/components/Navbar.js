import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar-wrap">
      <nav className="navbar container">
        <button className="brand" onClick={() => navigate("/")}>
          <img src="/logo.jpg" alt="logo" />
          <span className="brand-title">
            UrbanDrain <span className="brand-x">X</span>
          </span>
        </button>

        <ul className="nav-links">
          <li>
            <button
              className={isActive("/") ? "nav-link active" : "nav-link"}
              onClick={() => navigate("/")}
            >
              Home
            </button>
          </li>
          <li>
            <button
              className={isActive("/about") ? "nav-link active" : "nav-link"}
              onClick={() => navigate("/about")}
            >
              About Us
            </button>
          </li>
          <li>
            <button
              className={isActive("/login") ? "nav-link active" : "nav-link"}
              onClick={() => navigate("/login")}
            >
              Login
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
}

export default Navbar;
