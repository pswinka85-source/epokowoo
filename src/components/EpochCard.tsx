import { Link } from "react-router-dom";
import type { EpochData } from "@/data/epochs";
import { ArrowRight } from "lucide-react";

interface EpochCardProps {
  epoch: EpochData;
  index: number;
}

const EpochCard = ({ epoch, index }: EpochCardProps) => {
  return (
    <Link
      to={`/epoka/${epoch.id}`}
      className="group block opacity-0 animate-fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <article className="relative h-full overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 hover:border-primary/30">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-primary opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="flex flex-col h-full p-6 pt-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-3xl" role="img" aria-label={epoch.name}>
              {epoch.icon}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground font-body px-2.5 py-1 rounded-full bg-secondary">
              {epoch.period}
            </span>
          </div>

          <h3 className="font-display text-lg font-bold text-foreground mb-2 group-hover:text-gradient-primary transition-colors">
            {epoch.name}
          </h3>

          <p className="text-sm text-muted-foreground font-body leading-relaxed line-clamp-2 flex-1">
            {epoch.shortDesc}
          </p>

          <div className="flex items-center gap-2 mt-4 text-xs font-body font-semibold text-primary opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
            Rozpocznij naukę
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </article>
    </Link>
  );
};

export default EpochCard;
