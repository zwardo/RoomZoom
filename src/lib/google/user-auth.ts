import { google } from "googleapis";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { HttpError } from "@/lib/session";

/**
 * OAuth2 client for a signed-in user. googleapis refreshes the access token
 * automatically when a refresh token is present; new tokens are persisted.
 */
export async function getUserAuth(email: string) {
  const account = await db.googleAccount.findUnique({ where: { email } });
  if (!account) throw new HttpError(401, "Google account not linked. Sign out and sign in with Google.");

  const client = new google.auth.OAuth2(env.googleClientId, env.googleClientSecret);
  client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken ?? undefined,
    expiry_date: account.expiresAt ? Number(account.expiresAt) : undefined,
  });

  client.on("tokens", (tokens) => {
    if (!tokens.access_token) return;
    db.googleAccount
      .update({
        where: { email },
        data: {
          accessToken: tokens.access_token,
          ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
          expiresAt: tokens.expiry_date ? BigInt(tokens.expiry_date) : null,
        },
      })
      .catch((err) => console.error("[google] failed to persist refreshed token", err));
  });

  return client;
}
