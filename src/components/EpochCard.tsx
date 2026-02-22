import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EpochData } from "@/data/epochs";

interface CardBackground {
  id: string;
  epoch_id: string;
  background_type: 'color' | 'image';
  background_value: string;
  is_active: boolean;
}

interface EpochCardProps {
  epoch: EpochData;
  index: number;
}

const EpochCard = ({ epoch, index }: EpochCardProps) => {
  const [cardBackground, setCardBackground] = useState<CardBackground | null>(null);

  useEffect(() => {
    const loadBackground = async () => {
      const { data, error } = await supabase
        .from("card_backgrounds")
        .select("*")
        .eq("epoch_id", epoch.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Error loading background:", error);
      } else if (data) {
        setCardBackground(data);
      }
    };

    loadBackground();
  }, [epoch.id]);

  const getCardStyle = () => {
    if (cardBackground) {
      if (cardBackground.background_type === 'color') {
        return {
          backgroundColor: cardBackground.background_value,
        };
      } else if (cardBackground.background_type === 'image') {
        return {
          backgroundImage: `url(${cardBackground.background_value})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        };
      }
    }
    
    // Domyślne tło
    return {
      backgroundColor: 'hsl(217, 91%, 60%)',
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

          <h3 className="font-display text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
            {epoch.name}
          </h3>

          <p className="text-sm text-muted-foreground font-body leading-relaxed line-clamp-2 flex-1">
            {epoch.shortDesc}
          </p>

          <div className="flex items-center gap-2 mt-4 text-sm font-body font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Rozpocznij naukę
          </div>
        </div>
      </article>
    </Link>
  );
};

export default EpochCard;
