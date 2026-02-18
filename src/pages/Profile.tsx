import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Save, Trash2, KeyRound, Bell, Monitor, ChevronDown } from "lucide-react";
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

const Profile = () => {
  const { user, loading: authLoading, signOut } = useAuth();
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

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sections
  const [openSection, setOpenSection] = useState<"profile" | "settings">("profile");

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
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
    };
    fetchProfile();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Maksymalny rozmiar pliku to 2 MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Błąd przesyłania zdjęcia");
      setUploading(false);
      return;
    }
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
    else toast.success("Profil zapisany");
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast.error("Hasło musi mieć min. 6 znaków");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Hasła się nie zgadzają");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else {
      toast.success("Hasło zmienione");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  const handleDeleteAccount = async () => {
    toast.error("Aby usunąć konto, skontaktuj się z administracją.");
    setShowDeleteConfirm(false);
  };

  if (authLoading || !user) return null;

  const initials = profile.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : (user.email?.slice(0, 2).toUpperCase() ?? "?");

  const inputClass =
    "flex h-12 w-full rounded-xl border border-input bg-background px-4 text-sm font-body ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-200";

  const labelClass = "text-xs font-medium text-muted-foreground font-body block mb-2 uppercase tracking-wider";

  const sectionButton = (section: "profile" | "settings", label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setOpenSection(openSection === section ? section : section)}
      className={`flex items-center gap-3 w-full px-5 py-4 text-left font-display font-semibold text-base transition-colors ${
        openSection === section ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
      <ChevronDown
        size={16}
        className={`ml-auto transition-transform duration-300 ${openSection === section ? "rotate-180" : ""}`}
      />
    </button>
  );

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div
        className={`max-w-xl mx-auto transition-all duration-700 ease-out ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        {/* Header */}
        <h1 className="font-display text-2xl font-bold text-foreground mb-8">Mój profil</h1>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-card shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/10 border-4 border-card shadow-md flex items-center justify-center">
                <span className="text-2xl font-display font-bold text-primary">{initials}</span>
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 active:scale-95 transition-all"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Camera size={16} />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <p className="text-sm text-muted-foreground font-body mt-3">{user.email}</p>
        </div>

        {/* Profile section */}
        <div className="rounded-3xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden mb-4">
          {sectionButton("profile", "Dane profilu", <Monitor size={18} />)}
          {openSection === "profile" && (
            <div className="px-5 pb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div>
                <label className={labelClass}>Nazwa wyświetlana</label>
                <input
                  className={inputClass}
                  value={profile.display_name}
                  onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
                  placeholder="Twoja nazwa"
                  maxLength={50}
                />
              </div>
              <div>
                <label className={labelClass}>Numer telefonu</label>
                <input
                  className={inputClass}
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+48 123 456 789"
                  maxLength={20}
                />
              </div>
              <div>
                <label className={labelClass}>Bio</label>
                <textarea
                  className={`${inputClass} min-h-[100px] py-3 resize-none`}
                  value={profile.bio}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Napisz coś o sobie..."
                  maxLength={300}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right font-body">
                  {profile.bio.length}/300
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Settings section */}
        <div className="rounded-3xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden mb-6">
          {sectionButton("settings", "Ustawienia", <Bell size={18} />)}
          {openSection === "settings" && (
            <div className="px-5 pb-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Notifications */}
              <div>
                <p className={labelClass}>Powiadomienia</p>
                <div className="space-y-3">
                  {([
                    { key: "notifications_web" as const, label: "Na stronie" },
                    { key: "notifications_email" as const, label: "E-mail" },
                    { key: "notifications_sms" as const, label: "SMS" },
                  ]).map(({ key, label }) => (
                    <label key={key} className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm font-body text-foreground">{label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={profile[key]}
                        onClick={() => setProfile((p) => ({ ...p, [key]: !p[key] }))}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
                          profile[key] ? "bg-primary" : "bg-input"
                        }`}
                      >
                        <span
                          className={`block h-5 w-5 rounded-full bg-card shadow-md transition-transform duration-200 ${
                            profile[key] ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </label>
                  ))}
                </div>
              </div>

              {/* UI Scale */}
              <div>
                <p className={labelClass}>Rozmiar elementów</p>
                <div className="flex rounded-2xl bg-secondary p-1">
                  {([
                    { value: "small" as UiScale, label: "Mały" },
                    { value: "medium" as UiScale, label: "Średni" },
                    { value: "large" as UiScale, label: "Duży" },
                  ]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setProfile((p) => ({ ...p, ui_scale: value }))}
                      className={`flex-1 h-9 rounded-xl text-sm font-body font-medium transition-all duration-300 ${
                        profile.ui_scale === value
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Change password */}
              <div>
                <p className={labelClass}>Zmień hasło</p>
                <div className="space-y-3">
                  <input
                    type="password"
                    className={inputClass}
                    placeholder="Nowe hasło"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                  />
                  <input
                    type="password"
                    className={inputClass}
                    placeholder="Potwierdź hasło"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                  />
                  <button
                    onClick={handlePasswordChange}
                    disabled={changingPassword || !newPassword}
                    className="h-10 px-5 rounded-xl bg-secondary text-secondary-foreground font-body font-medium text-sm hover:bg-secondary/80 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    <KeyRound size={15} />
                    {changingPassword ? "Zmieniam..." : "Zmień hasło"}
                  </button>
                </div>
              </div>

              {/* Delete account */}
              <div className="pt-4 border-t border-border">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="h-10 px-5 rounded-xl bg-destructive/10 text-destructive font-body font-medium text-sm hover:bg-destructive/20 active:scale-[0.98] transition-all duration-200 flex items-center gap-2"
                  >
                    <Trash2 size={15} />
                    Usuń konto
                  </button>
                ) : (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 space-y-3 animate-in fade-in duration-300">
                    <p className="text-sm font-body text-destructive">
                      Czy na pewno chcesz usunąć konto? Ta operacja jest nieodwracalna.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteAccount}
                        className="h-9 px-4 rounded-xl bg-destructive text-destructive-foreground font-body font-medium text-sm hover:bg-destructive/90 transition-all"
                      >
                        Tak, usuń
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="h-9 px-4 rounded-xl bg-secondary text-secondary-foreground font-body font-medium text-sm hover:bg-secondary/80 transition-all"
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-body font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>
              <Save size={16} />
              Zapisz zmiany
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Profile;
