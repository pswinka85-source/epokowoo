import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, CreditCard, ChevronLeft, ChevronRight, AlertTriangle, XCircle, ShieldCheck, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

interface ExaminerProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const EXAM_PRICE = 19.99;
const MIN_DAYS_BEFORE_BOOKING = 5;

const Exams = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [bookings, setBookings] = useState<(ExamBooking & { examiner_name?: string; examiner_avatar?: string | null })[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<(ExamAvailability & { examiner_name?: string; examiner_avatar?: string | null })[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmSlot, setConfirmSlot] = useState<(ExamAvailability & { examiner_name?: string; examiner_avatar?: string | null }) | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [datesWithSlots, setDatesWithSlots] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const loadDatesWithSlots = async () => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;
      
      const { data } = await supabase
        .from("exam_availability")
        .select("slot_date")
        .eq("status", "available")
        .gte("slot_date", firstDay)
        .lte("slot_date", lastDay);
      
      if (data) {
        setDatesWithSlots(new Set(data.map((d: any) => d.slot_date)));
      }
    };
    loadDatesWithSlots();
  }, [currentMonth]);

  useEffect(() => {
    if (!user) return;
    const loadBookings = async () => {
      const { data, error } = await supabase
        .from("exam_bookings")
        .select("*, exam_availability(slot_date, slot_time, examiner_id)")
        .eq("user_id", user.id)
        .in("status", ["scheduled", "completed"])
        .order("created_at", { ascending: false });

      if (error || !data?.length) { setBookings([]); return; }

      const examinerIds = [...new Set(data.flatMap((b: any) => b.exam_availability?.examiner_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", examinerIds);

      const profileMap = new Map(
        (profiles as ExaminerProfile[])?.map((p) => [p.user_id, p]) || []
      );

      setBookings(
        data.map((b: any) => {
          const prof = b.exam_availability?.examiner_id ? profileMap.get(b.exam_availability.examiner_id) : null;
          return {
            ...b,
            examiner_name: prof?.display_name || "Egzaminator",
            examiner_avatar: prof?.avatar_url || null,
          };
        })
      );
    };
    loadBookings();
  }, [user]);

  useEffect(() => {
    if (!selectedDate) return;
    const loadSlots = async () => {
      setLoadingSlots(true);
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      const { data } = await supabase
        .from("exam_availability")
        .select("*")
        .eq("status", "available")
        .eq("slot_date", dateStr)
        .order("slot_time", { ascending: true });

      if (!data?.length) { setAvailableSlots([]); setLoadingSlots(false); return; }

      const examinerIds = [...new Set(data.map((s: any) => s.examiner_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", examinerIds);

      const profileMap = new Map(
        (profiles as ExaminerProfile[])?.map((p) => [p.user_id, p]) || []
      );

      setAvailableSlots(
        data.map((s: any) => {
          const prof = profileMap.get(s.examiner_id);
          return {
            ...s,
            examiner_name: prof?.display_name || "Egzaminator",
            examiner_avatar: prof?.avatar_url || null,
          };
        })
      );
      setLoadingSlots(false);
    };
    loadSlots();
  }, [selectedDate]);

  const isWithinBookingWindow = (slotDate: string): boolean => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const slot = new Date(slotDate + "T00:00:00");
    const diffDays = Math.ceil((slot.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= MIN_DAYS_BEFORE_BOOKING;
  };

  const handleSlotSelect = async (slot: ExamAvailability & { examiner_name?: string; examiner_avatar?: string | null }) => {
    if (!user) return;
    if (!isWithinBookingWindow(slot.slot_date)) {
      toast.error(`Zapisy możliwe minimum ${MIN_DAYS_BEFORE_BOOKING} dni przed terminem`);
      return;
    }

    const { data: existingBookingOnDay } = await supabase
      .from("exam_bookings")
      .select("id, exam_availability!inner(slot_date)")
      .eq("user_id", user.id)
      .eq("status", "scheduled")
      .eq("exam_availability.slot_date", slot.slot_date)
      .maybeSingle();

    if (existingBookingOnDay) {
      toast.error("Masz już egzamin zaplanowany na ten dzień. Wypisz się najpierw lub wybierz inny termin.");
      return;
    }

    setConfirmSlot(slot);
  };

  const handleConfirmPayment = async () => {
    if (!user || !confirmSlot) return;
    setPaymentProcessing(true);

    const { data: existingBookingOnDay } = await supabase
      .from("exam_bookings")
      .select("id, exam_availability!inner(slot_date)")
      .eq("user_id", user.id)
      .eq("status", "scheduled")
      .eq("exam_availability.slot_date", confirmSlot.slot_date)
      .maybeSingle();

    if (existingBookingOnDay) {
      toast.error("Masz już egzamin zaplanowany na ten dzień. Wypisz się najpierw lub wybierz inny termin.");
      setPaymentProcessing(false);
      setConfirmSlot(null);
      return;
    }

    await new Promise((r) => setTimeout(r, 1500));

    const { error: insertErr } = await supabase.from("exam_bookings").insert({
      user_id: user.id,
      availability_id: confirmSlot.id,
      status: "scheduled",
      amount_pln: EXAM_PRICE,
      payment_reference: `pay-${Date.now()}`,
    });

    if (insertErr) {
      toast.error(`Błąd płatności: ${insertErr.message}`);
      setPaymentProcessing(false);
      setConfirmSlot(null);
      return;
    }

    await supabase.from("exam_availability").update({ status: "booked" }).eq("id", confirmSlot.id);

    toast.success(`Płatność zakończona! Egzamin ${new Date(confirmSlot.slot_date).toLocaleDateString("pl-PL")} o ${confirmSlot.slot_time.slice(0, 5)}`);
    setPaymentProcessing(false);
    setConfirmSlot(null);
    window.location.reload();
  };

  const handleCancelBooking = async (booking: ExamBooking) => {
    setCancellingId(booking.id);
    await supabase.from("exam_bookings").update({ status: "refunded" }).eq("id", booking.id);
    await supabase.from("exam_availability").update({ status: "available" }).eq("id", booking.availability_id);
    toast.success("Egzamin anulowany. Zwrot 19,99 zł.");
    setCancellingId(null);
    setBookings((prev) => prev.filter((b) => b.id !== booking.id));
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    const startDay = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < startDay; i++) days.push(null);
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
    new Date(d + "T12:00:00").toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const formatTime = (t: string) => t.slice(0, 5);

  const monthYear = currentMonth.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
  const days = getDaysInMonth(currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <header className="relative overflow-hidden border-b border-border/30">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary/6 rounded-full blur-[100px]" />
        <div className="absolute -bottom-20 right-0 w-96 h-96 bg-accent/6 rounded-full blur-[100px]" />
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12 md:pt-20 md:pb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-primary font-body mb-3 block">Egzaminy ustne</span>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground leading-[1.1] mb-3">
            Zarezerwuj swój egzamin
          </h1>
          <p className="text-base text-muted-foreground font-body leading-relaxed max-w-xl mb-6">
            Wybierz termin, potwierdź rezerwację i przygotuj się na egzamin ustny z doświadczonym egzaminatorem.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Clock size={15} /> 20 minut</span>
            <span className="flex items-center gap-1.5"><CreditCard size={15} /> {EXAM_PRICE} zł</span>
            <span className="flex items-center gap-1.5"><Calendar size={15} /> Min. {MIN_DAYS_BEFORE_BOOKING} dni wcześniej</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">

        {/* Main content: calendar + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
          {/* Calendar */}
          <div className="rounded-3xl border border-border/40 bg-card shadow-[var(--shadow-card)] overflow-hidden">
            {/* Calendar header */}
            <div className="px-6 sm:px-8 py-5 flex items-center justify-between border-b border-border/30">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground capitalize">{monthYear}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Kliknij dzień, aby zobaczyć wolne terminy</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => changeMonth(-1)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => changeMonth(1)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="px-4 sm:px-6 pb-6 pt-4">
              {/* Day names */}
              <div className="grid grid-cols-7 mb-2">
                {["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"].map((day, i) => (
                  <div key={i} className="text-center text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => {
                  if (!day) return <div key={index} />;
                  
                  const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                  const hasSlots = datesWithSlots.has(dateStr);
                  const isPast = day < today;
                  const isSelected = selectedDate?.toDateString() === day.toDateString();
                  const isTodayDate = isToday(day);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleDateSelect(day)}
                      disabled={isPast}
                      className={`
                        relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all duration-200
                        ${isPast
                          ? "text-muted-foreground/20 cursor-not-allowed"
                          : isSelected
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.08]"
                          : isTodayDate
                          ? "bg-primary/8 ring-2 ring-primary/15 text-foreground hover:bg-primary/12"
                          : hasSlots
                          ? "bg-accent/8 text-foreground hover:bg-accent/15 hover:scale-105"
                          : "text-foreground/80 hover:bg-secondary hover:scale-105"
                        }
                      `}
                    >
                      <span className="relative z-10">{day.getDate()}</span>
                      {hasSlots && !isPast && (
                        <span className="absolute bottom-1 flex gap-[3px]">
                          <span className={`w-[5px] h-[5px] rounded-full ${isSelected ? "bg-primary-foreground" : "bg-accent"}`} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-5 pt-4 border-t border-border/30 flex items-center gap-5 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                  Dostępne terminy
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  Wybrany dzień
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full ring-2 ring-primary/20 bg-primary/10" />
                  Dzisiaj
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar: selected day slots */}
          <div className="rounded-3xl border border-border/40 bg-card shadow-[var(--shadow-card)] overflow-hidden lg:sticky lg:top-24">
            <div className="px-6 py-5 border-b border-border/30">
              <h3 className="font-display font-bold text-foreground text-base">
                {selectedDate 
                  ? selectedDate.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })
                  : "Wolne terminy"
                }
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedDate ? "Wybierz godzinę egzaminu" : "Wybierz dzień w kalendarzu"}
              </p>
            </div>

            <div className="p-5">
              {!selectedDate ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center mb-4">
                    <Calendar size={26} className="text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground/60 font-medium">Kliknij dzień w kalendarzu,<br/>aby zobaczyć dostępne godziny</p>
                </div>
              ) : loadingSlots ? (
                <div className="flex items-center justify-center py-14">
                  <div className="w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-3">
                    <Calendar size={22} className="text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Brak wolnych terminów</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Spróbuj inny dzień</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableSlots.map((slot) => {
                    const canBook = isWithinBookingWindow(slot.slot_date);
                    return (
                      <button
                        key={slot.id}
                        onClick={() => handleSlotSelect(slot)}
                        disabled={!canBook}
                        title={!canBook ? `Zapisy min. ${MIN_DAYS_BEFORE_BOOKING} dni przed terminem` : undefined}
                        className={`group w-full p-3.5 rounded-xl border text-left transition-all duration-200 ${
                          canBook
                            ? "border-border/40 bg-secondary/20 hover:bg-primary/5 hover:border-primary/30 hover:shadow-md"
                            : "border-border/20 bg-muted/20 text-muted-foreground cursor-not-allowed opacity-40"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {slot.examiner_avatar ? (
                            <img src={slot.examiner_avatar} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                              {(slot.examiner_name || "E")[0].toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-bold text-foreground">{formatTime(slot.slot_time)}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{slot.examiner_name}</p>
                          </div>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${canBook ? "bg-primary/8 text-primary group-hover:bg-primary group-hover:text-primary-foreground" : ""}`}>
                            <ArrowRight size={14} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* My exams section */}
        <div className="mt-10 rounded-3xl border border-border/40 bg-card shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-6 sm:px-8 py-5 border-b border-border/30">
            <h2 className="font-display text-lg font-bold text-foreground">Moje egzaminy</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Zaplanowane i zakończone</p>
          </div>
          <div className="p-6 sm:p-8">
            {bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                  <Calendar size={28} className="text-muted-foreground/30" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground">Brak zaplanowanych egzaminów</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Wybierz termin w kalendarzu powyżej</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bookings.map((b) => (
                  <div key={b.id} className="p-5 rounded-2xl border border-border/40 bg-secondary/15 hover:bg-secondary/25 transition-all duration-200 hover:shadow-[var(--shadow-card)]">
                    <div className="flex items-start gap-3">
                      {b.examiner_avatar ? (
                        <img src={b.examiner_avatar} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-display font-bold text-sm">
                          {(b.examiner_name || "E")[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-foreground text-[14px] truncate">
                          {b.exam_availability && formatDate(b.exam_availability.slot_date)}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                          <span className="flex items-center gap-1"><Clock size={12} /> {b.exam_availability && formatTime(b.exam_availability.slot_time)}</span>
                          <span className="truncate">{b.examiner_name}</span>
                        </div>

                        {b.rescheduled && (
                          <div className="mt-3 p-3 rounded-xl bg-warning/10 border border-warning/20">
                            <div className="flex items-center gap-1.5 text-warning">
                              <AlertTriangle size={13} />
                              <span className="text-xs font-bold">Termin zmieniony</span>
                            </div>
                            {b.original_slot_time && (
                              <p className="text-[11px] text-warning/80 mt-1">
                                Poprzednia godzina: {formatTime(b.original_slot_time)}
                              </p>
                            )}
                            <button
                              onClick={() => handleCancelBooking(b)}
                              disabled={cancellingId === b.id}
                              className="mt-2 h-7 px-3 rounded-lg bg-destructive/10 text-destructive text-[11px] font-semibold hover:bg-destructive/20 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                            >
                              <XCircle size={12} />
                              {cancellingId === b.id ? "Anuluję..." : "Wypisz się (zwrot 19,99 zł)"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Payment confirmation dialog */}
      <Dialog open={!!confirmSlot} onOpenChange={(open) => { if (!open && !paymentProcessing) setConfirmSlot(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard size={20} className="text-primary" />
              Potwierdzenie rezerwacji
            </DialogTitle>
            <DialogDescription>
              Czy chcesz wybrać ten termin egzaminu?
            </DialogDescription>
          </DialogHeader>

          {confirmSlot && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {confirmSlot.examiner_avatar ? (
                    <img src={confirmSlot.examiner_avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                      {(confirmSlot.examiner_name || "E")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-foreground">{confirmSlot.examiner_name || "Egzaminator"}</p>
                    <p className="text-sm text-muted-foreground">Egzaminator</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Calendar size={14} className="text-muted-foreground" />
                    {new Date(confirmSlot.slot_date + "T12:00:00").toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}
                  </div>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Clock size={14} className="text-muted-foreground" />
                    {confirmSlot.slot_time.slice(0, 5)}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Egzamin ustny (20 min)</span>
                  <span className="font-semibold text-foreground">{EXAM_PRICE} zł</span>
                </div>
                <div className="border-t border-border/60 mt-3 pt-3 flex items-center justify-between">
                  <span className="font-medium text-foreground">Do zapłaty</span>
                  <span className="text-lg font-bold text-primary">{EXAM_PRICE} zł</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck size={14} className="text-primary shrink-0" />
                <span>Bezpieczna płatność. Zwrot możliwy po zmianie terminu przez admina.</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmSlot(null)}
              disabled={paymentProcessing}
              className="w-full sm:w-auto"
            >
              Anuluj
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={paymentProcessing}
              className="w-full sm:w-auto gap-2"
            >
              {paymentProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Przetwarzanie płatności...
                </>
              ) : (
                <>
                  <CreditCard size={16} />
                  Zapłać {EXAM_PRICE} zł
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Exams;
