export function query() {
  return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

export function replaceQuery(values) {
  const url = new URL(window.location.href);
  Object.entries(values).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  });
  window.history.replaceState({}, "", url.toString());
}
