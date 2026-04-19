const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_KEY = 'marathon-strava';

// ===== localStorage helpers =====

export function loadStravaSettings() {
  try {
    const raw = localStorage.getItem(STRAVA_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}

export function saveStravaCredentials(clientId, clientSecret) {
  const existing = loadStravaSettings();
  localStorage.setItem(STRAVA_KEY, JSON.stringify({ ...existing, clientId, clientSecret }));
}

function saveStravaTokens(tokens) {
  const existing = loadStravaSettings();
  localStorage.setItem(STRAVA_KEY, JSON.stringify({ ...existing, ...tokens }));
}

export function disconnectStrava() {
  const { clientId, clientSecret } = loadStravaSettings();
  localStorage.setItem(STRAVA_KEY, JSON.stringify({ clientId, clientSecret }));
}

export function isStravaConnected() {
  const s = loadStravaSettings();
  return !!(s.accessToken && s.athlete);
}

export function getStravaAthlete() {
  return loadStravaSettings().athlete || null;
}

// ===== OAuth =====

export function stravaConnect() {
  const settings = loadStravaSettings();
  if (!settings.clientId || !settings.clientSecret) {
    alert('Please enter your Strava Client ID and Client Secret first, then save.');
    return;
  }
  const redirectUri = window.location.origin + window.location.pathname;
  const params = new URLSearchParams({
    client_id: settings.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'activity:read_all'
  });
  window.location.href = `${STRAVA_AUTH_URL}?${params}`;
}

export async function handleStravaCallback(code) {
  const settings = loadStravaSettings();
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      code,
      grant_type: 'authorization_code'
    })
  });
  if (!res.ok) throw new Error('Strava token exchange failed — check your Client ID and Secret.');
  const data = await res.json();
  saveStravaTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athlete: data.athlete
  });
  return data;
}

async function getValidToken() {
  const settings = loadStravaSettings();
  if (!settings.accessToken) return null;
  if (Date.now() / 1000 < settings.expiresAt - 60) return settings.accessToken;

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      refresh_token: settings.refreshToken,
      grant_type: 'refresh_token'
    })
  });
  if (!res.ok) throw new Error('Strava token refresh failed.');
  const data = await res.json();
  saveStravaTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athlete: settings.athlete
  });
  return data.access_token;
}

// ===== API =====

export async function fetchRecentActivities(afterTimestamp) {
  const token = await getValidToken();
  if (!token) return [];
  const res = await fetch(
    `${STRAVA_API_BASE}/athlete/activities?after=${afterTimestamp}&per_page=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('Failed to fetch Strava activities.');
  return res.json();
}

// ===== Sync =====

// Returns the number of sessions newly marked complete
export async function syncActivitiesToPlan(plan, completions, toggleCompletionFn) {
  if (!plan || !isStravaConnected()) return 0;

  const planStartTs = Math.floor(new Date(plan.days[0].date).getTime() / 1000);
  const activities = await fetchRecentActivities(planStartTs);

  const runActivities = activities.filter(a => a.type === 'Run');
  let newMatches = 0;

  plan.days.forEach((day, idx) => {
    if (!day.date || !day.focusArea || day.focusArea === 'Rest') return;
    if (completions[String(idx)]) return; // already marked complete

    const matched = runActivities.some(a => {
      const actDate = a.start_date_local.split('T')[0];
      return actDate === day.date;
    });

    if (matched) {
      toggleCompletionFn(idx);
      newMatches++;
    }
  });

  return newMatches;
}
