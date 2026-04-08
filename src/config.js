const configuredApi = String(process.env.REACT_APP_API_URL || "").trim();
const fallbackApi = "http://localhost:5001/api";
const baseApi = configuredApi || fallbackApi;

// Keep a single normalized API prefix for all frontend requests.
const API = baseApi.endsWith("/api") ? baseApi.replace(/\/+$/, "") : `${baseApi.replace(/\/+$/, "")}/api`;

console.log("API base URL:", API);

export default API;
export { API };
