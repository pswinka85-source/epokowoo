import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const DAYS_PL = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
const SLOT_DURATION = 20; // minutes
const GENERATE_WEEKS_AHEAD = 4;

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
  exam_availability?: { slot_date: string; slot_time: string } | null;
}

const AdminExamManager = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState("10:00");
  const [newEnd, setNewEnd] = useState("12:00");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: sch }, { data: sl }] = await Promise.all([
      supabase
        .from("exam_schedules")
        .select("*")
        .eq("examiner_id", user.id)
        .order("day_of_week"),
      supabase
        .from("exam_availability")
        .select("*")
        .eq("examiner_id", user.id)
        .gte("slot_date", new Date().toISOString().slice(0, 10))
        .order("slot_date")
        .order("slot_time"),
    ]);
    setSchedules((sch as Schedule[]) || []);
    setSlots((sl as SlotRow[]) || []);
    await loadBookings();
  };

  const loadBookings = async () => {
    if (!user) return;
    const slotIds =
      (
        await supabase
          .from("exam_availability")
          .select("id")
          .eq("examiner_id", user.id)
      ).data?.map((a: any) => a.id) || [];
    if (!slotIds.length) {
      setBookings([]);
      return;
    }
    const { data } = await supabase
      .from("exam_bookings")
      .select("*, exam_availability(slot_date, slot_time)")
      .in("availability_id", slotIds)
      .in("status", ["scheduled", "completed"])
      .order("created_at", { ascending: false });
    if (!data?.length) {
      setBookings([]);
      return;
    }
    const userIds = data.map((b: any) => b.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);
    const pMap = new Map(
      profiles?.map((p: any) => [p.user_id, { display_name: p.display_name }]) || []
    );
    setBookings(
      data.map((b: any) => ({ ...b, profiles: pMap.get(b.user_id) || null }))
    );
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  // Generate time slots between start and end every 20 min
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

  // Get all future dates for a given day_of_week within N weeks
  const getFutureDates = (dayOfWeek: number): string[] => {
    const dates: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < GENERATE_WEEKS_AHEAD * 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (d.getDay() === dayOfWeek) {
        dates.push(d.toISOString().slice(0, 10));
      }
    }
    return dates;
  };

  const generateSlotsForSchedule = async (schedule: Schedule) => {
    if (!user) return;
    const times = generateTimeSlots(schedule.start_time, schedule.end_time);
    const dates = getFutureDates(schedule.day_of_week);
    if (!times.length || !dates.length) return;

    const todayStr = new Date().toISOString().slice(0, 10);

    // Get existing slots for this schedule
    const { data: existing } = await supabase
      .from("exam_availability")
      .select("id, slot_date, slot_time, status")
      .eq("examiner_id", user.id)
      .eq("schedule_id", schedule.id)
      .gte("slot_date", todayStr);

    const existingMap = new Map(
      (existing || []).map((e: any) => [`${e.slot_date}_${e.slot_time}`, e])
    );

    // Desired slots
    const desiredKeys = new Set<string>();
    const toInsert: any[] = [];
    for (const date of dates) {
      for (const time of times) {
        const key = `${date}_${time}`;
        desiredKeys.add(key);
        if (!existingMap.has(key)) {
          toInsert.push({
            examiner_id: user.id,
            schedule_id: schedule.id,
            slot_date: date,
            slot_time: time,
            status: "available",
          });
        }
      }
    }

    // Slots to remove (no longer in schedule) - only available ones
    const toRemoveIds: string[] = [];
    // Slots that are booked but need rescheduling
    const bookedToReschedule: any[] = [];
    for (const [key, slot] of existingMap) {
      if (!desiredKeys.has(key)) {
        if ((slot as any).status === "available") {
          toRemoveIds.push((slot as any).id);
        } else if ((slot as any).status === "booked") {
          bookedToReschedule.push(slot);
        }
      }
    }

    // Handle rescheduling booked slots
    if (bookedToReschedule.length > 0) {
      // Get bookings for these slots
      const bookedSlotIds = bookedToReschedule.map((s: any) => s.id);
      const { data: affectedBookings } = await supabase
        .from("exam_bookings")
        .select("*")
        .in("availability_id", bookedSlotIds)
        .eq("status", "scheduled");

      if (affectedBookings?.length) {
        // Find new available slots in order
        const allNewSlots = [...toInsert];
        let slotIndex = 0;

        for (const booking of affectedBookings) {
          const oldSlot = bookedToReschedule.find((s: any) => s.id === booking.availability_id);
          if (slotIndex < allNewSlots.length) {
            // Will be inserted below, mark as booked
            allNewSlots[slotIndex].status = "booked";
            // We'll update the booking after insert
            slotIndex++;
          }
          // Mark old slot as available for removal
          toRemoveIds.push(oldSlot.id);
        }

        // Insert new slots
        if (toInsert.length > 0) {
          const { data: inserted } = await supabase
            .from("exam_availability")
            .insert(toInsert)
            .select();

          // Update bookings to point to new slots
          if (inserted) {
            let idx = 0;
            for (const booking of affectedBookings) {
              if (idx < inserted.length) {
                const oldSlot = bookedToReschedule.find(
                  (s: any) => s.id === booking.availability_id
                );
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
      // No rescheduling needed, just insert new slots
      if (toInsert.length > 0) {
        await supabase.from("exam_availability").insert(toInsert);
      }
    }

    // Remove old available slots
    if (toRemoveIds.length > 0) {
      await supabase.from("exam_availability").delete().in("id", toRemoveIds);
    }
  };

  const handleAddSchedule = async () => {
    if (!user) return;
    setSaving(true);
    const startFormatted = newStart + (newStart.length === 5 ? ":00" : "");
    const endFormatted = newEnd + (newEnd.length === 5 ? ":00" : "");

    const { data, error } = await supabase
      .from("exam_schedules")
      .upsert(
        {
          examiner_id: user.id,
          day_of_week: newDay,
          start_time: startFormatted,
          end_time: endFormatted,
        },
        { onConflict: "examiner_id,day_of_week" }
      )
      .select()
      .single();

    if (error) {
      toast.error("Błąd zapisu harmonogramu");
      setSaving(false);
      return;
    }
    toast.success(`Harmonogram ${DAYS_PL[newDay]} zapisany`);
    setSaving(false);
    // Generate slots for this schedule
    if (data) {
      setGenerating(true);
      await generateSlotsForSchedule(data as Schedule);
      setGenerating(false);
    }
    load();
  };

  const handleDeleteSchedule = async (schedule: Schedule) => {
    // Delete schedule - CASCADE will remove availability slots
    // First check for booked slots
    const { data: bookedSlots } = await supabase
      .from("exam_availability")
      .select("id")
      .eq("schedule_id", schedule.id)
      .eq("status", "booked");

    if (bookedSlots?.length) {
      // Refund bookings
      const slotIds = bookedSlots.map((s: any) => s.id);
      await supabase
        .from("exam_bookings")
        .update({ status: "refunded" })
        .in("availability_id", slotIds)
        .eq("status", "scheduled");
    }

    await supabase.from("exam_schedules").delete().eq("id", schedule.id);
    toast.success(`Usunięto harmonogram ${DAYS_PL[schedule.day_of_week]}`);
    load();
  };

  const handleRegenerateAll = async () => {
    setGenerating(true);
    for (const sch of schedules) {
      await generateSlotsForSchedule(sch);
    }
    toast.success("Terminy wygenerowane");
    setGenerating(false);
    load();
  };

  const handleCancelBooking = async (bookingId: string, availabilityId: string) => {
    setCancelling(bookingId);
    await supabase
      .from("exam_bookings")
      .update({ status: "refunded" })
      .eq("id", bookingId);
    await supabase
      .from("exam_availability")
      .update({ status: "available" })
      .eq("id", availabilityId);
    toast.success("Egzamin anulowany. Zwrot 19,99 zł.");
    setCancelling(null);
    load();
  };

  const formatTime = (t: string) => (typeof t === "string" ? t.slice(0, 5) : t);
  const formatDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("pl-PL", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  return (
    <div className="space-y-8">
      {/* Harmonogram tygodniowy */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">
          Ustaw dostępność tygodniową
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Wybierz dzień tygodnia i przedział godzin. System wygeneruje terminy co 20 minut.
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Dzień tygodnia
            </label>
            <select
              value={newDay}
              onChange={(e) => setNewDay(Number(e.target.value))}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm font-body"
            >
              {DAYS_PL.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Od
            </label>
            <input
              type="time"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm font-body"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Do
            </label>
            <input
              type="time"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm font-body"
            />
          </div>
          <button
            onClick={handleAddSchedule}
            disabled={saving || generating}
            className="h-10 px-4 rounded-lg bg-primary text-primary-foreground font-body text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Plus size={16} />
            {saving ? "Zapisuję..." : "Zapisz"}
          </button>
        </div>

        {/* Preview */}
        {newStart && newEnd && (
          <div className="mt-3 text-xs text-muted-foreground">
            Podgląd terminów:{" "}
            {generateTimeSlots(newStart + ":00", newEnd + ":00")
              .map((t) => t.slice(0, 5))
              .join(", ") || "brak"}
          </div>
        )}
      </div>

      {/* Istniejące harmonogramy */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-foreground">
            Twoje harmonogramy
          </h3>
          <button
            onClick={handleRegenerateAll}
            disabled={generating || !schedules.length}
            className="h-8 px-3 rounded-lg bg-secondary text-secondary-foreground font-body text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw size={14} className={generating ? "animate-spin" : ""} />
            Regeneruj terminy
          </button>
        </div>
        {schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak harmonogramów</p>
        ) : (
          <div className="space-y-2">
            {schedules.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/40"
              >
                <span className="text-sm font-body">
                  {DAYS_PL[s.day_of_week]}: {formatTime(s.start_time)} – {formatTime(s.end_time)}
                  <span className="text-muted-foreground ml-2">
                    ({generateTimeSlots(s.start_time, s.end_time).length} terminów)
                  </span>
                </span>
                <button
                  onClick={() => handleDeleteSchedule(s)}
                  className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nadchodzące terminy */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">
          Nadchodzące terminy ({slots.length})
        </h3>
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak terminów</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {slots.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-secondary/40"
              >
                <span className="text-sm font-body">
                  {formatDate(a.slot_date)} {formatTime(a.slot_time)}
                </span>
                <span
                  className={`text-xs font-medium ${
                    a.status === "available" ? "text-green-600" : "text-amber-600"
                  }`}
                >
                  {a.status === "available" ? "Dostępny" : "Zarezerwowany"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rezerwacje */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">
          Rezerwacje egzaminów
        </h3>
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak rezerwacji</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-secondary/20"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {b.profiles?.display_name || "Użytkownik"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {b.exam_availability &&
                      `${formatDate(b.exam_availability.slot_date)} ${formatTime(b.exam_availability.slot_time)}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{b.amount_pln} zł</p>
                  {b.rescheduled && (
                    <span className="text-xs text-amber-600 font-medium">⚠ Przeniesiony</span>
                  )}
                </div>
                <button
                  onClick={() => handleCancelBooking(b.id, b.availability_id)}
                  disabled={cancelling === b.id}
                  className="h-9 px-4 rounded-lg bg-destructive/10 text-destructive font-body text-sm font-medium hover:bg-destructive/20 disabled:opacity-50 flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  {cancelling === b.id ? "Anuluję..." : "Anuluj i zwróć"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminExamManager;
