import NextAuth, { type NextAuthConfig } from "next-auth";

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

const strava = {
  id: "strava",
  name: "Strava",
  type: "oauth",
  authorization: {
    url: STRAVA_AUTH_URL,
    params: { scope: "activity:read_all", approval_prompt: "auto" },
  },
  token: STRAVA_TOKEN_URL,
  userinfo: "https://www.strava.com/api/v3/athlete",
  clientId: process.env.STRAVA_CLIENT_ID,
  clientSecret: process.env.STRAVA_CLIENT_SECRET,
  checks: ["state"],
  profile(profile: {
    id: number;
    firstname?: string;
    lastname?: string;
    profile?: string;
    profile_medium?: string;
  }) {
    return {
      id: String(profile.id),
      name: [profile.firstname, profile.lastname].filter(Boolean).join(" "),
      image: profile.profile_medium || profile.profile || null,
    };
  },
} as const;

export const authConfig = {
  providers: [strava as never],
  callbacks: {
    jwt({ token, account, profile }) {
      if (account && profile?.id != null) {
        token.athleteId = String(profile.id);
        token.stravaAccessToken = account.access_token;
        token.stravaRefreshToken = account.refresh_token;
        token.stravaExpiresAt = account.expires_at;
      }
      return token;
    },
    session({ session, token }) {
      if (token.athleteId) {
        session.user.athleteId = token.athleteId as string;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isProtected = request.nextUrl.pathname.startsWith("/dashboard");
      if (!isProtected) return true;
      return !!auth?.user;
    },
  },
  pages: { signIn: "/" },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
