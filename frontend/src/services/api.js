const API_BASE = "http://127.0.0.1:8000";

export async function getBackendStatus() {
  const res = await fetch(`${API_BASE}/`);
  return res.json();
}

export async function pingAPI() {
  const res = await fetch(`${API_BASE}/api/ping`);
  return res.json();
}
