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
  payment_reference?: string;
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
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Funkcja testowa do sprawdzania i tworzenia przykładowych terminów
  const createSampleSlots = async () => {
    if (!user) return;
    
    try {
      // Sprawdź czy użytkownik jest adminem
      const { data: adminCheck } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!adminCheck) {
        toast.error("Tylko admin może tworzyć przykładowe terminy");
        return;
      }

      // Dodaj kilka przykładowych terminów na najbliższe dni
      const sampleSlots = [];
      const today = new Date();
      
      for (let i = 1; i <= 5; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        sampleSlots.push({
          examiner_id: user.id,
          slot_date: dateStr,
          slot_time: `${9 + i}:00`,
          status: "available"
        });
      }

      const { error } = await supabase
        .from("exam_availability")
        .insert(sampleSlots);

      if (error) {
        console.error("Error creating sample slots:", error);
        toast.error(`Błąd tworzenia terminów: ${error.message}`);
      } else {
        toast.success("Dodano 5 przykładowych terminów");
        if (selectedDate) {
          // Przeładuj dostępne sloty dla wybranego dnia
          const dateStr = selectedDate.toISOString().split('T')[0];
          const { data } = await supabase
            .from("exam_availability")
            .select("*")
            .eq("status", "available")
            .eq("slot_date", dateStr)
            .order("slot_time", { ascending: true });
          setAvailableSlots(data || []);
        }
      }
    } catch (error) {
      console.error("Error in createSampleSlots:", error);
      toast.error("Wystąpił błąd");
    }
  };

  // Funkcja do sprawdzania stanu bazy danych
  const checkDatabaseState = async () => {
    try {
      const { data: allSlots, error: slotsError } = await supabase
        .from("exam_availability")
        .select("*")
        .limit(10);

      const { data: myBookings, error: bookingsError } = await supabase
        .from("exam_bookings")
        .select("*")
        .eq("user_id", user.id);

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      setDebugInfo(`
        Dostępne terminy: ${allSlots?.length || 0}
        Twoje rezerwacje: ${myBookings?.length || 0}
        Twoja rola: ${userRole?.role || 'brak'}
        Błąd slotów: ${slotsError?.message || 'brak'}
        Błąd rezerwacji: ${bookingsError?.message || 'brak'}
      `);
    } catch (error) {
      setDebugInfo(`Błąd sprawdzania: ${error}`);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const loadBookings = async () => {
      try {
        const { data, error } = await supabase
          .from("exam_bookings")
          .select(`
            *,
            exam_availability (slot_date, slot_time, examiner_id)
          `)
          .eq("user_id", user.id)
          .in("status", ["scheduled", "completed"])
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading bookings:", error);
          setBookings([]);
          return;
        }

        if (!data?.length) {
          setBookings([]);
          return;
        }

        const examinerIds = [...new Set(data.flatMap((b: any) => b.exam_availability?.examiner_id).filter(Boolean))];
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", examinerIds);

        if (profileError) {
          console.error("Error loading profiles:", profileError);
        }

        const profileMap = new Map((profiles as Profile[])?.map((p) => [p.user_id, p.display_name || "Egzaminator"]) || []);

        setBookings(
          data.map((b: any) => ({
            ...b,
            examiner_name: b.exam_availability?.examiner_id
              ? profileMap.get(b.exam_availability.examiner_id) || "Egzaminator"
              : "Egzaminator",
          }))
        );
      } catch (error) {
        console.error("Unexpected error loading bookings:", error);
        setBookings([]);
      }
    };
    loadBookings();
  }, [user]);

  // Ładowanie dostępnych slotów dla wybranego dnia
  useEffect(() => {
    if (!selectedDate) return;
    
    const loadAvailableSlots = async () => {
      setLoadingSlots(true);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from("exam_availability")
          .select("*")
          .eq("status", "available")
          .eq("slot_date", dateStr)
          .order("slot_time", { ascending: true });

        if (error) {
          console.error("Error loading available slots:", error);
          setAvailableSlots([]);
        } else {
          setAvailableSlots(data || []);
        }
      } catch (error) {
        console.error("Unexpected error loading slots:", error);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
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

    try {
      // Sprawdź czy użytkownik nie ma już aktywnego egzaminu
      const { data: activeBooking, error: checkError } = await supabase
        .from("exam_bookings")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "scheduled")
        .maybeSingle();

      if (checkError) {
        console.error("Error checking active booking:", checkError);
        toast.error("Błąd sprawdzania aktywnych egzaminów. Spróbuj ponownie.");
        setPurchasing(false);
        return;
      }

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

      if (insertErr) {
        console.error("Insert error:", insertErr);
        toast.error(`Błąd zakupu: ${insertErr.message || 'Nieznany błąd'}`);
        setPurchasing(false);
        return;
      }

      if (!booking) {
        toast.error("Błąd tworzenia rezerwacji. Spróbuj ponownie.");
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
        toast.error(`Błąd podczas rezerwacji terminu: ${updateErr.message || 'Nieznany błąd'}`);
        setPurchasing(false);
        return;
      }

      toast.success(`Egzamin wykupiony! Termin: ${new Date(slot.slot_date).toLocaleDateString('pl-PL')} o ${slot.slot_time.slice(0, 5)}`);
      setPurchasing(false);

      // Przeładuj dane
      window.location.reload();
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
      setPurchasing(false);
    }
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
    <div className="min-h-screen bg-background">
      <header className="relative overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10 md:pt-20 md:pb-14">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground leading-[1.1] mb-4">
              Zapisz się!✨
            </h1>
            <div className="max-w-2xl mx-auto">
              <p className="text-lg text-muted-foreground font-body leading-relaxed">
                Egzamin z egzaminatorem – 20 minut, {EXAM_PRICE} zł
              </p>
              <div className="flex items-center justify-center gap-8 mt-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>20 minut</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard size={16} />
                  <span>{EXAM_PRICE} zł</span>
                </div>
              </div>
              
              {/* Przyciski debugowania */}
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={checkDatabaseState}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  Sprawdź bazę danych
                </button>
                <button
                  onClick={createSampleSlots}
                  className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Dodaj przykładowe terminy
                </button>
              </div>
              
              {/* Informacje debugowania */}
              {debugInfo && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg text-xs font-mono text-left max-w-2xl mx-auto">
                  <pre className="whitespace-pre-wrap">{debugInfo}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Kalendarz */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)] overflow-hidden">
              <div className="px-6 py-4 border-b border-border/60 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-semibold text-foreground">
                    Wybierz termin egzaminu
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => changeMonth(-1)}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="font-medium text-sm min-w-[120px] text-center">
                      {monthYear}
                    </span>
                    <button
                      onClick={() => changeMonth(1)}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {/* Dni tygodnia */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['N', 'P', 'W', 'Ś', 'C', 'P', 'S'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Dni miesiąca */}
                <div className="grid grid-cols-7 gap-1 mb-8">
                  {days.map((day, index) => (
                    <div key={index} className="aspect-square">
                      {day && (
                        <button
                          onClick={() => handleDateSelect(day)}
                          disabled={day < today}
                          className={`w-full h-full rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                            day < today
                              ? 'text-muted-foreground/30 cursor-not-allowed'
                              : selectedDate?.toDateString() === day.toDateString()
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
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
                  <div className="mt-6 pt-6 border-t border-border/60">
                    <h3 className="font-medium text-foreground mb-4">
                      Dostępne godziny - {selectedDate.toLocaleDateString('pl-PL')}
                    </h3>
                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Brak dostępnych terminów w tym dniu
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => handleSlotSelect(slot)}
                            disabled={purchasing}
                            className="p-3 rounded-lg border border-border/60 bg-card hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            <Clock size={16} className="mx-auto mb-1" />
                            {formatTime(slot.slot_time)}
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
                      Wybierz termin w kalendarzu
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
