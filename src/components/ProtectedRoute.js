import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { hasStoredAuth } from "../utils/auth.js";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(hasStoredAuth());
    setIsCheckingAuth(false);
  }, [location.pathname]);

  if (isCheckingAuth) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;