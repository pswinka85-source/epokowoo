import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Camera, Save, KeyRound, ChevronRight, Trash2, Mail, Smartphone, Monitor, Moon, Sun, AlertTriangle,
  UserCircle, ShieldCheck, Bell, Palette
} from "lucide-react";
import { toast } from "sonner";

type UiScale = "small" | "medium" | "large";
type TextSize = "small" | "medium" | "large";
type ActiveCategory = "konto" | "haslo" | "powiadomienia" | "preferencje" | null;
type OpenSection = "dane" | "plany" | "password" | "delete" | "report" | null;

interface ProfileData {
  display_name: string;
  phone: string;
  bio: string;
  avatar_url: string;
  notifications_web: boolean;
  notifications_email: boolean;
  notifications_sms: boolean;
  ui_scale: UiScale;
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData>({
    display_name: "",
    phone: "",
    bio: "",
    avatar_url: "",
    notifications_web: true,
    notifications_email: true,
    notifications_sms: false,
    ui_scale: "medium",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>(null);
  const [openSection, setOpenSection] = useState<OpenSection>(null);
  const [textSize, setTextSize] = useState<TextSize>("medium");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (error) toast.error("Nie udało się załadować profilu");
        if (data) {
          setProfile({
            display_name: data.display_name || "",
            phone: (data as any).phone || "",
            bio: (data as any).bio || "",
            avatar_url: (data as any).avatar_url || "",
            notifications_web: (data as any).notifications_web ?? true,
            notifications_email: (data as any).notifications_email ?? true,
            notifications_sms: (data as any).notifications_sms ?? false,
            ui_scale: ((data as any).ui_scale as UiScale) || "medium",
          });
        }
      } catch {
        toast.error("Wystąpił nieoczekiwany błąd");
      }
    };
    fetchProfile();
  }, [user, navigate]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Maksymalny rozmiar pliku to 2 MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Błąd przesyłania zdjęcia"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatar_url = urlData.publicUrl + "?t=" + Date.now();
    setProfile((p) => ({ ...p, avatar_url }));
    await supabase.from("profiles").update({ avatar_url } as any).eq("user_id", user.id);
    toast.success("Zdjęcie zaktualizowane");
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name,
        phone: profile.phone,
        bio: profile.bio,
        notifications_web: profile.notifications_web,
        notifications_email: profile.notifications_email,
        notifications_sms: profile.notifications_sms,
        ui_scale: profile.ui_scale,
      } as any)
      .eq("user_id", user.id);
    if (error) toast.error("Błąd zapisu");
    else {
      await supabase.auth.updateUser({ data: { display_name: profile.display_name } });
      toast.success("Zapisano zmiany");
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) { toast.error("Hasło musi mieć min. 6 znaków"); return; }
    if (newPassword !== confirmPassword) { toast.error("Hasła się nie zgadzają"); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Hasło zmienione"); setNewPassword(""); setConfirmPassword(""); }
    setChangingPassword(false);
  };

  const handleDeleteAccount = async () => {
    toast.error("Aby usunąć konto, skontaktuj się z administracją.");
    setShowDeleteConfirm(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error("Błąd wylogowania");
    else { toast.success("Wylogowano pomyślnie"); navigate("/"); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-body">Ładowanie...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-body">Brak dostępu. Przekierowywanie...</p>
      </div>
    );
  }

  const inputClass =
    "flex h-12 w-full rounded-xl border border-border/60 bg-background px-4 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200";

  const categories = [
    { id: "konto" as const, label: "Konto", icon: UserCircle, color: "text-blue-500" },
    { id: "haslo" as const, label: "Hasło i Zabezpieczenia", icon: ShieldCheck, color: "text-amber-500" },
    { id: "powiadomienia" as const, label: "Powiadomienia", icon: Bell, color: "text-orange-500" },
    { id: "preferencje" as const, label: "Preferencje Wyglądu", icon: Palette, color: "text-purple-500" },
  ];

  const toggleSection = (section: OpenSection) =>
    setOpenSection((prev) => (prev === section ? null : section));

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case "konto":
        return (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Dane osobowe */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <button
                onClick={() => toggleSection("dane")}
                className="flex items-center w-full px-5 py-4 text-left hover:bg-muted/40 transition-colors"
              >
                <span className="flex-1 text-[15px] font-body font-medium text-foreground">Dane osobowe</span>
                <ChevronRight size={18} className={`text-muted-foreground/60 transition-transform duration-200 ${openSection === "dane" ? "rotate-90" : ""}`} />
              </button>
              {openSection === "dane" && (
                <div className="px-5 pb-5 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-4">
                    {/* Avatar */}
                    <div className="flex items-center gap-4 mb-2">
                      <div className="relative shrink-0">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover border-2 border-border/60" />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-muted border-2 border-border/60 flex items-center justify-center">
                            <span className="text-lg font-display font-bold text-muted-foreground">
                              {profile.display_name ? profile.display_name.slice(0, 2).toUpperCase() : (user.email?.slice(0, 2).toUpperCase() ?? "?")}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center border-2 border-card hover:bg-primary/90 active:scale-95 transition-all"
                        >
                          {uploading ? (
                            <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          ) : (
                            <Camera size={13} />
                          )}
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground font-body block mb-2 uppercase tracking-wider">Imię i nazwisko</label>
                      <input className={inputClass} value={profile.display_name} onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))} placeholder="Twoja nazwa" maxLength={50} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground font-body block mb-2 uppercase tracking-wider">Adres e-mail</label>
                      <input className={inputClass} value={user.email || ""} disabled />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground font-body block mb-2 uppercase tracking-wider">Numer telefonu</label>
                      <input className={inputClass} value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="+48 ..." maxLength={15} />
                    </div>
                    <button onClick={handleSave} disabled={saving} className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-body font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2">
                      {saving ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><Save size={16} /> Zapisz zmiany</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Plany i subskrypcje */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <button
                onClick={() => toggleSection("plany")}
                className="flex items-center w-full px-5 py-4 text-left hover:bg-muted/40 transition-colors"
              >
                <span className="flex-1 text-[15px] font-body font-medium text-foreground">Plany i Subskrypcje</span>
                <ChevronRight size={18} className={`text-muted-foreground/60 transition-transform duration-200 ${openSection === "plany" ? "rotate-90" : ""}`} />
              </button>
              {openSection === "plany" && (
                <div className="px-5 pb-5 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <p className="text-sm text-muted-foreground font-body">Aktualnie nie posiadasz aktywnych subskrypcji.</p>
                </div>
              )}
            </div>
          </div>
        );

      case "haslo":
        return (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Zmień hasło */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <button
                onClick={() => toggleSection("password")}
                className="flex items-center w-full px-5 py-4 text-left hover:bg-muted/40 transition-colors"
              >
                <span className="flex-1 text-[15px] font-body font-medium text-foreground">Zmień hasło</span>
                <ChevronRight size={18} className={`text-muted-foreground/60 transition-transform duration-200 ${openSection === "password" ? "rotate-90" : ""}`} />
              </button>
              {openSection === "password" && (
                <div className="px-5 pb-5 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-3">
                    <input type="password" className={inputClass} placeholder="Nowe hasło (min. 6 znaków)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    <input type="password" className={inputClass} placeholder="Potwierdź hasło" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    <button onClick={handlePasswordChange} disabled={changingPassword || !newPassword} className="h-10 px-5 rounded-xl bg-muted text-foreground font-body font-medium text-sm hover:bg-muted/80 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2">
                      <KeyRound size={15} />
                      {changingPassword ? "Zmieniam..." : "Zmień hasło"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Usuń konto */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              {!showDeleteConfirm ? (
                <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center w-full px-5 py-4 text-left hover:bg-destructive/5 transition-colors">
                  <Trash2 size={18} className="text-destructive mr-3" />
                  <span className="flex-1 text-[15px] font-body font-medium text-destructive">Usuń konto</span>
                </button>
              ) : (
                <div className="px-5 py-4">
                  <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 space-y-3">
                    <p className="text-sm font-body text-foreground">Czy na pewno chcesz usunąć konto? Ta operacja jest nieodwracalna.</p>
                    <div className="flex gap-2">
                      <button onClick={handleDeleteAccount} className="h-9 px-4 rounded-lg bg-destructive text-destructive-foreground font-body font-medium text-sm hover:bg-destructive/90 transition-all">Tak, usuń</button>
                      <button onClick={() => setShowDeleteConfirm(false)} className="h-9 px-4 rounded-lg bg-muted text-foreground font-body font-medium text-sm hover:bg-muted/80 transition-all">Anuluj</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Zgłoś problem */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <button onClick={() => navigate("/kontakt")} className="flex items-center w-full px-5 py-4 text-left hover:bg-muted/40 transition-colors">
                <AlertTriangle size={18} className="text-muted-foreground mr-3" />
                <span className="flex-1 text-[15px] font-body font-medium text-foreground">Zgłoś problem</span>
                <ChevronRight size={18} className="text-muted-foreground/60" />
              </button>
            </div>
          </div>
        );

      case "powiadomienia":
        return (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
              {[
                { key: "notifications_web" as const, label: "Zezwalaj na wysyłanie powiadomień przez platformę", icon: Monitor, locked: true },
                { key: "notifications_email" as const, label: "Zezwalaj na wysyłanie powiadomień na adres e-mail", icon: Mail, locked: false },
                { key: "notifications_sms" as const, label: "Zezwalaj na wysyłanie powiadomień przez numer telefonu", icon: Smartphone, locked: false },
              ].map(({ key, label, icon: RowIcon, locked }) => (
                <label key={key} className="flex items-center justify-between px-5 py-4 cursor-pointer">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <RowIcon size={16} className="text-muted-foreground shrink-0" />
                    <span className="text-sm font-body text-foreground">{label}</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={profile[key]}
                    disabled={locked}
                    onClick={() => !locked && setProfile((p) => ({ ...p, [key]: !p[key] }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
                      profile[key] ? "bg-primary" : "bg-muted"
                    } ${locked ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <span className={`block h-5 w-5 rounded-full bg-card shadow-sm transition-transform duration-200 ${profile[key] ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </label>
              ))}
            </div>
            <button onClick={handleSave} disabled={saving} className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-body font-medium text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2">
              <Save size={15} /> Zapisz
            </button>
          </div>
        );

      case "preferencje":
        return (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
              {/* Motyw */}
              <div className="px-5 py-4">
                <p className="text-sm font-body font-medium text-foreground mb-3">Motyw</p>
                <div className="flex rounded-xl bg-muted/50 p-1">
                  {[
                    { value: "light" as const, label: "Jasny", icon: Sun },
                    { value: "dark" as const, label: "Ciemny", icon: Moon },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={`flex-1 h-9 rounded-lg text-sm font-body font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        theme === value ? "bg-card text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rozmiar elementów */}
              <div className="px-5 py-4">
                <p className="text-sm font-body font-medium text-foreground mb-3">Rozmiar elementów</p>
                <div className="flex rounded-xl bg-muted/50 p-1">
                  {([
                    { value: "small" as UiScale, label: "Mały" },
                    { value: "medium" as UiScale, label: "Średni" },
                    { value: "large" as UiScale, label: "Duży" },
                  ]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setProfile((p) => ({ ...p, ui_scale: value }))}
                      className={`flex-1 h-9 rounded-lg text-sm font-body font-medium transition-all duration-200 ${
                        profile.ui_scale === value ? "bg-card text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rozmiar tekstu */}
              <div className="px-5 py-4">
                <p className="text-sm font-body font-medium text-foreground mb-3">Rozmiar tekstu</p>
                <div className="flex rounded-xl bg-muted/50 p-1">
                  {([
                    { value: "small" as TextSize, label: "Mały" },
                    { value: "medium" as TextSize, label: "Średni" },
                    { value: "large" as TextSize, label: "Duży" },
                  ]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setTextSize(value)}
                      className={`flex-1 h-9 rounded-lg text-sm font-body font-medium transition-all duration-200 ${
                        textSize === value ? "bg-card text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving} className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-body font-medium text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2">
              <Save size={15} /> Zapisz
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10 md:pt-20 md:pb-14">
        <h1
          className={`font-display text-3xl md:text-4xl font-extrabold text-foreground leading-[1.1] mb-2 transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Twoje Ustawienia
        </h1>
      </div>

      <div className={`max-w-2xl mx-auto px-4 sm:px-6 pb-16 transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        {activeCategory === null ? (
          /* Main categories grid */
          <div className="space-y-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setOpenSection(null); }}
                  className="flex items-center w-full rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-left hover:bg-muted/40 hover:border-border transition-all duration-200 group"
                >
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 shrink-0">
                    <Icon size={22} className={cat.color} />
                  </span>
                  <span className="flex-1 text-[15px] font-display font-semibold text-foreground">{cat.label}</span>
                  <ChevronRight size={18} className="text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
                </button>
              );
            })}
          </div>
        ) : (
          /* Category detail view */
          <div>
            <button
              onClick={() => { setActiveCategory(null); setOpenSection(null); setShowDeleteConfirm(false); }}
              className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors mb-5"
            >
              <ChevronRight size={16} className="rotate-180" />
              Powrót do ustawień
            </button>

            {(() => {
              const activeCat = categories.find((c) => c.id === activeCategory);
              const Icon = activeCat?.icon;
              return (
                <div className="flex items-center gap-3 mb-6">
                  {Icon && <Icon size={24} className={activeCat?.color} />}
                  <h2 className="text-xl font-display font-bold text-foreground">
                    {activeCat?.label}
                  </h2>
                </div>
              );
            })()}

            {renderCategoryContent()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
