const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers:
      options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json', ...options.headers }
        : options.headers,
    ...options,
  });

  if (!res.ok) {
    let message = 'Erreur';
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      /* ignore */
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  const type = res.headers.get('content-type') || '';
  return type.includes('application/json') ? res.json() : res;
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  // Mail
  folders: () => request('/folders'),
  messages: ({ folder, page = 1, limit = 50, search = '' }) =>
    request(
      `/messages?folder=${encodeURIComponent(folder)}&page=${page}&limit=${limit}` +
        (search ? `&search=${encodeURIComponent(search)}` : '')
    ),
  message: (folder, uid) =>
    request(`/messages/${uid}?folder=${encodeURIComponent(folder)}`),
  setFlags: (folder, uid, flags) =>
    request(`/messages/${uid}/flags?folder=${encodeURIComponent(folder)}`, {
      method: 'POST',
      body: JSON.stringify(flags),
    }),
  remove: (folder, uid) =>
    request(`/messages/${uid}?folder=${encodeURIComponent(folder)}`, {
      method: 'DELETE',
    }),
  archive: (folder, uid) =>
    request(`/messages/${uid}/archive?folder=${encodeURIComponent(folder)}`, {
      method: 'POST',
    }),
  previews: (folder, items) =>
    request('/messages/preview', {
      method: 'POST',
      body: JSON.stringify({ folder, items }),
    }),
  send: (formData) => request('/send', { method: 'POST', body: formData }),

  // Programmation : envoi différé & snooze
  scheduleSend: (formData) =>
    request('/schedule/send', { method: 'POST', body: formData }),
  snooze: (folder, uid, returnAt, subject) =>
    request('/schedule/snooze', {
      method: 'POST',
      body: JSON.stringify({ folder, uid, returnAt, subject }),
    }),
  listScheduled: () => request('/schedule'),
  cancelScheduled: (id) => request(`/schedule/${id}`, { method: 'DELETE' }),

  attachmentUrl: (folder, uid, index, inline = false) =>
    `${BASE}/messages/${uid}/attachments/${index}?folder=${encodeURIComponent(
      folder
    )}${inline ? '&inline=1' : ''}`,
};
