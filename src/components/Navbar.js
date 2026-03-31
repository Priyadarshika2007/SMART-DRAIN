import React from "react";

function Navbar({ page, setPage }) {
  return (
    <header className="navbar-wrap">
      <nav className="navbar container">
        <button className="brand" onClick={() => setPage("home")}>
          <img src="/logo.jpg" alt="logo" />
          <span className="brand-title">
            UrbanDrain <span className="brand-x">X</span>
          </span>
        </button>

        <ul className="nav-links">
          <li>
            <button
              className={page === "home" ? "nav-link active" : "nav-link"}
              onClick={() => setPage("home")}
            >
              Home
            </button>
          </li>
          <li>
            <button
              className={page === "about" ? "nav-link active" : "nav-link"}
              onClick={() => setPage("about")}
            >
              About Us
            </button>
          </li>
          <li>
            <button
              className={page === "login" ? "nav-link active" : "nav-link"}
              onClick={() => setPage("login")}
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
