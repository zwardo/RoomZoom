import { redirect } from "next/navigation";
import { auth, type AuthProviderKind } from "@/auth";
import { env } from "@/lib/env";

export interface CurrentUser {
  email: string;
  name: string | null;
  image: string | null;
  provider: AuthProviderKind;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!session || !email) return null;
  return { email, name: session.user?.name ?? null, image: session.user?.image ?? null, provider: session.provider };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

export function isAdmin(user: CurrentUser | null) {
  if (!user) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return env.adminEmails.includes(user.email);
}

export function toHeaderUser(user: CurrentUser | null) {
  if (!user) return null;
  return { email: user.email, name: user.name, image: user.image, isDemo: user.provider === "demo", isAdmin: isAdmin(user) };
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Wraps an API route handler with auth + consistent JSON errors. */
export function apiHandler<Ctx>(
  handler: (req: Request, user: CurrentUser, ctx: Ctx) => Promise<Response>,
  opts: { admin?: boolean } = {},
) {
  return async (req: Request, ctx: Ctx) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new HttpError(401, "Sign in required");
      if (opts.admin && !isAdmin(user)) throw new HttpError(403, "Admin only");
      return await handler(req, user, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  const googleStatus = getGoogleErrorStatus(err);
  if (googleStatus) {
    const message =
      googleStatus === 401
        ? "Your Google session expired. Sign out and sign in again."
        : googleStatus === 403
          ? "Google denied access. Check the app's scopes or your room permissions."
          : "Google Calendar request failed.";
    console.error("[google]", err);
    return Response.json({ error: message }, { status: googleStatus === 401 ? 401 : 502 });
  }
  console.error(err);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

function getGoogleErrorStatus(err: unknown): number | null {
  if (typeof err === "object" && err && "code" in err && "config" in err) {
    const code = Number((err as { code: unknown }).code);
    return Number.isFinite(code) ? code : null;
  }
  return null;
}
