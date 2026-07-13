const INSTRUCTOR_KEY = "arena-sl-instructor-sessions";
const TEAM_KEY = "arena-sl-team-credentials";

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function saveInstructorSession(code, token) {
  const sessions = read(INSTRUCTOR_KEY, {});
  sessions[code] = { token, savedAt: new Date().toISOString() };
  write(INSTRUCTOR_KEY, sessions);
}

export function getInstructorToken(code) {
  return read(INSTRUCTOR_KEY, {})[code]?.token || "";
}

export function removeInstructorSession(code) {
  const sessions = read(INSTRUCTOR_KEY, {});
  delete sessions[code];
  write(INSTRUCTOR_KEY, sessions);
}

export function saveTeamCredential(code, teamId, token) {
  const credentials = read(TEAM_KEY, {});
  credentials[code] = { teamId, token, savedAt: new Date().toISOString() };
  write(TEAM_KEY, credentials);
}

export function getTeamCredential(code) {
  return read(TEAM_KEY, {})[code] || null;
}

export function clearTeamCredential(code) {
  const credentials = read(TEAM_KEY, {});
  delete credentials[code];
  write(TEAM_KEY, credentials);
}
