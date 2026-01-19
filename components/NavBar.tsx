"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const linkBaseClasses =
  "text-xs font-medium px-2 py-1 rounded-md transition-colors";

function linkClasses(active: boolean) {
  if (active) {
    return `${linkBaseClasses} bg-slate-100 text-slate-900`;
  }
  return `${linkBaseClasses} text-slate-200 hover:bg-slate-800`;
}

export function NavBar() {
  const pathname = usePathname();

  const isHome = pathname === "/" || pathname === "";
  const isPay = pathname === "/pay";
  const isInbox = pathname === "/inbox";
  const isSettings = pathname === "/settings";

  return (
    <header className="border-b border-slate-800 bg-slate-950/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-semibold text-slate-100">
          Privacy Pay (Devnet)
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/" className={linkClasses(isHome)}>
            Home
          </Link>
          {isPay && (
            <span className={linkClasses(true)}>
              Pay
            </span>
          )}
          <Link href="/inbox" className={linkClasses(isInbox)}>
            Inbox
          </Link>
          <Link href="/settings" className={linkClasses(isSettings)}>
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
}

