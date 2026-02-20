import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ExamAvailabilityRow {
  id: string;
  examiner_id: string;
  slot_date: string;
  slot_time: string;
  status: string;
}

interface ExamBookingRow {
  id: string;
  user_id: string;
  availability_id: string;
  status: string;
  amount_pln: number;
  created_at: string;
  profiles?: { display_name: string | null } | null;
  exam_availability?: {
    slot_date: string;
    slot_time: string;
    examiner_id: string;
  } | null;
}

const AdminExamManager = () => {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<ExamAvailabilityRow[]>([]);
  const [bookings, setBookings] = useState<ExamBookingRow[]>([]);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [adding, setAdding] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const loadAvailability = async () => {
    const { data } = await supabase
      .from("exam_availability")
      .select("*")
      .eq("examiner_id", user!.id)
      .gte("slot_date", new Date().toISOString().slice(0, 10))
      .order("slot_date", { ascending: true })
      .order("slot_time", { ascending: true });
    setAvailability(data || []);
  };

  const loadBookings = async () => {
    const availabilityIds = (await supabase
      .from("exam_availability")
      .select("id")
      .eq("examiner_id", user!.id))
      .data?.map((a) => a.id) || [];
    if (availabilityIds.length === 0) {
      setBookings([]);
      return;
    }
    const { data } = await supabase
      .from("exam_bookings")
      .select(`
        *,
        exam_availability (slot_date, slot_time, examiner_id)
      `)
      .in("availability_id", availabilityIds)
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

    const profileMap = new Map(profiles?.map((p: any) => [p.user_id, { display_name: p.display_name }]) || []);

    setBookings(
      data.map((b: any) => ({
        ...b,
        profiles: profileMap.get(b.user_id) || null,
      }))
    );
  };

  useEffect(() => {
    if (user) {
      loadAvailability();
      loadBookings();
    }
  }, [user]);

  const handleAddSlot = async () => {
    if (!user || !newDate || !newTime) return;
    setAdding(true);
    const { error } = await supabase.from("exam_availability").insert({
      examiner_id: user.id,
      slot_date: newDate,
      slot_time: newTime + (newTime.length === 5 ? ":00" : ""),
      status: "available",
    });
    if (error) {
      toast.error("Błąd dodawania terminu");
      setAdding(false);
      return;
    }
    toast.success("Termin dodany");
    setNewDate("");
    setNewTime("");
    loadAvailability();
    setAdding(false);
  };

  const handleCancelBooking = async (bookingId: string, availabilityId: string) => {
    setCancelling(bookingId);
    const { error: updErr } = await supabase
      .from("exam_bookings")
      .update({ status: "refunded" })
      .eq("id", bookingId);
    if (updErr) {
      toast.error("Błąd anulowania");
      setCancelling(null);
      return;
    }
    await supabase
      .from("exam_availability")
      .update({ status: "available" })
      .eq("id", availabilityId);
    toast.success("Egzamin anulowany. Zwrot 19,99 zł.");
    loadBookings();
    loadAvailability();
    setCancelling(null);
  };

  const formatDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("pl-PL", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  const formatTime = (t: string) => (typeof t === "string" ? t.slice(0, 5) : t);

  return (
    <div className="space-y-8">
      {/* Dodawanie dostępności */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">
          Dodaj godziny dostępności
        </h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Data
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm font-body"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Godzina
            </label>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm font-body"
            />
          </div>
          <button
            onClick={handleAddSlot}
            disabled={adding || !newDate || !newTime}
            className="h-10 px-4 rounded-lg bg-primary text-primary-foreground font-body text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Plus size={16} />
            {adding ? "Dodaję..." : "Dodaj termin"}
          </button>
        </div>
      </div>

      {/* Lista dostępności */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">
          Twoje dostępne terminy
        </h3>
        {availability.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak dodanych terminów</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {availability.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/40"
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

      {/* Rezerwacje – anulowanie i zwrot */}
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
                className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-slate-50/50 dark:bg-slate-900/30"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {(b as any).profiles?.display_name || "Użytkownik"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {b.exam_availability &&
                      `${formatDate(b.exam_availability.slot_date)} ${formatTime(b.exam_availability.slot_time)}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{b.amount_pln} zł</p>
                </div>
                <button
                  onClick={() =>
                    handleCancelBooking(b.id, b.availability_id)
                  }
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
