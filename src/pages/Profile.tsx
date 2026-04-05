import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Camera, Save, KeyRound, ChevronRight, ChevronDown, Trash2, User, Bell,
  Mail, MessageSquare, Smartphone, Monitor, LogOut, Lock, Palette, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";

type UiScale = "small" | "medium" | "large";

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

type OpenSection = "profile" | "notifications" | "ui" | "password" | null;

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
  const [openSection, setOpenSection] = useState<OpenSection>(null);

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
      toast.success("Profil zapisany");
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

  const firstName = profile.display_name
    ? profile.display_name.split(" ")[0]
    : user.user_metadata?.display_name?.split(" ")[0] || user.email?.split("@")[0] || "";

  const initials = profile.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : (user.email?.slice(0, 2).toUpperCase() ?? "?");

  const inputClass =
    "flex h-12 w-full rounded-xl border border-border/60 bg-background px-4 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200";

  const toggle = (section: OpenSection) =>
    setOpenSection((prev) => (prev === section ? null : section));

  const SettingsRow = ({
    icon: Icon,
    label,
    section,
    badge,
    children,
  }: {
    icon: any;
    label: string;
    section: OpenSection;
    badge?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    const isOpen = openSection === section;
    return (
      <div>
        <button
          onClick={() => toggle(section)}
          className="flex items-center w-full px-5 py-4 text-left hover:bg-muted/40 transition-colors duration-150"
        >
          <span className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center mr-4 shrink-0">
            <Icon size={18} className="text-muted-foreground" />
          </span>
          <span className="flex-1 text-[15px] font-body font-medium text-foreground">{label}</span>
          {badge}
          <ChevronRight
            size={18}
            className={`text-muted-foreground/60 transition-transform duration-200 ml-2 ${isOpen ? "rotate-90" : ""}`}
          />
        </button>
        {isOpen && (
          <div className="px-5 pb-5 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
            {children}
          </div>
        )}
      </div>
    );
  };

  const ActionRow = ({
    icon: Icon,
    label,
    onClick,
    variant = "default",
  }: {
    icon: any;
    label: string;
    onClick: () => void;
    variant?: "default" | "danger";
  }) => (
    <button
      onClick={onClick}
      className="flex items-center w-full px-5 py-4 text-left hover:bg-muted/40 transition-colors duration-150"
    >
      <span
        className={`w-9 h-9 rounded-xl flex items-center justify-center mr-4 shrink-0 ${
          variant === "danger" ? "bg-destructive/10" : "bg-muted/60"
        }`}
      >
        <Icon
          size={18}
          className={variant === "danger" ? "text-destructive" : "text-muted-foreground"}
        />
      </span>
      <span
        className={`flex-1 text-[15px] font-body font-medium ${
          variant === "danger" ? "text-destructive" : "text-foreground"
        }`}
      >
        {label}
      </span>
      <ChevronRight size={18} className="text-muted-foreground/60 ml-2" />
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-2 md:pt-12">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors mb-4"
        >
          <ArrowLeft size={22} className="text-foreground" />
        </button>
        <h1
          className={`font-display text-3xl sm:text-4xl font-extrabold text-foreground leading-tight transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Ustawienia i profil
        </h1>
      </div>

      <div
        className={`max-w-2xl mx-auto px-4 sm:px-6 pb-16 mt-6 transition-all duration-700 delay-100 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        {/* Profil section label */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-3">
          Profil
        </p>

        {/* Profile card */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden mb-8">
          {/* Avatar row */}
          <div className="flex items-center gap-4 px-5 py-5 border-b border-border/40">
            <div className="relative shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-border/60"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-muted border-2 border-border/60 flex items-center justify-center">
                  <span className="text-lg font-display font-bold text-muted-foreground">{initials}</span>
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
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold text-foreground truncate">
                {firstName || "Użytkownik"}
              </h3>
              <p className="text-sm text-muted-foreground font-body truncate">{user.email}</p>
            </div>
          </div>

          <SettingsRow icon={User} label="Dane osobowe" section="profile">
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground font-body block mb-2 uppercase tracking-wider">
                  Imię i nazwisko
                </label>
                <input
                  className={inputClass}
                  value={profile.display_name}
                  onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
                  placeholder="Twoja nazwa"
                  maxLength={50}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground font-body block mb-2 uppercase tracking-wider">
                  Bio
                </label>
                <textarea
                  className={`${inputClass} min-h-[100px] py-3 resize-none`}
                  value={profile.bio}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Napisz coś o sobie..."
                  maxLength={300}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right font-body">{profile.bio.length}/300</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-body font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <><Save size={16} /> Zapisz zmiany</>
                )}
              </button>
            </div>
          </SettingsRow>
        </div>

        {/* Ustawienia section */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-3">
          Ustawienia
        </p>

        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden mb-8">
          <SettingsRow icon={Bell} label="Powiadomienia" section="notifications">
            <div className="space-y-1 mt-1">
              {([
                { key: "notifications_web" as const, label: "Na stronie", icon: Monitor },
                { key: "notifications_email" as const, label: "E-mail", icon: Mail },
                { key: "notifications_sms" as const, label: "SMS", icon: Smartphone },
              ]).map(({ key, label, icon: RowIcon }) => (
                <label key={key} className="flex items-center justify-between py-3 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <RowIcon size={16} className="text-muted-foreground" />
                    <span className="text-sm font-body text-foreground">{label}</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={profile[key]}
                    onClick={() => setProfile((p) => ({ ...p, [key]: !p[key] }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
                      profile[key] ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full bg-card shadow-sm transition-transform duration-200 ${
                        profile[key] ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>
              ))}
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground font-body font-medium text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={15} /> Zapisz
              </button>
            </div>
          </SettingsRow>

          <div className="mx-5 border-t border-border/40" />

          <SettingsRow icon={Palette} label="Rozmiar elementów" section="ui">
            <div className="mt-1">
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
                      profile.ui_scale === value
                        ? "bg-card text-foreground shadow-sm border border-border/40"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-3 h-10 px-5 rounded-xl bg-primary text-primary-foreground font-body font-medium text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={15} /> Zapisz
              </button>
            </div>
          </SettingsRow>

          <div className="mx-5 border-t border-border/40" />

          <SettingsRow icon={Lock} label="Zmień hasło" section="password">
            <div className="space-y-3 mt-1">
              <input
                type="password"
                className={inputClass}
                placeholder="Nowe hasło (min. 6 znaków)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <input
                type="password"
                className={inputClass}
                placeholder="Potwierdź hasło"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                onClick={handlePasswordChange}
                disabled={changingPassword || !newPassword}
                className="h-10 px-5 rounded-xl bg-muted text-foreground font-body font-medium text-sm hover:bg-muted/80 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <KeyRound size={15} />
                {changingPassword ? "Zmieniam..." : "Zmień hasło"}
              </button>
            </div>
          </SettingsRow>
        </div>

        {/* Konto section */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-3">
          Konto
        </p>

        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <ActionRow icon={LogOut} label="Wyloguj się" onClick={handleLogout} />

          <div className="mx-5 border-t border-border/40" />

          {!showDeleteConfirm ? (
            <ActionRow icon={Trash2} label="Usuń konto" onClick={() => setShowDeleteConfirm(true)} variant="danger" />
          ) : (
            <div className="px-5 py-4">
              <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 space-y-3">
                <p className="text-sm font-body text-foreground">
                  Czy na pewno chcesz usunąć konto? Ta operacja jest nieodwracalna.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    className="h-9 px-4 rounded-lg bg-destructive text-destructive-foreground font-body font-medium text-sm hover:bg-destructive/90 transition-all"
                  >
                    Tak, usuń
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="h-9 px-4 rounded-lg bg-muted text-foreground font-body font-medium text-sm hover:bg-muted/80 transition-all"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
