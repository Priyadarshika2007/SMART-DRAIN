import React from "react";
import "./App.css";
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.js";
import Hero from "./components/Hero.js";
import Login from "./components/Login.js";
import About from "./components/About.js";
import Register from "./components/Register.js";
import Footer from "./components/Footer.js";
import Guide from "./components/Guide.js";
import LandingSections from "./components/LandingSections.js";
import Dashboard from "./components/Dashboard.js";
import Profile from "./components/Profile.js";
import MapView from "./pages/MapView.js";
import ProtectedRoute from "./components/ProtectedRoute.js";

function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content">
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
            path="/map"
            element={
              <ProtectedRoute>
                <MapView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
