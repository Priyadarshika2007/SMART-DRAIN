import React from "react";
import "./App.css";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.js";
import Hero from "./components/Hero.js";
import Login from "./components/Login.js";
import About from "./components/About.js";
import Register from "./components/Register.js";
import Footer from "./components/Footer.js";
import Guide from "./components/Guide.js";
import LandingSections from "./components/LandingSections.js";
import Dashboard from "./components/Dashboard.js";
import ProtectedRoute from "./components/ProtectedRoute.js";

function App() {
  const location = useLocation();
  const isAuthRoute =
    location.pathname.startsWith("/dashboard") ||
    location.pathname === "/map" ||
    location.pathname === "/gas-safety" ||
    location.pathname === "/hydraulics" ||
    location.pathname === "/devices" ||
    location.pathname === "/alerts" ||
    location.pathname === "/analytics" ||
    location.pathname === "/drains" ||
    location.pathname === "/reports" ||
    location.pathname === "/users" ||
    location.pathname === "/profile";

  return (
    <div className={`app-shell ${isAuthRoute ? "app-shell-auth" : ""}`}>
      {!isAuthRoute && <Navbar />}
      <main className={isAuthRoute ? "auth-page-content" : "page-content"}>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Hero />
                <LandingSections />
              </>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about" element={<About />} />
          <Route path="/guide" element={<Guide />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hydraulics"
            element={
              <ProtectedRoute>
                <Dashboard initialTab="hydraulics" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gas-safety"
            element={
              <ProtectedRoute>
                <Dashboard initialTab="gas-safety" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/devices"
            element={
              <ProtectedRoute>
                <Dashboard initialTab="devices" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <Dashboard initialTab="map" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/drains"
            element={
              <ProtectedRoute>
                <Dashboard initialTab="drains" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <Dashboard initialTab="alerts" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Dashboard initialTab="analytics" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Dashboard initialTab="reports" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Dashboard initialTab="users" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Dashboard initialTab="profile" />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isAuthRoute && <Footer />}
    </div>
  );
}

export default App;
