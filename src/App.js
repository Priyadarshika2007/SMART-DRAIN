import React, { useState } from "react";
import "./App.css";
import Navbar from "./components/Navbar.js";
import Hero from "./components/Hero.js";
import Dashboard from "./components/Dashboard.js";
import Alerts from "./components/Alerts.js";
import Login from "./components/Login.js";
import About from "./components/About.js";
import Register from "./components/Register.js";
import Footer from "./components/Footer.js";

function App() {
  const [page, setPage] = useState("home");

  const renderPage = () => {
    if (page === "login") {
      return <Login setPage={setPage} />;
    }

    if (page === "about") {
      return <About page={page} />;
    }

    if (page === "register") {
      return <Register setPage={setPage} />;
    }

    return (
      <>
        <Hero setPage={setPage} />
        <Dashboard />
        <Alerts />
      </>
    );
  };

  return (
    <div className="app-shell">
      <Navbar page={page} setPage={setPage} />
      <main className="page-content">{renderPage()}</main>
      <Footer />
    </div>
  );
}

export default App;
