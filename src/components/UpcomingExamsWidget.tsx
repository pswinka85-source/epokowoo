import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, ChevronRight } from "lucide-react";
import { format, parseISO, isAfter } from "date-fns";
import { pl } from "date-fns/locale";

interface UpcomingExam {
  id: string;
  slot_date: string;
  slot_time: string;
  status: string;
}

const UpcomingExamsWidget = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<UpcomingExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcomingExams = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      const { data } = await supabase
        .from("exam_bookings")
        .select(`
          id,
          status,
          exam_availability!inner (
            slot_date,
            slot_time
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "scheduled")
        .gte("exam_availability.slot_date", today)
        .order("exam_availability(slot_date)", { ascending: true })
        .limit(3);

      if (data) {
        const mapped = data
          .map((booking: any) => ({
            id: booking.id,
            slot_date: booking.exam_availability.slot_date,
            slot_time: booking.exam_availability.slot_time,
            status: booking.status,
          }))
          .filter((exam) => {
            const examDateTime = new Date(`${exam.slot_date}T${exam.slot_time}`);
            return isAfter(examDateTime, new Date());
          })
          .slice(0, 3);

        setExams(mapped);
      }

      setLoading(false);
    };

    fetchUpcomingExams();
  }, [user]);

  if (!user || loading) return null;

  return (
    <div className="w-full flex flex-col bg-card rounded-3xl shadow-[var(--shadow-elevated)] border border-border/50 overflow-hidden animate-slide-in-sidebar mt-4">
      {/* Title */}
      <div className="px-6 pt-5 pb-2">
        <p className="text-xs font-bold tracking-normal text-muted-foreground">
          Nadchodzące egzaminy
        </p>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {exams.length === 0 ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar size={16} className="text-primary/60" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground/80">
                Brak zaplanowanych egzaminów
              </p>
              <Link
                to="/egzaminy"
                className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors mt-0.5"
              >
                Umów termin
                <ChevronRight size={10} />
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {exams.map((exam) => {
              const date = parseISO(exam.slot_date);
              const formattedDate = format(date, "d MMM", { locale: pl });
              const dayName = format(date, "EEEE", { locale: pl });
              const timeFormatted = exam.slot_time.slice(0, 5);

              return (
                <li
                  key={exam.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-primary uppercase leading-none">
                      {format(date, "MMM", { locale: pl })}
                    </span>
                    <span className="text-sm font-bold text-primary leading-none">
                      {format(date, "d")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground capitalize truncate">
                      {dayName}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock size={10} />
                      <span>{timeFormatted}</span>
                      <span className="text-muted-foreground/50">• 20 min</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {exams.length > 0 && (
          <Link
            to="/egzaminy"
            className="flex items-center justify-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 mt-3 py-2 rounded-xl hover:bg-secondary/50 transition-all"
          >
            Zobacz wszystkie
            <ChevronRight size={12} />
          </Link>
        )}
      </div>
    </div>
  );
};

export default UpcomingExamsWidget;
