import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import { env, GOOGLE_SCOPES, googleConfigured } from "@/lib/env";

export type AuthProviderKind = "google" | "demo";

declare module "next-auth" {
  interface Session {
    provider: AuthProviderKind;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    provider?: AuthProviderKind;
  }
}

export const DEMO_USER = {
  id: "demo-user",
  email: "demo.user@roomzoom.dev",
  name: "Demo User",
};

const providers: NextAuthConfig["providers"] = [];

if (googleConfigured()) {
  providers.push(
    Google({
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
      authorization: {
        params: {
          scope: GOOGLE_SCOPES.join(" "),
          // offline + consent guarantees a refresh token on every sign-in.
          access_type: "offline",
          prompt: "consent",
          ...(env.workspaceDomain ? { hd: env.workspaceDomain } : {}),
        },
      },
    }),
  );
}

if (env.demoMode) {
  providers.push(
    Credentials({
      id: "demo",
      name: "Demo user",
      credentials: {},
      authorize: async () => DEMO_USER,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      if (!profile?.email || profile.email_verified === false) return false;
      if (env.workspaceDomain) {
        const domain = profile.email.split("@")[1]?.toLowerCase();
        if (domain !== env.workspaceDomain.toLowerCase()) return false;
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === "google" && account.access_token) {
        const email = (profile?.email ?? token.email ?? "").toLowerCase();
        const expiresAt = account.expires_at ? BigInt(account.expires_at * 1000) : null;
        await db.googleAccount.upsert({
          where: { email },
          create: {
            email,
            accessToken: account.access_token,
            refreshToken: account.refresh_token ?? null,
            expiresAt,
            scope: account.scope ?? null,
          },
          update: {
            accessToken: account.access_token,
            // Keep the previous refresh token if Google didn't send a new one.
            ...(account.refresh_token ? { refreshToken: account.refresh_token } : {}),
            expiresAt,
            scope: account.scope ?? null,
          },
        });
        token.provider = "google";
      } else if (account?.provider === "demo") {
        token.provider = "demo";
      }
      return token;
    },
    async session({ session, token }) {
      session.provider = token.provider ?? "demo";
      return session;
    },
  },
});
