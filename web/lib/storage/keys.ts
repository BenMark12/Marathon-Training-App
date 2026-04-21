export const planKey = (userId: string, planId: string) =>
  `users/${userId}/plans/${planId}.json`;

export const planIndexKey = (userId: string) =>
  `users/${userId}/plans-index.json`;

export const completionsKey = (userId: string, planId: string) =>
  `users/${userId}/completions/${planId}.json`;

export const stravaKey = (userId: string) => `users/${userId}/strava.json`;

export const preferencesKey = (userId: string) =>
  `users/${userId}/preferences.json`;

export const USERS_PREFIX = "users/";
