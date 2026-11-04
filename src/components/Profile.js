import React from "react";
import Dashboard from "./Dashboard.js";

/**
 * Profile route entry point.
 * Re-uses the shared authenticated layout with the profile tab active.
 */
function Profile() {
  return <Dashboard initialTab="profile" />;
}

export default Profile;
