import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, User, CreditCard, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<ExamAvailability[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loadingSlots, setLoadingSlots] = useState(false);

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

  // Ładowanie dostępnych slotów dla wybranego dnia
  useEffect(() => {
    if (!selectedDate) return;
    
    const loadAvailableSlots = async () => {
      setLoadingSlots(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const { data } = await supabase
        .from("exam_availability")
        .select("*")
        .eq("status", "available")
        .eq("slot_date", dateStr)
        .order("slot_time", { ascending: true });

      setAvailableSlots(data || []);
      setLoadingSlots(false);
    };

    loadAvailableSlots();
  }, [selectedDate]);

  // Generowanie dni kalendarza
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Dodaj puste dni na początku
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Dodaj dni miesiąca
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const handleDateSelect = (date: Date) => {
    // Nie pozwól wybrać daty z przeszłości
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      toast.error("Nie można wybrać daty z przeszłości");
      return;
    }
    setSelectedDate(date);
  };

  const handleSlotSelect = async (slot: ExamAvailability) => {
    if (!user) return;
    setPurchasing(true);

    // Sprawdź czy użytkownik nie ma już aktywnego egzaminu
    const { data: activeBooking } = await supabase
      .from("exam_bookings")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "scheduled")
      .maybeSingle();

    if (activeBooking) {
      toast.error("Masz już aktywny egzamin. Zakończ go przed zakupem kolejnego.");
      setPurchasing(false);
      return;
    }

    // Dodaj rezerwację
    const { data: booking, error: insertErr } = await supabase.from("exam_bookings").insert({
      user_id: user.id,
      availability_id: slot.id,
      status: "scheduled",
      amount_pln: EXAM_PRICE,
      payment_reference: `ex-${Date.now()}`,
    }).select().single();

    if (insertErr || !booking) {
      console.error("Insert error:", insertErr);
      toast.error("Błąd zakupu. Spróbuj ponownie.");
      setPurchasing(false);
      return;
    }

    // Zaktualizuj status terminu
    const { error: updateErr } = await supabase
      .from("exam_availability")
      .update({ status: "booked" })
      .eq("id", slot.id);

    if (updateErr) {
      console.error("Update error:", updateErr);
      toast.error("Błąd podczas rezerwacji terminu. Skontaktuj się z obsługą.");
      setPurchasing(false);
      return;
    }

    toast.success(`Egzamin wykupiony! Termin: ${new Date(slot.slot_date).toLocaleDateString('pl-PL')} o ${slot.slot_time.slice(0, 5)}`);
    setPurchasing(false);

    // Przeładuj dane
    window.location.reload();
  };

  const changeMonth = (direction: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1));
    setSelectedDate(null);
    setAvailableSlots([]);
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

  const monthYear = currentMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth(currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-slate-50/30 dark:to-slate-900/30">
      <header className="relative overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-br from-accent/20 to-accent/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative max-w-6xl mx-auto px-8 pt-12 pb-10 md:pt-20 md:pb-14">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl md:text-5xl font-extrabold text-foreground leading-[1.1] mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Zapisz się!✨
            </h1>
            <div className="max-w-2xl mx-auto">
              <p className="text-xl text-muted-foreground font-body leading-relaxed">
                Egzamin z egzaminatorem – 20 minut, {EXAM_PRICE} zł
              </p>
              <div className="flex items-center justify-center gap-8 mt-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Dostępne terminy</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>20 minut</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard size={16} />
                  <span>{EXAM_PRICE} zł</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 pb-16">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Kalendarz */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl bg-gradient-to-br from-card to-card/50 backdrop-blur-xl border border-border/30 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.15)] transition-all duration-300">
              <div className="px-8 py-6 border-b border-border/20 bg-gradient-to-r from-slate-50/50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/50">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-foreground">
                    Wybierz termin egzaminu
                  </h2>
                  <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 rounded-xl p-1">
                    <button
                      onClick={() => changeMonth(-1)}
                      className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 hover:scale-105"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="font-semibold text-sm min-w-[140px] text-center">
                      {monthYear}
                    </span>
                    <button
                      onClick={() => changeMonth(1)}
                      className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 hover:scale-105"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                {/* Dni tygodnia */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['N', 'P', 'W', 'Ś', 'C', 'P', 'S'].map(day => (
                    <div key={day} className="text-center text-sm font-bold text-muted-foreground py-3">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Dni miesiąca */}
                <div className="grid grid-cols-7 gap-2 mb-8">
                  {days.map((day, index) => (
                    <div key={index} className="aspect-square">
                      {day && (
                        <button
                          onClick={() => handleDateSelect(day)}
                          disabled={day < today}
                          className={`w-full h-full rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-200 hover:scale-105 ${
                            day < today
                              ? 'text-muted-foreground/20 cursor-not-allowed bg-slate-50/30'
                              : selectedDate?.toDateString() === day.toDateString()
                              ? 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg scale-105'
                              : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 shadow-sm'
                          }`}
                        >
                          {day.getDate()}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Wybrane godziny */}
                {selectedDate && (
                  <div className="pt-8 border-t border-border/20">
                    <div className="text-center mb-6">
                      <h3 className="font-bold text-xl text-foreground mb-2">
                        Dostępne godziny
                      </h3>
                      <p className="text-muted-foreground">
                        {selectedDate.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                          <Calendar size={32} className="text-muted-foreground/50" />
                        </div>
                        <p className="text-muted-foreground font-medium">
                          Brak dostępnych terminów w tym dniu
                        </p>
                        <p className="text-sm text-muted-foreground/70 mt-2">
                          Spróbuj wybrać inny dzień
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => handleSlotSelect(slot)}
                            disabled={purchasing}
                            className="group relative p-4 rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border border-border/30 shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-200 overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                            <Clock size={20} className="mx-auto mb-2 text-primary" />
                            <div className="font-bold text-foreground relative z-10">
                              {formatTime(slot.slot_time)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 relative z-10">
                              Kliknij aby zarezerwować
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Moje egzaminy */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl bg-gradient-to-br from-card to-card/50 backdrop-blur-xl border border-border/30 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden">
              <div className="px-8 py-6 border-b border-border/20 bg-gradient-to-r from-slate-50/50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/50">
                <h2 className="font-display text-xl font-bold text-foreground">
                  Moje egzaminy
                </h2>
              </div>
              <div className="p-8">
                {bookings.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary/30 to-secondary/10 flex items-center justify-center mx-auto mb-6">
                      <Calendar size={32} className="text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground font-medium mb-2">
                      Nie masz jeszcze wykupionych egzaminów
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      Wybierz termin w kalendarzu
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((b) => (
                      <div
                        key={b.id}
                        className="group p-6 rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border border-border/30 shadow-sm hover:shadow-lg transition-all duration-200"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary flex items-center justify-center shrink-0">
                            <CheckCircle size={24} />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-foreground mb-2">
                              {b.exam_availability && formatDate(b.exam_availability.slot_date)}
                            </p>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <Clock size={14} />
                                {b.exam_availability && formatTime(b.exam_availability.slot_time)}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <User size={14} />
                                {b.examiner_name}
                              </p>
                            </div>
                          </div>
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
