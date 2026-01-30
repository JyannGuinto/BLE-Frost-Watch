const BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:3000";

async function request(path, options = {}) {
  const headers = options.headers || {};

  // ❗ Only set JSON headers if the body is not FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(BASE_URL + path, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text(); // get the error response for debugging
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  // Some uploads may not return JSON, so handle that safely
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

const api = {
  get: (path) => request(path),
  post: (path, data) =>
    request(path, {
      method: "POST",
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  put: (path, data) => request(path, { method: "PUT", body: JSON.stringify(data) }),
  patch: (path, data) => request(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (path) => request(path, { method: "DELETE" }),
};

export default api;