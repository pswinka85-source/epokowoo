import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, UserPlus, Users, Pencil, X, Check, Upload } from "lucide-react";
import { toast } from "sonner";

interface Examiner {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface SearchResult {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const AdminExaminerManager = () => {
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadExaminers = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "examiner");

    if (!roles?.length) { setExaminers([]); return; }

    const userIds = roles.map((r: any) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, bio")
      .in("user_id", userIds);

    setExaminers((profiles as Examiner[]) || []);
  };

  useEffect(() => { loadExaminers(); }, []);

  // Search users as admin types
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .ilike("display_name", `%${searchQuery.trim()}%`)
        .limit(8);
      
      // Filter out existing examiners
      const examinerIds = new Set(examiners.map(e => e.user_id));
      setSearchResults((data || []).filter((p: any) => !examinerIds.has(p.user_id)));
      setShowDropdown(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, examiners]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAddExaminer = async (profile: SearchResult) => {
    setSaving(true);
    setShowDropdown(false);
    setSearchQuery("");

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
      console.error(error);
    } else {
      toast.success(`Dodano egzaminatora: ${profile.display_name}`);
    }
    setSaving(false);
    loadExaminers();
  };

  const handleRemoveExaminer = async (userId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tego egzaminatora? Wszystkie jego harmonogramy i przyszłe terminy zostaną usunięte.")) return;

    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "examiner");
    await supabase.from("exam_availability").delete().eq("examiner_id", userId).eq("status", "available");
    await supabase.from("exam_schedules").delete().eq("examiner_id", userId);

    toast.success("Usunięto egzaminatora");
    loadExaminers();
  };

  const startEditing = (ex: Examiner) => {
    setEditingId(ex.user_id);
    setEditName(ex.display_name || "");
    setEditBio(ex.bio || "");
  };

  const saveProfile = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: editName, bio: editBio })
      .eq("user_id", userId);

    if (error) {
      toast.error("Błąd zapisu profilu");
    } else {
      toast.success("Profil zaktualizowany");
    }
    setEditingId(null);
    loadExaminers();
  };

  const handleAvatarUpload = async (userId: string, file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Wybierz plik obrazu"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Maksymalny rozmiar: 5MB"); return; }

    setUploadingAvatar(userId);
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Błąd przesyłania zdjęcia");
      setUploadingAvatar(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = urlData.publicUrl + `?t=${Date.now()}`;

    await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", userId);

    toast.success("Zdjęcie zaktualizowane");
    setUploadingAvatar(null);
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
        <div className="relative" ref={dropdownRef}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            placeholder="Wpisz min. 2 znaki aby wyszukać..."
            className="h-10 w-full px-3 rounded-xl border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {saving && (
            <div className="absolute right-3 top-2.5">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {/* Search results dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border/60 bg-card shadow-[var(--shadow-elevated)] overflow-hidden">
              {searchResults.map((p) => (
                <button
                  key={p.user_id}
                  onClick={() => handleAddExaminer(p)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-xs">
                      {(p.display_name || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground">{p.display_name || "Bez nazwy"}</span>
                  <Plus size={14} className="ml-auto text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {showDropdown && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border/60 bg-card shadow-[var(--shadow-elevated)] p-4">
              <p className="text-sm text-muted-foreground text-center">Nie znaleziono użytkowników</p>
            </div>
          )}
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
              <div key={ex.user_id} className="rounded-xl border border-border/60 bg-secondary/10 overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar with upload overlay */}
                    <div className="relative group">
                      {ex.avatar_url ? (
                        <img src={ex.avatar_url} alt={ex.display_name || "Egzaminator"} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-sm">
                          {(ex.display_name || "E")[0].toUpperCase()}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          fileInputRef.current?.setAttribute("data-user-id", ex.user_id);
                          fileInputRef.current?.click();
                        }}
                        className="absolute inset-0 rounded-full bg-foreground/0 group-hover:bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                        title="Zmień zdjęcie"
                      >
                        {uploadingAvatar === ex.user_id ? (
                          <div className="w-4 h-4 border-2 border-background/50 border-t-background rounded-full animate-spin" />
                        ) : (
                          <Upload size={14} className="text-background" />
                        )}
                      </button>
                    </div>

                    <div>
                      {editingId === ex.user_id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 px-2 rounded-lg border border-input bg-background text-sm font-body font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      ) : (
                        <p className="font-medium text-foreground font-body">{ex.display_name || "Bez nazwy"}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Egzaminator</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {editingId === ex.user_id ? (
                      <>
                        <button onClick={() => saveProfile(ex.user_id)} className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="Zapisz">
                          <Check size={16} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Anuluj">
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEditing(ex)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Edytuj profil">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleRemoveExaminer(ex.user_id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Usuń egzaminatora">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Bio editing area */}
                {editingId === ex.user_id && (
                  <div className="px-4 pb-4 pt-0">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Opis / bio</label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Krótki opis egzaminatora..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>
                )}

                {/* Bio display */}
                {editingId !== ex.user_id && ex.bio && (
                  <div className="px-4 pb-4 pt-0">
                    <p className="text-xs text-muted-foreground">{ex.bio}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const userId = fileInputRef.current?.getAttribute("data-user-id");
          if (file && userId) handleAvatarUpload(userId, file);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default AdminExaminerManager;
