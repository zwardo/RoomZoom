import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { env, googleConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentUser()) redirect("/");
  const { error } = await searchParams;
  const hasGoogle = googleConfigured();

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Sign in to RoomZoom</CardTitle>
          <CardDescription>
            See your upcoming meetings and book a room close to your desk.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error && (
            <Alert variant="error">
              {error === "AccessDenied"
                ? `Use your ${env.workspaceDomain ?? "work"} Google account.`
                : "Sign-in failed. Try again."}
            </Alert>
          )}
          {hasGoogle && (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="solid" className="w-full">
                Continue with Google
              </Button>
            </form>
          )}
          {env.demoMode && (
            <form
              action={async () => {
                "use server";
                await signIn("demo", { redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="outline" className="w-full">
                Continue as demo user
              </Button>
            </form>
          )}
          {!hasGoogle && !env.demoMode && (
            <Alert variant="error">
              No sign-in method is configured. Set <code>AUTH_GOOGLE_ID</code>/<code>AUTH_GOOGLE_SECRET</code> or{" "}
              <code>DEMO_MODE=true</code> in <code>.env.local</code>.
            </Alert>
          )}
          {!hasGoogle && env.demoMode && (
            <p className="text-xs text-muted-foreground">
              Google sign-in appears once OAuth credentials are added. See <code>docs/google-setup.md</code>.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
