import React, { useState } from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Dashboard from "./components/Dashboard";
import Alerts from "./components/Alerts";
import Login from "./components/Login";
import About from "./components/About";
import Register from "./components/Register";
import Footer from "./components/Footer";

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
