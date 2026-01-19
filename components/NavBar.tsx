"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const linkBaseClasses =
  "text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200 border border-transparent";

function linkClasses(active: boolean) {
  if (active) {
    return `${linkBaseClasses} bg-slate-900 border-slate-700 text-solana-green shadow-[0_0_10px_-2px_rgba(20,241,149,0.3)]`;
  }
  return `${linkBaseClasses} text-slate-400 hover:text-white hover:border-slate-800 hover:bg-slate-900/50`;
}

export function NavBar() {
  const pathname = usePathname();

  const isHome = pathname === "/" || pathname === "";
  const isPay = pathname === "/pay";
  const isInbox = pathname === "/inbox";
  const isSettings = pathname === "/settings";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link 
          href="/" 
          className="text-lg font-bold tracking-tight bg-gradient-to-r from-solana-purple to-solana-green bg-clip-text text-transparent hover:opacity-80 transition-opacity"
        >
          Cipher Pay <span className="text-xs font-mono text-slate-500 ml-1">(Devnet)</span>
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

