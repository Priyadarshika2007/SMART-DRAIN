const TOKEN_KEY = "token";
const USER_KEY = "user";
const ROLE_KEY = "role";

const safeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in restricted environments.
  }
};

const safeRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures in restricted environments.
  }
};

export const getStoredToken = () => safeGet(TOKEN_KEY);

export const getStoredUser = () => {
  const rawUser = safeGet(USER_KEY);

  if (!rawUser) return null;

  try {
    const parsedUser = JSON.parse(rawUser);
    return parsedUser && typeof parsedUser === "object" ? parsedUser : null;
  } catch {
    return null;
  }
};

export const hasStoredAuth = () => Boolean(getStoredUser() || getStoredToken());

export const saveAuthSession = ({ token, user, role }) => {
  if (token) {
    safeSet(TOKEN_KEY, token);
  }

  if (user) {
    safeSet(USER_KEY, JSON.stringify(user));
  }

  if (role) {
    safeSet(ROLE_KEY, role);
  }
};

export const clearAuthSession = () => {
  safeRemove(TOKEN_KEY);
  safeRemove(USER_KEY);
  safeRemove(ROLE_KEY);
};