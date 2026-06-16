const envBaseUrl = import.meta.env.VITE_BASE_URL?.replace(/\/+$/, "");
const localFallback =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
    ? "http://localhost:5000"
    : "";

const baseUrl = envBaseUrl || localFallback;

export const apiUrl = (path) => {
  if (!baseUrl) {
    throw new Error("VITE_BASE_URL is not configured");
  }

  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
};
