const USERS_KEY = "udx_users";
const SESSION_USER_KEY = "udx_session_user";

const safeRead = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeWrite = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in restricted mode.
  }
};

const parseJson = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const getRegisteredUsers = () => {
  const users = parseJson(safeRead(USERS_KEY), []);
  return Array.isArray(users) ? users : [];
};

const saveRegisteredUsers = (users) => {
  safeWrite(USERS_KEY, JSON.stringify(users));
};

export const registerUser = (userInput) => {
  const users = getRegisteredUsers();
  const username = String(userInput.username || "").trim();

  if (!username) {
    return { success: false, error: "Username is required." };
  }

  const exists = users.some(
    (row) => String(row.username || "").toLowerCase() === username.toLowerCase()
  );

  if (exists) {
    return { success: false, error: "Username already exists." };
  }

  const user = {
    name: String(userInput.name || "").trim(),
    email: String(userInput.email || "").trim(),
    role: String(userInput.role || "").trim(),
    assignedAreas: Array.isArray(userInput.assignedAreas) ? userInput.assignedAreas : [],
    username,
    password: String(userInput.password || ""),
    organization: "Municipal Corporation"
  };

  users.push(user);
  saveRegisteredUsers(users);

  return { success: true, user };
};

export const loginUser = (usernameOrEmail, password) => {
  const identifier = String(usernameOrEmail || "").trim().toLowerCase();
  const users = getRegisteredUsers();

  const user = users.find((row) => {
    const usernameMatch = String(row.username || "").toLowerCase() === identifier;
    const emailMatch = String(row.email || "").toLowerCase() === identifier;
    return usernameMatch || emailMatch;
  });

  if (!user) {
    return { success: false, error: "User not found." };
  }

  if (String(user.password) !== String(password)) {
    return { success: false, error: "Invalid password." };
  }

  safeWrite(SESSION_USER_KEY, JSON.stringify(user));
  return { success: true, user };
};

export const getSessionUser = () => {
  const user = parseJson(safeRead(SESSION_USER_KEY), null);
  return user && typeof user === "object" ? user : null;
};

export const updateSessionUser = (nextUser) => {
  if (!nextUser) return;
  safeWrite(SESSION_USER_KEY, JSON.stringify(nextUser));
};

export const updateUserPassword = (username, currentPassword, nextPassword) => {
  const users = getRegisteredUsers();
  const nextUsers = users.map((row) => {
    if (String(row.username) !== String(username)) return row;
    return { ...row, password: nextPassword };
  });

  const user = users.find((row) => String(row.username) === String(username));
  if (!user) return { success: false, error: "User not found." };
  if (String(user.password) !== String(currentPassword)) {
    return { success: false, error: "Current password is incorrect." };
  }

  saveRegisteredUsers(nextUsers);
  const updatedUser = { ...user, password: nextPassword };
  updateSessionUser(updatedUser);
  return { success: true };
};

export const clearSessionUser = () => {
  try {
    localStorage.removeItem(SESSION_USER_KEY);
  } catch {
    // Ignore storage failures in restricted mode.
  }
};
