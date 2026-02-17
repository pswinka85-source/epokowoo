import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    if (isForgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setError(error.message);
      else setMessage("Sprawdź swoją skrzynkę e-mail — wysłaliśmy link do resetowania hasła.");
      setSubmitting(false);
      return;
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else navigate("/");
    } else {
      if (!firstName.trim() || !lastName.trim()) {
        setError("Podaj imię i nazwisko.");
        setSubmitting(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: `${firstName.trim()} ${lastName.trim()}` },
        },
      });
      if (error) setError(error.message);
      else setMessage("Sprawdź swoją skrzynkę e-mail, aby potwierdzić rejestrację.");
    }
    setSubmitting(false);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setIsForgot(false);
    setError("");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/[0.03] rounded-full blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/[0.04] rounded-full blur-[80px]" />

      <div
        className={`relative w-full max-w-[420px] transition-all duration-700 ease-out ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >

        {/* Card */}
        <div className="rounded-3xl border border-border bg-card p-8 md:p-10 shadow-[var(--shadow-elevated)]">
          {/* Tab switcher */}
          {!isForgot && (
            <div className="flex rounded-2xl bg-secondary p-1 mb-8">
              <button
                onClick={() => { setIsLogin(true); setIsForgot(false); setError(""); setMessage(""); }}
                className={`flex-1 h-10 rounded-xl text-sm font-body font-semibold transition-all duration-300 ${
                  isLogin
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Logowanie
              </button>
              <button
                onClick={() => { setIsLogin(false); setIsForgot(false); setError(""); setMessage(""); }}
                className={`flex-1 h-10 rounded-xl text-sm font-body font-semibold transition-all duration-300 ${
                  !isLogin
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Rejestracja
              </button>
            </div>
          )}

          {/* Heading */}
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {isForgot ? "Resetowanie hasła" : isLogin ? "Witaj ponownie" : "Stwórz konto"}
            </h1>
            <p className="text-muted-foreground font-body text-sm mt-1.5">
              {isForgot
                ? "Podaj adres e-mail, a wyślemy Ci link do resetowania"
                : isLogin
                ? "Zaloguj się, aby kontynuować naukę"
                : "Dołącz i zacznij naukę już dziś"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name fields for registration */}
            {!isLogin && !isForgot && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground font-body block mb-2 uppercase tracking-wider">
                    Imię
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="flex h-12 w-full rounded-xl border border-input bg-background px-4 text-sm font-body ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-200"
                    placeholder="Jan"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground font-body block mb-2 uppercase tracking-wider">
                    Nazwisko
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="flex h-12 w-full rounded-xl border border-input bg-background px-4 text-sm font-body ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-200"
                    placeholder="Kowalski"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-xs font-medium text-muted-foreground font-body block mb-2 uppercase tracking-wider">
                Adres e-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-input bg-background px-4 text-sm font-body ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-200"
                placeholder="jan@przykład.pl"
              />
            </div>

            {/* Password */}
            {!isForgot && (
              <div>
                <label className="text-xs font-medium text-muted-foreground font-body block mb-2 uppercase tracking-wider">
                  Hasło
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex h-12 w-full rounded-xl border border-input bg-background px-4 pr-11 text-sm font-body ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-200"
                    placeholder="Min. 6 znaków"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => { setIsForgot(true); setError(""); setMessage(""); }}
                    className="text-xs text-primary font-body mt-2 hover:underline"
                  >
                    Zapomniałeś hasła?
                  </button>
                )}
              </div>
            )}

            {/* Messages */}
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300">
                <p className="text-sm text-destructive font-body">{error}</p>
              </div>
            )}
            {message && (
              <div className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300">
                <p className="text-sm text-primary font-body">{message}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-body font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-md hover:shadow-lg"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : isForgot ? (
                "Wyślij link"
              ) : (
                isLogin ? "Zaloguj się" : "Zarejestruj się"
              )}
            </button>

            {isForgot && (
              <button
                type="button"
                onClick={() => { setIsForgot(false); setError(""); setMessage(""); }}
                className="w-full text-sm text-muted-foreground font-body hover:text-foreground transition-colors"
              >
                ← Wróć do logowania
              </button>
            )}
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-body">lub</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={async () => {
              setError("");
              const { error } = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (error) setError(error.message);
            }}
            className="w-full h-12 rounded-xl border border-input bg-background font-body font-medium text-sm text-foreground hover:bg-secondary active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Kontynuuj z Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
