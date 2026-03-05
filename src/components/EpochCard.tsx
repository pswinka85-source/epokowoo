import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { EpochData } from "@/data/epochs";

interface EpochCardProps {
  epoch: EpochData;
  index: number;
}

const epochAccents: Record<string, string> = {
  antyk: "from-amber-500/20 to-orange-400/10",
  sredniowiecze: "from-stone-500/20 to-stone-400/10",
  renesans: "from-emerald-500/20 to-teal-400/10",
  barok: "from-red-500/20 to-rose-400/10",
  oswiecenie: "from-yellow-500/20 to-amber-400/10",
  romantyzm: "from-violet-500/20 to-purple-400/10",
  pozytywizm: "from-blue-500/20 to-sky-400/10",
  "mloda-polska": "from-pink-500/20 to-fuchsia-400/10",
  dwudziestolecie: "from-cyan-500/20 to-teal-400/10",
  "wspolczesnosc": "from-indigo-500/20 to-violet-400/10",
};

const EpochCard = ({ epoch, index }: EpochCardProps) => {
  const accent = epochAccents[epoch.id] || "from-primary/15 to-primary/5";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
    >
      <Link to={`/epoka/${epoch.id}`} className="group block h-full">
        <article
          className={`relative h-full overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br ${accent} backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-[var(--shadow-elevated)] hover:-translate-y-1.5 hover:border-primary/30`}
        >
          {/* Subtle corner glow on hover */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/0 group-hover:bg-primary/10 blur-2xl transition-all duration-500" />

          <div className="relative flex flex-col h-full">
            {/* Top row */}
            <div className="flex items-start justify-between mb-4">
              <span className="text-4xl drop-shadow-sm" role="img" aria-label={epoch.name}>
                {epoch.icon}
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-primary" />
              </span>
            </div>

            {/* Period badge */}
            <span className="inline-flex w-fit text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground font-body px-2.5 py-1 rounded-full bg-card/80 backdrop-blur-sm mb-3">
              {epoch.period}
            </span>

            <h3 className="font-display text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-200">
              {epoch.name}
            </h3>

            <p className="text-sm text-muted-foreground font-body leading-relaxed line-clamp-2 flex-1">
              {epoch.shortDesc}
            </p>

            <div className="flex items-center gap-1.5 mt-5 text-sm font-body font-semibold text-primary translate-x-0 group-hover:translate-x-1 transition-transform duration-300">
              Rozpocznij naukę
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
};

export default EpochCard;
