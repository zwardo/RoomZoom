import { AppHeader } from "@/components/app-header";
import { getCurrentUser, toHeaderUser } from "@/lib/session";

export default async function StandardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <>
      <AppHeader user={toHeaderUser(user)} />
      <main className="mx-auto w-full max-w-7xl flex-1 py-6">{children}</main>
    </>
  );
}
