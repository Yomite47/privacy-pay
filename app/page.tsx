import Link from "next/link";
import { ArrowRight, Shield, Lock, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white selection:bg-solana-green selection:text-black">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center max-w-4xl px-6 pt-32 pb-16 space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-solana-purple">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-solana-purple opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-solana-purple"></span>
          </span>
          Live on Solana Devnet
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
          Privacy on Solana, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-solana-green to-solana-purple">
            Simplified.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed">
          Shield your assets with Zero-Knowledge Compression. Send end-to-end encrypted memos. 
          Experience the future of private payments on Solana without the complexity.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Link
            href="/dashboard"
            className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white transition-all duration-200 bg-white/10 border border-white/10 rounded-full hover:bg-white/20 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-solana-green focus:ring-offset-black"
          >
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-solana-purple/20 to-solana-green/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
            <span className="relative flex items-center gap-2">
              Use Tech Now
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
          
          <Link
            href="https://github.com/yomite47/privacy-pay"
            target="_blank"
            className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-slate-300 transition-all duration-200 bg-transparent border border-slate-800 rounded-full hover:text-white hover:border-slate-600 focus:outline-none"
          >
            View Code
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl px-6 py-24 w-full">
        <FeatureCard
          icon={<Shield className="w-6 h-6 text-solana-green" />}
          title="Shielded Accounts"
          description="Convert public SOL into private, ZK-compressed SOL. Your balance is stored in a compressed state tree, visible only to you."
        />
        <FeatureCard
          icon={<Lock className="w-6 h-6 text-solana-purple" />}
          title="Encrypted Memos"
          description="Attach private notes to payments. Encrypted client-side using your wallet signature, ensuring only the recipient can read them."
        />
        <FeatureCard
          icon={<Zap className="w-6 h-6 text-yellow-400" />}
          title="Light Speed"
          description="Powered by Light Protocol and Helius. Enjoy the speed of Solana with the privacy of Zero-Knowledge proofs."
        />
      </div>

      {/* Tech Stack Footer */}
      <div className="mt-auto py-12 text-center text-slate-500 text-sm">
        <p>Built for the Solana Renaissance Hackathon 2026</p>
        <div className="flex justify-center gap-4 mt-4">
          <span className="hover:text-white transition-colors cursor-default">Light Protocol</span>
          <span>•</span>
          <span className="hover:text-white transition-colors cursor-default">Helius</span>
          <span>•</span>
          <span className="hover:text-white transition-colors cursor-default">Next.js</span>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group relative p-8 rounded-3xl bg-slate-900/50 border border-white/5 hover:border-white/10 transition-colors">
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
      <div className="relative space-y-4">
        <div className="inline-flex p-3 rounded-xl bg-black border border-white/10">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <p className="text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
