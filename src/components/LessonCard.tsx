import type { Lesson } from "@/data/lessons";
import { ChevronRight, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

interface LessonCardProps {
  lesson: Lesson;
  index: number;
  onClick: () => void;
  epochId?: string;
  bestScore?: { best_score: number; total_questions: number } | null;
}

const LessonCard = ({ lesson, index, onClick, epochId, bestScore }: LessonCardProps) => {
  const { isAdmin } = useAuth();

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-border bg-card p-5 hover:shadow-[var(--shadow-card-hover)] hover:border-primary/30 transition-all duration-200 group"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary font-display shrink-0">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-bold text-foreground group-hover:text-primary transition-colors truncate leading-tight">
            {lesson.title}
          </h3>
          <p className="text-sm text-muted-foreground font-body leading-relaxed line-clamp-1 mt-0.5">
            {lesson.description}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isAdmin && (
            <Link
              to={`/admin?epoch=${epochId || ''}&editLesson=${lesson.id}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="Edytuj lekcję"
            >
              <Pencil size={14} />
            </Link>
          )}
          <ChevronRight size={18} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </button>
  );
};

export default LessonCard;
