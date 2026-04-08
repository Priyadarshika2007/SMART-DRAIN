import React from "react";

function ProfilePage({ user }) {
  const assignedArea = Array.isArray(user?.assignedAreas)
    ? user.assignedAreas.join(", ")
    : user?.assignedAreas || user?.area || "Not assigned";

  return (
    <section className="gov-profile-card">
      <h3>Officer Profile</h3>
      <div className="gov-profile-grid">
        <p><strong>Name:</strong> {user?.name || "Municipal Officer"}</p>
        <p><strong>Email:</strong> {user?.email || "-"}</p>
        <p><strong>Role:</strong> {user?.role || "Field Officer"}</p>
        <p><strong>Assigned Area:</strong> {assignedArea}</p>
        <p><strong>Username:</strong> {user?.username || "-"}</p>
      </div>
    </section>
  );
}

export default ProfilePage;
