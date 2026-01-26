"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletStatus } from "@/components/WalletStatus";
import { LayoutDashboard, Inbox, Settings } from "lucide-react";

const linkBaseClasses =
  "text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200 border border-transparent";

function linkClasses(active: boolean) {
  if (active) {
    return `${linkBaseClasses} bg-slate-900 border-slate-700 text-solana-green shadow-[0_0_10px_-2px_rgba(20,241,149,0.3)]`;
  }
  return `${linkBaseClasses} text-slate-400 hover:text-white hover:border-slate-800 hover:bg-slate-900/50`;
}

function MobileNavLink({ href, active, icon: Icon, label }: { href: string, active: boolean, icon: any, label: string }) {
    return (
        <Link 
            href={href} 
            className={`flex flex-col items-center justify-center w-full py-2 transition-colors ${
                active ? 'text-solana-green' : 'text-slate-400 hover:text-slate-200'
            }`}
        >
            <Icon className={`w-5 h-5 mb-0.5 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-[10px] font-medium">{label}</span>
        </Link>
    )
}

export function NavBar() {
  const pathname = usePathname();

  const isDashboard = pathname === "/dashboard";
  const isPay = pathname === "/pay";
  const isInbox = pathname === "/inbox";
  const isSettings = pathname === "/settings";

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
      <div className="flex w-full items-center justify-between px-4 py-3 md:px-8 md:py-4">
        <Link 
          href="/" 
          className="text-lg font-bold tracking-tight bg-gradient-to-r from-solana-purple to-solana-green bg-clip-text text-transparent hover:opacity-80 transition-opacity"
        >
          Cipher Pay <span className="hidden sm:inline text-xs font-mono text-slate-500 ml-1">(Devnet)</span>
        </Link>
        <nav className="hidden md:flex items-center gap-2">
          <Link href="/dashboard" className={linkClasses(isDashboard)}>
            Dashboard
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
        <div className="ml-4">
          <WalletStatus />
        </div>
      </div>
    </header>

    {/* Mobile Bottom Navigation */}
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
            <MobileNavLink href="/dashboard" active={isDashboard} icon={LayoutDashboard} label="Dashboard" />
            <MobileNavLink href="/inbox" active={isInbox} icon={Inbox} label="Inbox" />
            <MobileNavLink href="/settings" active={isSettings} icon={Settings} label="Settings" />
        </div>
    </nav>
    </>
  );
}

