import NextAuth, { type NextAuthConfig } from "next-auth";
import { saveStravaTokens } from "@/lib/storage/strava";

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
  client: { token_endpoint_auth_method: "client_secret_post" },
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
      const { pathname } = request.nextUrl;
      const isProtected =
        pathname.startsWith("/dashboard") || pathname.startsWith("/plans");
      if (!isProtected) return true;
      return !!auth?.user;
    },
  },
  events: {
    async signIn({ account, profile }) {
      if (!account || !profile || profile.id == null) return;
      if (
        !account.access_token ||
        !account.refresh_token ||
        account.expires_at == null
      ) {
        return;
      }
      const athleteId = String(profile.id);
      try {
        await saveStravaTokens(athleteId, {
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          athleteId,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        // Log but don't block sign-in — the user can reconnect later.
        console.error("[auth] failed to persist Strava tokens", err);
      }
    },
  },
  pages: { signIn: "/" },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
