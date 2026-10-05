import { LogOut, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type * as React from "react";
import { signOutAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";

export interface HeaderUser {
  email: string;
  name: string | null;
  image: string | null;
  isDemo: boolean;
  isAdmin: boolean;
}

function initials(user: HeaderUser) {
  const source = user.name?.trim() || user.email;
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** Figma "Header": ROOMZOOM wordmark, optional chips (e.g. steps today), and the account menu. */
export function AppHeader({ user, extra }: { user: HeaderUser | null; extra?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-4 rounded-xl bg-rooms-xdark px-6 py-5">
      <Link href="/" className="rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <Image src="/brand/roomzoom-logo.svg" alt="RoomZoom" width={178} height={20} priority />
      </Link>
      {user && (
        <div className="flex items-center gap-8">
          {extra}
          <details className="group relative">
            <Tooltip content={user.name ? `${user.name} (${user.email})` : user.email} side="bottom" align="end">
              <summary
                className="block cursor-pointer list-none rounded-md border-2 border-rooms-light p-px focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-rooms-xdark focus-visible:outline-none [&::-webkit-details-marker]:hidden"
                aria-label="Account menu"
              >
                {user.image ? (
                  <Image src={user.image} alt="" width={28} height={28} unoptimized className="size-7 rounded-sm object-cover" />
                ) : (
                  <span className="flex size-7 items-center justify-center rounded-sm bg-rooms-light/30 text-xs font-semibold text-rooms-light">
                    {initials(user)}
                  </span>
                )}
              </summary>
            </Tooltip>
            <div className="absolute top-full right-0 z-50 mt-2 flex w-64 flex-col gap-1 rounded-lg border border-rooms-light/30 bg-rooms-dark p-2 text-sm shadow-2xl shadow-black/50">
              <div className="flex flex-col gap-1 px-2 py-1.5">
                {user.name && <span className="font-semibold text-rooms-xpale">{user.name}</span>}
                <span className="truncate text-xs text-rooms-xlight">{user.email}</span>
                {user.isDemo && (
                  <Badge variant="warning" className="self-start">
                    Demo calendar
                  </Badge>
                )}
              </div>
              {user.isAdmin && (
                <Link href="/admin" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-rooms-light hover:bg-rooms-light/20">
                  <Settings className="size-4" aria-hidden />
                  Admin
                </Link>
              )}
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-rooms-light hover:bg-rooms-light/20"
                >
                  <LogOut className="size-4" aria-hidden />
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </div>
      )}
    </header>
  );
}
