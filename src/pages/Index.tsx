import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { epochs } from "@/data/epochs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import EpochCard from "@/components/EpochCard";
import { CheckCircle, Brain, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    completedLessons: number;
    totalLessonsWithTest: number;
    averageScore: number;
    totalAttempts: number;
  } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      const { data: results } = await supabase
        .from("lesson_test_results")
        .select("best_score, total_questions, attempts")
        .eq("user_id", user.id);

      if (results && results.length > 0) {
        const totalScore = results.reduce((sum, r) => sum + (r.total_questions > 0 ? (r.best_score / r.total_questions) * 100 : 0), 0);
        const avgScore = Math.round(totalScore / results.length);
        const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0);
        setStats({
          completedLessons: results.length,
          totalLessonsWithTest: results.length,
          averageScore: avgScore,
          totalAttempts,
        });
      } else {
        setStats({
          completedLessons: 0,
          totalLessonsWithTest: 0,
          averageScore: 0,
          totalAttempts: 0,
        });
      }
    };
    fetchStats();
  }, [user]);

  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-5%] w-[40rem] h-[40rem] rounded-full bg-gradient-hero opacity-80 blur-[80px] animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[35rem] h-[35rem] rounded-full opacity-60 blur-[100px] animate-[pulse_10s_ease-in-out_infinite]" style={{ background: 'radial-gradient(circle, hsl(30 90% 55% / 0.08), transparent 70%)' }} />
          <div className="absolute top-[40%] left-[60%] w-[20rem] h-[20rem] rounded-full opacity-40 blur-[80px] animate-[pulse_12s_ease-in-out_infinite]" style={{ background: 'radial-gradient(circle, hsl(245 58% 51% / 0.06), transparent 70%)' }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-8 md:pt-20 md:pb-14">
          {user ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={18} className="text-accent" />
                <span className="text-xs font-body font-semibold text-accent uppercase tracking-widest">Twoja nauka</span>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground leading-[1.1] mb-2">
                Cześć! 👋
              </h1>
              <p className="text-lg text-muted-foreground font-body leading-relaxed mb-8">
                Oto Twoje postępy w nauce.
              </p>
              {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard
                    icon={<CheckCircle size={20} />}
                    value={stats.completedLessons}
                    label="Opracowanych tematów"
                    sublabel={`${stats.totalAttempts} prób łącznie`}
                    variant="primary"
                  />
                  <StatCard
                    icon={<Brain size={20} />}
                    value={`${stats.averageScore}%`}
                    label="Średni wynik"
                    sublabel="z e-testów"
                    variant="accent"
                  />
                  <StatCard
                    icon={<TrendingUp size={20} />}
                    value={epochs.length}
                    label="Epok"
                    sublabel="do nauki"
                    variant="primary"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-body font-semibold">
                    <Sparkles size={12} />
                    Darmowa nauka
                  </span>
                </div>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.08] mb-5">
                  <span className="text-foreground">Epoki literackie</span>
                  <br />
                  <span className="text-gradient-primary">bez stresu</span>
                </h1>
                <p className="text-lg text-muted-foreground font-body leading-relaxed max-w-lg">
                  Interaktywne lekcje, quizy i materiały do nauki — wszystko czego potrzebujesz, by zdać maturę z polskiego.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mt-8">
                  <Link
                    to="/auth"
                    className="group h-12 px-7 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-body font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all duration-200 shadow-lg shadow-primary/20"
                  >
                    Zaloguj się
                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link
                    to="/auth"
                    className="h-12 px-7 rounded-xl bg-card border border-border text-foreground text-sm font-body font-semibold flex items-center justify-center hover:bg-secondary transition-all duration-200"
                  >
                    Zarejestruj się
                  </Link>
                </div>
              </div>

              {/* Decorative feature pills - desktop only */}
              <div className="hidden lg:flex flex-col gap-3 shrink-0">
                <FeaturePill emoji="📚" text="10 epok literackich" />
                <FeaturePill emoji="✍️" text="Interaktywne quizy" />
                <FeaturePill emoji="🎯" text="Przygotowanie do matury" />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Epochs */}
      <main className="max-w-6xl mx-auto pb-16">
        <div className="px-6 mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">Epoki literackie</h2>
            <p className="text-sm text-muted-foreground font-body mt-0.5">Wybierz epokę i zacznij naukę</p>
          </div>
          <span className="text-xs font-body font-semibold text-muted-foreground bg-secondary px-3 py-1 rounded-full">
            {epochs.length} epok
          </span>
        </div>

        {isMobile ? (
          <div className="px-4">
            <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
              {epochs.map((epoch, index) => (
                <div key={epoch.id} className="min-w-[78vw] snap-start">
                  <EpochCard epoch={epoch} index={index} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {epochs.map((epoch, index) => (
              <EpochCard key={epoch.id} epoch={epoch} index={index} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const FeaturePill = ({ emoji, text }: { emoji: string; text: string }) => (
  <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border border-border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-300">
    <span className="text-xl">{emoji}</span>
    <span className="text-sm font-body font-medium text-foreground">{text}</span>
  </div>
);

const StatCard = ({ icon, value, label, sublabel, variant }: { icon: React.ReactNode; value: number | string; label: string; sublabel?: string; variant: "primary" | "accent" }) => (
  <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-300">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${variant === "primary" ? "bg-gradient-primary text-primary-foreground" : "bg-gradient-accent text-accent-foreground"}`}>
      {icon}
    </div>
    <div>
      <p className="font-display text-2xl font-bold text-foreground leading-none">{value}</p>
      <p className="text-sm text-muted-foreground font-body mt-0.5">{label}</p>
      {sublabel && <p className="text-xs text-muted-foreground/70 font-body">{sublabel}</p>}
    </div>
  </div>
);

export default Index;
