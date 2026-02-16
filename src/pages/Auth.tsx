import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap } from "lucide-react";
import { useEffect } from "react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else navigate("/");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setError(error.message);
      else setMessage("Sprawdź swoją skrzynkę e-mail, aby potwierdzić rejestrację.");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 md:p-10 shadow-[var(--shadow-elevated)]">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <GraduationCap size={28} className="text-primary" />
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              {isLogin ? "Witaj ponownie" : "Dołącz do nas"}
            </h1>
            <p className="text-muted-foreground font-body text-sm mt-2">
              {isLogin ? "Zaloguj się, aby kontynuować naukę" : "Stwórz konto i zacznij naukę"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground font-body block mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm font-body ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                placeholder="twoj@email.pl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground font-body block mb-1.5">Hasło</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm font-body ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                placeholder="••••••"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                <p className="text-sm text-destructive font-body">{error}</p>
              </div>
            )}
            {message && (
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3">
                <p className="text-sm text-green-600 font-body">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-body font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-md"
            >
              {submitting ? "Proszę czekać..." : isLogin ? "Zaloguj się" : "Zarejestruj się"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground font-body mt-6">
            {isLogin ? "Nie masz konta?" : "Masz już konto?"}{" "}
            <button onClick={() => { setIsLogin(!isLogin); setError(""); setMessage(""); }} className="text-primary hover:underline font-semibold">
              {isLogin ? "Zarejestruj się" : "Zaloguj się"}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground/60 font-body mt-6">
          Epochowo · Materiały do matury z polskiego 🎓
        </p>
      </div>
    </div>
  );
};

export default Auth;
