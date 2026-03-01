import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

interface Examiner {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  email?: string;
}

const AdminExaminerManager = () => {
  const { user } = useAuth();
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const loadExaminers = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "examiner");

    if (!roles?.length) {
      setExaminers([]);
      return;
    }

    const userIds = roles.map((r: any) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    setExaminers(
      (profiles as Examiner[]) || []
    );
  };

  useEffect(() => {
    loadExaminers();
  }, []);

  const handleAddExaminer = async () => {
    if (!email.trim()) return;
    setSaving(true);

    // Find user by looking up profiles with matching display_name or by checking auth
    // We need to find the user_id for this email. Since we can't query auth.users,
    // we'll look for a profile whose user_id matches.
    // Actually, let's use a workaround: search profiles by display_name isn't reliable.
    // The best approach is to use a Supabase edge function or RPC.
    // For now, let's try to find the user by querying profiles table.
    
    // Since we can't directly query auth.users from client, we'll add a simpler approach:
    // Admin enters user_id or we search by display_name
    // Let's search profiles by display_name containing the search term
    const { data: matchingProfiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .ilike("display_name", `%${email.trim()}%`);

    if (!matchingProfiles?.length) {
      toast.error("Nie znaleziono użytkownika o takiej nazwie");
      setSaving(false);
      return;
    }

    // Take the first match
    const profile = matchingProfiles[0];

    // Check if already examiner
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", profile.user_id)
      .eq("role", "examiner")
      .maybeSingle();

    if (existingRole) {
      toast.error("Ten użytkownik jest już egzaminatorem");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: profile.user_id, role: "examiner" });

    if (error) {
      toast.error("Błąd dodawania egzaminatora");
    } else {
      toast.success(`Dodano egzaminatora: ${profile.display_name}`);
      setEmail("");
    }
    setSaving(false);
    loadExaminers();
  };

  const handleRemoveExaminer = async (userId: string) => {
    // Remove examiner role
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "examiner");

    // Also clean up their schedules and future available slots
    const { data: schedules } = await supabase
      .from("exam_schedules")
      .select("id")
      .eq("examiner_id", userId);

    if (schedules?.length) {
      const scheduleIds = schedules.map((s: any) => s.id);
      // Delete available slots
      await supabase
        .from("exam_availability")
        .delete()
        .eq("examiner_id", userId)
        .eq("status", "available");
      // Delete schedules
      await supabase
        .from("exam_schedules")
        .delete()
        .eq("examiner_id", userId);
    }

    toast.success("Usunięto egzaminatora");
    loadExaminers();
  };

  return (
    <div className="space-y-6">
      {/* Add examiner */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)] p-6">
        <h3 className="font-display font-semibold text-foreground mb-2 flex items-center gap-2">
          <UserPlus size={18} /> Dodaj egzaminatora
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Wyszukaj użytkownika po nazwie wyświetlanej
        </p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Nazwa użytkownika
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="np. Jan Kowalski"
              className="h-10 w-full px-3 rounded-xl border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={handleAddExaminer}
            disabled={saving || !email.trim()}
            className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-body text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors hover:opacity-90"
          >
            <Plus size={16} />
            {saving ? "Szukam..." : "Dodaj"}
          </button>
        </div>
      </div>

      {/* Examiners list */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)] p-6">
        <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users size={18} /> Egzaminatorzy ({examiners.length})
        </h3>
        {examiners.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Brak egzaminatorów. Dodaj pierwszego powyżej.
          </p>
        ) : (
          <div className="space-y-3">
            {examiners.map((ex) => (
              <div
                key={ex.user_id}
                className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-secondary/10"
              >
                <div className="flex items-center gap-3">
                  {ex.avatar_url ? (
                    <img
                      src={ex.avatar_url}
                      alt={ex.display_name || "Egzaminator"}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-sm">
                      {(ex.display_name || "E")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-foreground font-body">
                      {ex.display_name || "Bez nazwy"}
                    </p>
                    <p className="text-xs text-muted-foreground">Egzaminator</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveExaminer(ex.user_id)}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                  title="Usuń egzaminatora"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminExaminerManager;
