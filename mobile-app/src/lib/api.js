let csrfToken = null;

async function fetchCsrf() {
  const r = await fetch('/api/csrf.php', { credentials: 'same-origin' });
  const d = await r.json();
  csrfToken = d.token;
  return csrfToken;
}

export async function secureFetch(url, opts = {}) {
  if (!csrfToken) await fetchCsrf();
  const headers = { 'X-CSRF-Token': csrfToken, 'Accept': 'application/json', ...(opts.headers || {}) };
  const res = await fetch(url, { credentials: 'same-origin', ...opts, headers });
  if (res.status === 403) {
    csrfToken = null;
    await fetchCsrf();
    return secureFetch(url, opts);
  }
  return res;
}

export const api = {
  get: (path) => fetch(`/api/${path}`, { credentials: 'same-origin', headers: { Accept: 'application/json' } }),
  post: (path, body) => secureFetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
};

export { fetchCsrf };
