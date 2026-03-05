import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { epochs } from "@/data/epochs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import EpochCard from "@/components/EpochCard";
import { Flame, Target, Zap, ArrowRight, Sparkles } from "lucide-react";

const greetingByTime = () => {
  const h = new Date().getHours();
  if (h < 6) return "Nocna sowa? 🦉";
  if (h < 12) return "Dzień dobry ☀️";
  if (h < 18) return "Cześć 👋";
  return "Dobry wieczór 🌙";
};

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
        setStats({ completedLessons: results.length, totalLessonsWithTest: results.length, averageScore: avgScore, totalAttempts });
      } else {
        setStats({ completedLessons: 0, totalLessonsWithTest: 0, averageScore: 0, totalAttempts: 0 });
      }
    };
    fetchStats();
  }, [user]);

  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  if (!user) return null;

  const firstName = user.user_metadata?.display_name?.split(" ")[0] || user.user_metadata?.full_name?.split(" ")[0] || user.user_metadata?.name?.split(" ")[0] || "";
  const score = stats?.averageScore ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* ───── HERO ───── */}
      <header className="relative overflow-hidden">
        {/* Animated gradient blobs */}
        <motion.div
          className="absolute -top-20 -left-20 w-[420px] h-[420px] rounded-full opacity-30 blur-[100px]"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / .45), transparent 70%)" }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-10 right-0 w-[350px] h-[350px] rounded-full opacity-20 blur-[80px]"
          style={{ background: "radial-gradient(circle, hsl(var(--accent) / .5), transparent 70%)" }}
          animate={{ x: [0, -25, 0], y: [0, 15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8 md:pt-16 md:pb-12">
          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm font-body font-medium text-muted-foreground mb-1">{greetingByTime()}</p>
            <h1 className="font-display text-3xl md:text-[2.75rem] font-extrabold text-foreground leading-[1.1] tracking-tight">
              {firstName}
              <span className="inline-block ml-2">
                <Sparkles className="inline w-6 h-6 text-accent" />
              </span>
            </h1>
          </motion.div>

          {/* ───── BENTO STATS GRID ───── */}
          {stats && (
            <motion.div
              className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3"
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
            >
              {/* Big progress card — spans 2 cols */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
                className="col-span-2 rounded-3xl p-6 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / .75))" }}
              >
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex items-center gap-6">
                  {/* Circular progress */}
                  <div className="relative w-24 h-24 shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
                      <motion.circle
                        cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 42}
                        initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - score / 100) }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-display font-extrabold text-white">{score}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm font-body mb-1">Średni wynik e-testów</p>
                    <p className="text-white text-xl font-display font-bold">
                      {score >= 80 ? "Świetna robota! 🔥" : score >= 50 ? "Idzie dobrze!" : "Czas na naukę!"}
                    </p>
                    <p className="text-white/50 text-xs font-body mt-1">{stats.totalAttempts} prób łącznie</p>
                  </div>
                </div>
              </motion.div>

              {/* Stat tile 1 */}
              <BentoStat
                icon={<Flame className="w-5 h-5" />}
                value={stats.completedLessons}
                label="Tematy"
                sublabel="opracowane"
                gradient="from-accent/15 to-accent/5"
                iconBg="bg-accent/20 text-accent"
              />

              {/* Stat tile 2 */}
              <BentoStat
                icon={<Target className="w-5 h-5" />}
                value={epochs.length}
                label="Epoki"
                sublabel="do nauki"
                gradient="from-primary/10 to-primary/5"
                iconBg="bg-primary/15 text-primary"
              />
            </motion.div>
          )}
        </div>
      </header>

      {/* ───── EPOCHS SECTION ───── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Twoje epoki</h2>
            <p className="text-sm text-muted-foreground font-body">Wybierz epokę i zacznij naukę</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-body font-semibold text-primary">
            <Zap className="w-3.5 h-3.5" />
            {epochs.length} dostępnych
          </div>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {epochs.map((epoch, index) => (
            <EpochCard key={epoch.id} epoch={epoch} index={index} />
          ))}
        </div>
      </main>
    </div>
  );
};

/* ─── Bento stat tile ─── */
const BentoStat = ({
  icon, value, label, sublabel, gradient, iconBg,
}: {
  icon: React.ReactNode; value: number | string; label: string; sublabel: string; gradient: string; iconBg: string;
}) => (
  <motion.div
    variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
    className={`rounded-3xl bg-gradient-to-br ${gradient} border border-border/50 p-5 flex flex-col justify-between min-h-[130px] hover:scale-[1.02] transition-transform duration-300`}
  >
    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${iconBg}`}>{icon}</div>
    <div className="mt-3">
      <p className="font-display text-2xl font-extrabold text-foreground leading-none">{value}</p>
      <p className="text-sm text-muted-foreground font-body mt-0.5">{label} <span className="text-muted-foreground/60">· {sublabel}</span></p>
    </div>
  </motion.div>
);

export default Index;
