import { useState } from "react";
import type { Flashcard } from "@/data/flashcards";
import { RotateCcw, ChevronLeft, ChevronRight, Layers } from "lucide-react";

interface FlashcardsProps {
  cards: Flashcard[];
}

const Flashcards = ({ cards }: FlashcardsProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const current = cards[currentIndex];

  const handleFlip = () => setFlipped((f) => !f);

  const handlePrev = () => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : cards.length - 1));
    setFlipped(false);
  };

  const handleNext = () => {
    setCurrentIndex((i) => (i < cards.length - 1 ? i + 1 : 0));
    setFlipped(false);
  };

  return (
    <div>
      {/* Card */}
      <div
        onClick={handleFlip}
        className="relative w-full min-h-[240px] rounded-xl border border-border bg-card shadow-[var(--shadow-card)] cursor-pointer select-none transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] flex items-center justify-center p-8"
        style={{ perspective: "1000px" }}
      >
        <div className="absolute top-4 right-4 flex items-center gap-1 text-xs text-muted-foreground font-body">
          <Layers size={12} />
          {currentIndex + 1}/{cards.length}
        </div>

        <div className="absolute top-4 left-4">
          <span className={`text-[10px] uppercase tracking-widest font-body font-medium px-2 py-0.5 rounded-full ${flipped ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
            {flipped ? "Odpowiedź" : "Pytanie"}
          </span>
        </div>

        <div className="text-center max-w-lg">
          {!flipped ? (
            <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground leading-relaxed">
              {current.front}
            </h3>
          ) : (
            <p className="font-body text-base md:text-lg text-foreground leading-relaxed">
              {current.back}
            </p>
          )}
        </div>

        <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-muted-foreground font-body">
          Kliknij, aby {flipped ? "zobaczyć pytanie" : "odsłonić odpowiedź"}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-3 mt-5">
        <button
          onClick={handlePrev}
          className="p-2.5 rounded-lg border border-border bg-background hover:bg-secondary transition-colors text-foreground"
          aria-label="Poprzednia fiszka"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={handleFlip}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-secondary transition-colors text-sm font-body font-medium text-foreground"
        >
          <RotateCcw size={14} />
          Odwróć
        </button>
        <button
          onClick={handleNext}
          className="p-2.5 rounded-lg border border-border bg-background hover:bg-secondary transition-colors text-foreground"
          aria-label="Następna fiszka"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Flashcards;
