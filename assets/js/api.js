async function request(path, options = {}) {
  const headers = {
    "content-type": "application/json",
    ...(options.headers || {})
  };
  const response = await fetch(path, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (payload.ok === false || (!response.ok && payload.ok !== true)) {
    const message = payload.error?.message || `Erro HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.code = payload.error?.code;
    error.payload = payload;
    throw error;
  }
  return payload.data;
}

export const api = {
  health() {
    return request("/api/health");
  },
  createSession(body) {
    return request("/api/sessions", { method: "POST", body });
  },
  getSession(code, tokens = {}) {
    return request(`/api/sessions/${encodeURIComponent(code)}`, { headers: tokenHeaders(tokens) });
  },
  joinSession(code, body) {
    return request(`/api/sessions/${encodeURIComponent(code)}/join`, { method: "POST", body });
  },
  activity(code, body, instructorToken) {
    return request(`/api/sessions/${encodeURIComponent(code)}/activity`, {
      method: "POST",
      headers: tokenHeaders({ instructorToken }),
      body
    });
  },
  answer(code, body, teamToken) {
    return request(`/api/sessions/${encodeURIComponent(code)}/answer`, {
      method: "POST",
      headers: tokenHeaders({ teamToken }),
      body
    });
  },
  claim(code, body, teamToken) {
    return request(`/api/sessions/${encodeURIComponent(code)}/claim`, {
      method: "POST",
      headers: tokenHeaders({ teamToken }),
      body
    });
  },
  score(code, body, instructorToken) {
    return request(`/api/sessions/${encodeURIComponent(code)}/score`, {
      method: "POST",
      headers: tokenHeaders({ instructorToken }),
      body
    });
  },
  reset(code, instructorToken) {
    return request(`/api/sessions/${encodeURIComponent(code)}/reset`, {
      method: "POST",
      headers: tokenHeaders({ instructorToken }),
      body: {}
    });
  },
  finish(code, instructorToken) {
    return request(`/api/sessions/${encodeURIComponent(code)}/finish`, {
      method: "POST",
      headers: tokenHeaders({ instructorToken }),
      body: {}
    });
  },
  deleteSession(code, instructorToken) {
    return request(`/api/sessions/${encodeURIComponent(code)}`, {
      method: "DELETE",
      headers: tokenHeaders({ instructorToken })
    });
  }
};

function tokenHeaders(tokens = {}) {
  const headers = {};
  if (tokens.instructorToken) headers["x-instructor-token"] = tokens.instructorToken;
  if (tokens.teamToken) headers["x-team-token"] = tokens.teamToken;
  return headers;
}
