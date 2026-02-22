import { Link } from "react-router-dom";
import type { EpochData } from "@/data/epochs";

interface EpochCardProps {
  epoch: EpochData;
  index: number;
}

const EpochCard = ({ epoch, index }: EpochCardProps) => {
  // Kolory tła dla poszczególnych epok
  const epochBackgrounds: Record<string, string> = {
    'antyk': '#edeff1',
    'sredniowiecze': '#e2e1df',
    'renesans': '#ccdecf'
  };

  // Kolory hover dla tekstu (mocniejsze odcienie tła)
  const epochHoverColors: Record<string, string> = {
    'antyk': '#000000',
    'sredniowiecze': '#000000',
    'renesans': '#000000'
  };

  const getCardStyle = () => {
    const backgroundColor = epochBackgrounds[epoch.id] || 'hsl(217, 91%, 60%)';
    
    return {
      backgroundColor,
    };
  };

  const getHoverStyle = () => {
    const hoverColor = epochHoverColors[epoch.id] || '#5a67d8';
    
    return {
      color: hoverColor,
    };
  };

  return (
    <Link
      to={`/epoka/${epoch.id}`}
      className="group block opacity-0 animate-fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <article 
        className="relative h-full overflow-hidden rounded-2xl border border-border p-6 transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 hover:border-primary/30"
        style={getCardStyle()}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl" role="img" aria-label={epoch.name}>
              {epoch.icon}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground font-body px-2 py-0.5 rounded-full bg-secondary">
              {epoch.period}
            </span>
          </div>

          <h3 className="font-display text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors" style={getHoverStyle()}>
            {epoch.name}
          </h3>

          <p className="text-sm text-muted-foreground font-body leading-relaxed line-clamp-2 flex-1">
            {epoch.shortDesc}
          </p>

          <div className="flex items-center gap-2 mt-4 text-sm font-body font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={getHoverStyle()}>
            Rozpocznij naukę
          </div>
        </div>
      </article>
    </Link>
  );
};

export default EpochCard;
