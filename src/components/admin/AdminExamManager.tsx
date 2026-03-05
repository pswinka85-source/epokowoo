import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, RefreshCw, Clock, CalendarDays } from "lucide-react";
import { toast } from "sonner";

const DAYS_PL = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
const SLOT_DURATION = 20;
const GENERATE_WEEKS_AHEAD = 4;

interface Examiner {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Schedule {
  id: string;
  examiner_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface SlotRow {
  id: string;
  slot_date: string;
  slot_time: string;
  status: string;
  examiner_id: string;
}

interface BookingRow {
  id: string;
  user_id: string;
  availability_id: string;
  status: string;
  amount_pln: number;
  created_at: string;
  rescheduled: boolean;
  profiles?: { display_name: string | null } | null;
  exam_availability?: { slot_date: string; slot_time: string; examiner_id: string } | null;
}

const AdminExamManager = () => {
  const { user } = useAuth();
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [selectedExaminer, setSelectedExaminer] = useState<string>("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState("10:00");
  const [newEnd, setNewEnd] = useState("12:00");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Load examiners
  useEffect(() => {
    const loadExaminers = async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "examiner");
      if (!roles?.length) { setExaminers([]); return; }
      const ids = roles.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", ids);
      const list = (profiles as Examiner[]) || [];
      setExaminers(list);
      if (list.length > 0 && !selectedExaminer) setSelectedExaminer(list[0].user_id);
    };
    loadExaminers();
  }, []);

  // Load schedules & slots for selected examiner
  useEffect(() => {
    if (!selectedExaminer) return;
    loadData();
  }, [selectedExaminer]);

  const loadData = async () => {
    if (!selectedExaminer) return;
    const [{ data: sch }, { data: sl }] = await Promise.all([
      supabase
        .from("exam_schedules")
        .select("*")
        .eq("examiner_id", selectedExaminer)
        .order("day_of_week"),
      supabase
        .from("exam_availability")
        .select("*")
        .eq("examiner_id", selectedExaminer)
        .gte("slot_date", new Date().toISOString().slice(0, 10))
        .order("slot_date")
        .order("slot_time"),
    ]);
    setSchedules((sch as Schedule[]) || []);
    setSlots((sl as SlotRow[]) || []);
    await loadBookings();
  };

  const loadBookings = async () => {
    if (!selectedExaminer) return;
    const slotIds =
      (await supabase.from("exam_availability").select("id").eq("examiner_id", selectedExaminer))
        .data?.map((a: any) => a.id) || [];
    if (!slotIds.length) { setBookings([]); return; }
    const { data } = await supabase
      .from("exam_bookings")
      .select("*, exam_availability(slot_date, slot_time, examiner_id)")
      .in("availability_id", slotIds)
      .in("status", ["scheduled", "completed"])
      .order("created_at", { ascending: false });
    if (!data?.length) { setBookings([]); return; }
    const userIds = data.map((b: any) => b.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);
    const pMap = new Map(
      profiles?.map((p: any) => [p.user_id, { display_name: p.display_name }]) || []
    );
    setBookings(data.map((b: any) => ({ ...b, profiles: pMap.get(b.user_id) || null })));
  };

  const generateTimeSlots = (start: string, end: string): string[] => {
    const result: string[] = [];
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    for (let m = startMin; m + SLOT_DURATION <= endMin; m += SLOT_DURATION) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      result.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`);
    }
    return result;
  };

  const formatLocalDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const getFutureDates = (dayOfWeek: number): string[] => {
    const dates: string[] = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    for (let i = 0; i < GENERATE_WEEKS_AHEAD * 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (d.getDay() === dayOfWeek) dates.push(formatLocalDate(d));
    }
    return dates;
  };

  const generateSlotsForSchedule = async (schedule: Schedule) => {
    const times = generateTimeSlots(schedule.start_time, schedule.end_time);
    const dates = getFutureDates(schedule.day_of_week);
    if (!times.length || !dates.length) return;
    const todayStr = formatLocalDate(new Date());
    const { data: existing } = await supabase
      .from("exam_availability")
      .select("id, slot_date, slot_time, status")
      .eq("examiner_id", schedule.examiner_id)
      .eq("schedule_id", schedule.id)
      .gte("slot_date", todayStr);
    const existingMap = new Map(
      (existing || []).map((e: any) => [`${e.slot_date}_${e.slot_time}`, e])
    );
    const desiredKeys = new Set<string>();
    const toInsert: any[] = [];
    for (const date of dates) {
      for (const time of times) {
        const key = `${date}_${time}`;
        desiredKeys.add(key);
        if (!existingMap.has(key)) {
          toInsert.push({
            examiner_id: schedule.examiner_id,
            schedule_id: schedule.id,
            slot_date: date,
            slot_time: time,
            status: "available",
          });
        }
      }
    }
    const toRemoveIds: string[] = [];
    const bookedToReschedule: any[] = [];
    for (const [key, slot] of existingMap) {
      if (!desiredKeys.has(key)) {
        if ((slot as any).status === "available") toRemoveIds.push((slot as any).id);
        else if ((slot as any).status === "booked") bookedToReschedule.push(slot);
      }
    }
    if (bookedToReschedule.length > 0) {
      const bookedSlotIds = bookedToReschedule.map((s: any) => s.id);
      const { data: affectedBookings } = await supabase
        .from("exam_bookings")
        .select("*")
        .in("availability_id", bookedSlotIds)
        .eq("status", "scheduled");
      if (affectedBookings?.length) {
        const allNewSlots = [...toInsert];
        let slotIndex = 0;
        for (const booking of affectedBookings) {
          if (slotIndex < allNewSlots.length) {
            allNewSlots[slotIndex].status = "booked";
            slotIndex++;
          }
          toRemoveIds.push(bookedToReschedule.find((s: any) => s.id === booking.availability_id)?.id);
        }
        if (toInsert.length > 0) {
          const { data: inserted } = await supabase
            .from("exam_availability")
            .insert(toInsert)
            .select();
          if (inserted) {
            let idx = 0;
            for (const booking of affectedBookings) {
              if (idx < inserted.length) {
                const oldSlot = bookedToReschedule.find((s: any) => s.id === booking.availability_id);
                await supabase
                  .from("exam_bookings")
                  .update({
                    availability_id: inserted[idx].id,
                    original_slot_time: oldSlot?.slot_time || null,
                    rescheduled: true,
                  })
                  .eq("id", booking.id);
                idx++;
              }
            }
          }
        }
      }
    } else {
      if (toInsert.length > 0) {
        await supabase.from("exam_availability").insert(toInsert);
      }
    }
    if (toRemoveIds.length > 0) {
      await supabase.from("exam_availability").delete().in("id", toRemoveIds.filter(Boolean));
    }
  };

  const handleAddSchedule = async () => {
    if (!selectedExaminer) return;
    setSaving(true);
    const startFormatted = newStart + (newStart.length === 5 ? ":00" : "");
    const endFormatted = newEnd + (newEnd.length === 5 ? ":00" : "");
    const { data, error } = await supabase
      .from("exam_schedules")
      .upsert(
        { examiner_id: selectedExaminer, day_of_week: newDay, start_time: startFormatted, end_time: endFormatted },
        { onConflict: "examiner_id,day_of_week" }
      )
      .select()
      .single();
    if (error) { toast.error("Błąd zapisu harmonogramu"); setSaving(false); return; }
    toast.success(`Harmonogram ${DAYS_PL[newDay]} zapisany`);
    setSaving(false);
    if (data) {
      setGenerating(true);
      await generateSlotsForSchedule(data as Schedule);
      setGenerating(false);
    }
    loadData();
  };

  const handleDeleteSchedule = async (schedule: Schedule) => {
    const { data: bookedSlots } = await supabase
      .from("exam_availability")
      .select("id")
      .eq("schedule_id", schedule.id)
      .eq("status", "booked");
    if (bookedSlots?.length) {
      const slotIds = bookedSlots.map((s: any) => s.id);
      await supabase
        .from("exam_bookings")
        .update({ status: "refunded" })
        .in("availability_id", slotIds)
        .eq("status", "scheduled");
    }
    await supabase.from("exam_schedules").delete().eq("id", schedule.id);
    toast.success(`Usunięto harmonogram ${DAYS_PL[schedule.day_of_week]}`);
    loadData();
  };

  const handleRegenerateAll = async () => {
    setGenerating(true);
    for (const sch of schedules) await generateSlotsForSchedule(sch);
    toast.success("Terminy wygenerowane");
    setGenerating(false);
    loadData();
  };

  const handleCancelBooking = async (bookingId: string, availabilityId: string) => {
    setCancelling(bookingId);
    await supabase.from("exam_bookings").update({ status: "refunded" }).eq("id", bookingId);
    await supabase.from("exam_availability").update({ status: "available" }).eq("id", availabilityId);
    toast.success("Egzamin anulowany. Zwrot 19,99 zł.");
    setCancelling(null);
    loadData();
  };

  const formatTime = (t: string) => (typeof t === "string" ? t.slice(0, 5) : t);
  const formatDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("pl-PL", { weekday: "short", day: "numeric", month: "short" });

  const selectedExaminerProfile = examiners.find((e) => e.user_id === selectedExaminer);

  return (
    <div className="space-y-6">
      {/* Examiner selector */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)] p-6">
        <h3 className="font-display font-semibold text-foreground mb-3">Wybierz egzaminatora</h3>
        {examiners.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Brak egzaminatorów. Dodaj ich w zakładce "Egzaminatorzy".
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {examiners.map((ex) => (
              <button
                key={ex.user_id}
                onClick={() => setSelectedExaminer(ex.user_id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors text-sm font-body font-medium ${
                  selectedExaminer === ex.user_id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 bg-secondary/10 text-foreground hover:bg-secondary/30"
                }`}
              >
                {ex.avatar_url ? (
                  <img src={ex.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {(ex.display_name || "E")[0].toUpperCase()}
                  </div>
                )}
                {ex.display_name || "Egzaminator"}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedExaminer && (
        <>
          {/* Schedule form */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)] p-6">
            <h3 className="font-display font-semibold text-foreground mb-2 flex items-center gap-2">
              <Clock size={18} /> Ustaw dostępność tygodniową
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Dla: <span className="font-medium text-foreground">{selectedExaminerProfile?.display_name}</span>
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Dzień tygodnia</label>
                <select
                  value={newDay}
                  onChange={(e) => setNewDay(Number(e.target.value))}
                  className="h-10 px-3 rounded-xl border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {DAYS_PL.map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Od</label>
                <input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Do</label>
                <input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                onClick={handleAddSchedule}
                disabled={saving || generating}
                className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-body text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors hover:opacity-90"
              >
                <Plus size={16} />
                {saving ? "Zapisuję..." : "Zapisz"}
              </button>
            </div>
            {newStart && newEnd && (
              <div className="mt-3 text-xs text-muted-foreground">
                Podgląd terminów:{" "}
                {generateTimeSlots(newStart + ":00", newEnd + ":00").map((t) => t.slice(0, 5)).join(", ") || "brak"}
              </div>
            )}
          </div>

          {/* Existing schedules */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                <CalendarDays size={18} /> Harmonogramy
              </h3>
              <button
                onClick={handleRegenerateAll}
                disabled={generating || !schedules.length}
                className="h-9 px-4 rounded-xl bg-secondary text-secondary-foreground font-body text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 transition-colors hover:bg-secondary/80"
              >
                <RefreshCw size={14} className={generating ? "animate-spin" : ""} />
                Regeneruj terminy
              </button>
            </div>
            {schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Brak harmonogramów</p>
            ) : (
              <div className="space-y-2">
                {schedules.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-secondary/20 border border-border/40">
                    <span className="text-sm font-body font-medium">
                      {DAYS_PL[s.day_of_week]}: {formatTime(s.start_time)} – {formatTime(s.end_time)}
                      <span className="text-muted-foreground ml-2 font-normal">
                        ({generateTimeSlots(s.start_time, s.end_time).length} terminów)
                      </span>
                    </span>
                    <button onClick={() => handleDeleteSchedule(s)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming slots */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)] p-6">
            <h3 className="font-display font-semibold text-foreground mb-4">
              Nadchodzące terminy ({slots.length})
            </h3>
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Brak terminów</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {slots.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2 px-4 rounded-xl bg-secondary/20">
                    <span className="text-sm font-body">{formatDate(a.slot_date)} {formatTime(a.slot_time)}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.status === "available" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                      {a.status === "available" ? "Dostępny" : "Zarezerwowany"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bookings */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)] p-6">
            <h3 className="font-display font-semibold text-foreground mb-4">Rezerwacje egzaminów</h3>
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Brak rezerwacji</p>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-secondary/10">
                    <div>
                      <p className="font-medium text-foreground font-body">{b.profiles?.display_name || "Użytkownik"}</p>
                      <p className="text-sm text-muted-foreground">
                        {b.exam_availability && `${formatDate(b.exam_availability.slot_date)} ${formatTime(b.exam_availability.slot_time)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{b.amount_pln} zł</p>
                      {b.rescheduled && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠ Przeniesiony</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleCancelBooking(b.id, b.availability_id)}
                      disabled={cancelling === b.id}
                      className="h-9 px-4 rounded-xl bg-destructive/10 text-destructive font-body text-sm font-medium hover:bg-destructive/20 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 size={14} />
                      {cancelling === b.id ? "Anuluję..." : "Anuluj i zwróć"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminExamManager;
