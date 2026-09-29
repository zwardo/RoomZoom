export const env = {
  demoMode: process.env.DEMO_MODE === "true",
  googleClientId: process.env.AUTH_GOOGLE_ID ?? "",
  googleClientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
  workspaceDomain: process.env.GOOGLE_WORKSPACE_DOMAIN?.trim() || undefined,
  serviceAccountKeyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE ?? "",
  adminImpersonateEmail: process.env.GOOGLE_ADMIN_IMPERSONATE_EMAIL ?? "",
  visionApiKey: process.env.GOOGLE_VISION_API_KEY ?? "",
  adminEmails: (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  floorChangePenaltyFt: Number(process.env.FLOOR_CHANGE_PENALTY_FT ?? 60),
};

export const googleConfigured = () => Boolean(env.googleClientId && env.googleClientSecret);

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];
