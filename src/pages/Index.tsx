import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { epochs } from "@/data/epochs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import EpochCard from "@/components/EpochCard";
import { CheckCircle, Brain, TrendingUp } from "lucide-react";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 pt-12 pb-10 md:pt-20 md:pb-14">
          <div className="flex items-baseline gap-4 mb-2">
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground leading-[1.1]">
              Cześć, <span className="font-normal">{user.user_metadata?.display_name?.split(" ")[0] || user.user_metadata?.full_name?.split(" ")[0] || user.user_metadata?.name?.split(" ")[0] || ""}</span>! 👋
            </h1>
            <h1 className="font-display text-3xl md:text-4xl text-foreground leading-[1.1]">
              Kokpit
            </h1>
          </div>
          <p className="text-lg text-muted-foreground font-body leading-relaxed mb-4">
            Oto Twoje postępy w nauce.
          </p>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-body text-muted-foreground">Postęp e-testów</span>
              <span className="text-sm font-body font-semibold text-foreground">{stats ? `${stats.averageScore}%` : '0%'}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-white overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${stats?.averageScore ?? 0}%`, backgroundColor: 'hsl(246, 59%, 51%)' }}
              />
            </div>
          </div>
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon={<CheckCircle size={20} />}
                value={stats.completedLessons}
                label="Opracowanych tematów"
                sublabel={`${stats.totalAttempts} prób łącznie`}
                color="primary"
              />
              <StatCard
                icon={<Brain size={20} />}
                value={`${stats.averageScore}%`}
                label="Średni wynik"
                sublabel="z e-testów"
                color="accent"
              />
              <StatCard
                icon={<TrendingUp size={20} />}
                value={epochs.length}
                label="Epok"
                sublabel="do nauki"
                color="primary"
              />
            </div>
          )}
        </div>
        </div>
      </header>

      {/* Epochs grid */}
      <main className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {epochs.map((epoch, index) => (
            <EpochCard key={epoch.id} epoch={epoch} index={index} />
          ))}
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ icon, value, label, sublabel, color }: { icon: React.ReactNode; value: number | string; label: string; sublabel?: string; color: "primary" | "accent" }) => (
  <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color === "primary" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
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
