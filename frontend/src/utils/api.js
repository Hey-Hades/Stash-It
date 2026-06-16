const fallbackBaseUrl = "https://stash-it-production-d039.up.railway.app";
const baseUrl = (
  import.meta.env.VITE_BASE_URL?.replace(/\/+$/, "") || fallbackBaseUrl
).replace(/\/+$/, "");

export const apiUrl = (path) => {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
};
