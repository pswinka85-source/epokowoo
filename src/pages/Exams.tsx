import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, User, CreditCard, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface ExamAvailability {
  id: string;
  examiner_id: string;
  slot_date: string;
  slot_time: string;
  status: string;
}

interface ExamBooking {
  id: string;
  user_id: string;
  availability_id: string;
  status: string;
  amount_pln: number;
  created_at: string;
  exam_availability?: {
    slot_date: string;
    slot_time: string;
    examiner_id: string;
  };
}

interface Profile {
  user_id: string;
  display_name: string | null;
}

const EXAM_PRICE = 19.99;
const EXAM_DURATION_MIN = 20;

const Exams = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [purchasing, setPurchasing] = useState(false);
  const [bookings, setBookings] = useState<(ExamBooking & { examiner_name?: string })[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const loadBookings = async () => {
      const { data } = await supabase
        .from("exam_bookings")
        .select(`
          *,
          exam_availability (slot_date, slot_time, examiner_id)
        `)
        .eq("user_id", user.id)
        .in("status", ["scheduled", "completed"])
        .order("created_at", { ascending: false });

      if (!data?.length) {
        setBookings([]);
        return;
      }

      const examinerIds = [...new Set(data.flatMap((b: any) => b.exam_availability?.examiner_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", examinerIds);

      const profileMap = new Map((profiles as Profile[])?.map((p) => [p.user_id, p.display_name || "Egzaminator"]) || []);

      setBookings(
        data.map((b: any) => ({
          ...b,
          examiner_name: b.exam_availability?.examiner_id
            ? profileMap.get(b.exam_availability.examiner_id) || "Egzaminator"
            : "Egzaminator",
        }))
      );
    };
    loadBookings();
  }, [user]);

  const handlePurchase = async () => {
    if (!user) return;
    setPurchasing(true);

    const { data: slot } = await supabase
      .from("exam_availability")
      .select("id")
      .eq("status", "available")
      .gte("slot_date", new Date().toISOString().slice(0, 10))
      .order("slot_date", { ascending: true })
      .order("slot_time", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!slot) {
      toast.error("Brak dostępnych terminów. Spróbuj później.");
      setPurchasing(false);
      return;
    }

    const { error: insertErr } = await supabase.from("exam_bookings").insert({
      user_id: user.id,
      availability_id: slot.id,
      status: "scheduled",
      amount_pln: EXAM_PRICE,
      payment_reference: `ex-${Date.now()}`,
    });

    if (insertErr) {
      toast.error("Błąd zakupu. Spróbuj ponownie.");
      setPurchasing(false);
      return;
    }

    await supabase.from("exam_availability").update({ status: "booked" }).eq("id", slot.id);

    toast.success("Egzamin wykupiony! Sprawdź szczegóły poniżej.");
    setPurchasing(false);

    window.location.reload();
  };

  if (authLoading || !user) return null;

  const formatDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("pl-PL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const formatTime = (t: string) => t.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <header className="relative overflow-hidden">
        <div className="absolute top-10 left-5 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-5 right-10 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-8 md:pt-14 md:pb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Egzaminy
            </h1>
          </div>
          <p className="text-muted-foreground font-body text-sm sm:text-base">
            Egzamin z egzaminatorem – 20 minut, {EXAM_PRICE} zł
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Karta zakupu */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)] overflow-hidden">
              <div className="px-6 py-4 border-b border-border/60 bg-slate-50/50 dark:bg-slate-900/30">
                <h2 className="font-display font-semibold text-foreground">
                  Kup egzamin
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Clock size={18} />
                  <span>Egzamin trwa {EXAM_DURATION_MIN} minut</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <User size={18} />
                  <span>Data i godzina wybierane przez egzaminatora</span>
                </div>
                <div className="flex items-center gap-3 font-semibold text-foreground">
                  <CreditCard size={18} className="text-primary" />
                  <span>{EXAM_PRICE} zł</span>
                </div>
                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-body font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {purchasing ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      <CreditCard size={18} />
                      Kup egzamin
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Moje egzaminy */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)] overflow-hidden">
              <div className="px-6 py-4 border-b border-border/60 bg-slate-50/50 dark:bg-slate-900/30">
                <h2 className="font-display font-semibold text-foreground">
                  Moje egzaminy
                </h2>
              </div>
              <div className="p-6">
                {bookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                      <Calendar size={28} className="text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Nie masz jeszcze wykupionych egzaminów
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Kliknij „Kup egzamin”, aby zarezerwować termin
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-start gap-4 p-4 rounded-xl border border-border/60 bg-slate-50/30 dark:bg-slate-900/20"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <CheckCircle size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {b.exam_availability && formatDate(b.exam_availability.slot_date)}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Godzina:{" "}
                            {b.exam_availability &&
                              formatTime(b.exam_availability.slot_time)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Egzaminator: {b.examiner_name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Exams;
