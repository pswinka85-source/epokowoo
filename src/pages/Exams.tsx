import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, CreditCard, CheckCircle, ChevronLeft, ChevronRight, AlertTriangle, XCircle } from "lucide-react";
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
  rescheduled: boolean;
  original_slot_time: string | null;
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
const MAX_DAYS_BEFORE_BOOKING = 5;

const Exams = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [purchasing, setPurchasing] = useState(false);
  const [bookings, setBookings] = useState<(ExamBooking & { examiner_name?: string })[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<ExamAvailability[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  // Load user bookings
  useEffect(() => {
    if (!user) return;
    const loadBookings = async () => {
      const { data, error } = await supabase
        .from("exam_bookings")
        .select("*, exam_availability(slot_date, slot_time, examiner_id)")
        .eq("user_id", user.id)
        .in("status", ["scheduled", "completed"])
        .order("created_at", { ascending: false });

      if (error || !data?.length) {
        setBookings([]);
        return;
      }

      const examinerIds = [
        ...new Set(data.flatMap((b: any) => b.exam_availability?.examiner_id).filter(Boolean)),
      ];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", examinerIds);

      const profileMap = new Map(
        (profiles as Profile[])?.map((p) => [p.user_id, p.display_name || "Egzaminator"]) || []
      );

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

  // Load available slots for selected date
  useEffect(() => {
    if (!selectedDate) return;
    const loadSlots = async () => {
      setLoadingSlots(true);
      const dateStr = selectedDate.toISOString().split("T")[0];
      const { data } = await supabase
        .from("exam_availability")
        .select("*")
        .eq("status", "available")
        .eq("slot_date", dateStr)
        .order("slot_time", { ascending: true });
      setAvailableSlots((data as ExamAvailability[]) || []);
      setLoadingSlots(false);
    };
    loadSlots();
  }, [selectedDate]);

  const isWithinBookingWindow = (slotDate: string): boolean => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const slot = new Date(slotDate + "T00:00:00");
    const diffDays = Math.ceil((slot.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= MAX_DAYS_BEFORE_BOOKING;
  };

  const handleSlotSelect = async (slot: ExamAvailability) => {
    if (!user) return;
    if (!isWithinBookingWindow(slot.slot_date)) {
      toast.error(`Zapisy możliwe max ${MAX_DAYS_BEFORE_BOOKING} dni przed terminem`);
      return;
    }
    setPurchasing(true);

    // Check active booking
    const { data: activeBooking } = await supabase
      .from("exam_bookings")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "scheduled")
      .maybeSingle();

    if (activeBooking) {
      toast.error("Masz już aktywny egzamin. Zakończ go lub anuluj przed zakupem kolejnego.");
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
      toast.error(`Błąd zakupu: ${insertErr.message}`);
      setPurchasing(false);
      return;
    }

    await supabase
      .from("exam_availability")
      .update({ status: "booked" })
      .eq("id", slot.id);

    toast.success(
      `Egzamin wykupiony! ${new Date(slot.slot_date).toLocaleDateString("pl-PL")} o ${slot.slot_time.slice(0, 5)}`
    );
    setPurchasing(false);
    window.location.reload();
  };

  const handleCancelBooking = async (booking: ExamBooking) => {
    setCancellingId(booking.id);
    await supabase
      .from("exam_bookings")
      .update({ status: "refunded" })
      .eq("id", booking.id);
    await supabase
      .from("exam_availability")
      .update({ status: "available" })
      .eq("id", booking.availability_id);
    toast.success("Egzamin anulowany. Zwrot 19,99 zł.");
    setCancellingId(null);
    // Reload bookings
    setBookings((prev) => prev.filter((b) => b.id !== booking.id));
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  };

  const handleDateSelect = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return;
    setSelectedDate(date);
  };

  const changeMonth = (dir: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + dir, 1));
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

  const monthYear = currentMonth.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
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
              Zapisz się! ✨
            </h1>
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
            <p className="text-xs text-muted-foreground mt-3">
              Zapisy możliwe max {MAX_DAYS_BEFORE_BOOKING} dni przed terminem
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)] overflow-hidden">
              <div className="px-6 py-4 border-b border-border/60 bg-secondary/20">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-semibold text-foreground">Wybierz termin</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => changeMonth(-1)}
                      className="p-1 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="font-medium text-sm min-w-[120px] text-center">
                      {monthYear}
                    </span>
                    <button
                      onClick={() => changeMonth(1)}
                      className="p-1 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["N", "P", "W", "Ś", "C", "P", "S"].map((day, i) => (
                    <div key={i} className="text-center text-xs font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 mb-8">
                  {days.map((day, index) => (
                    <div key={index} className="aspect-square">
                      {day && (
                        <button
                          onClick={() => handleDateSelect(day)}
                          disabled={day < today}
                          className={`w-full h-full rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                            day < today
                              ? "text-muted-foreground/30 cursor-not-allowed"
                              : selectedDate?.toDateString() === day.toDateString()
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-secondary"
                          }`}
                        >
                          {day.getDate()}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {selectedDate && (
                  <div className="mt-6 pt-6 border-t border-border/60">
                    <h3 className="font-medium text-foreground mb-4">
                      Dostępne godziny – {selectedDate.toLocaleDateString("pl-PL")}
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
                        {availableSlots.map((slot) => {
                          const canBook = isWithinBookingWindow(slot.slot_date);
                          return (
                            <button
                              key={slot.id}
                              onClick={() => handleSlotSelect(slot)}
                              disabled={purchasing || !canBook}
                              title={
                                !canBook
                                  ? `Zapisy otwierają się ${MAX_DAYS_BEFORE_BOOKING} dni przed terminem`
                                  : undefined
                              }
                              className={`p-3 rounded-lg border border-border/60 text-sm font-medium transition-colors ${
                                canBook
                                  ? "bg-card hover:bg-secondary disabled:opacity-50"
                                  : "bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
                              }`}
                            >
                              <Clock size={16} className="mx-auto mb-1" />
                              {formatTime(slot.slot_time)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* My exams */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)] overflow-hidden">
              <div className="px-6 py-4 border-b border-border/60 bg-secondary/20">
                <h2 className="font-display font-semibold text-foreground">Moje egzaminy</h2>
              </div>
              <div className="p-6">
                {bookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                      <Calendar size={28} className="text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">Brak wykupionych egzaminów</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Wybierz termin w kalendarzu</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((b) => (
                      <div
                        key={b.id}
                        className="p-4 rounded-xl border border-border/60 bg-secondary/10"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <CheckCircle size={20} />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">
                              {b.exam_availability && formatDate(b.exam_availability.slot_date)}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Godzina: {b.exam_availability && formatTime(b.exam_availability.slot_time)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Egzaminator: {b.examiner_name}
                            </p>

                            {/* Rescheduled info */}
                            {b.rescheduled && (
                              <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                                  <AlertTriangle size={14} />
                                  <span className="text-xs font-medium">Termin został zmieniony</span>
                                </div>
                                {b.original_slot_time && (
                                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                                    Poprzednia godzina: {formatTime(b.original_slot_time)}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Cancel button */}
                            {b.status === "scheduled" && (
                              <button
                                onClick={() => handleCancelBooking(b)}
                                disabled={cancellingId === b.id}
                                className="mt-3 h-8 px-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 disabled:opacity-50 flex items-center gap-1.5"
                              >
                                <XCircle size={13} />
                                {cancellingId === b.id ? "Anuluję..." : "Wypisz się (zwrot 19,99 zł)"}
                              </button>
                            )}
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
