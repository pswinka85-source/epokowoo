import { useState, useEffect, useCallback, useRef } from "react";
import { Trophy, RotateCcw, Zap, Timer, Crown, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface QuestionOption {
  text: string;
  correct?: boolean;
}

interface QuestionData {
  id: string;
  question_text: string;
  question_data: {
    options?: QuestionOption[];
    explanation?: string;
    [key: string]: any;
  };
}

interface RankingEntry {
  user_id: string;
  score: number;
  correct_answers: number;
  display_name: string | null;
}

interface KahootQuizPlayerProps {
  quizId: string;
  title: string;
  questions: QuestionData[];
  onBack: () => void;
}

const KAHOOT_COLORS = [
  { bg: "bg-[hsl(0,72%,51%)]", hover: "hover:bg-[hsl(0,72%,46%)]", label: "A" },
  { bg: "bg-[hsl(220,80%,50%)]", hover: "hover:bg-[hsl(220,80%,45%)]", label: "B" },
  { bg: "bg-[hsl(45,93%,47%)]", hover: "hover:bg-[hsl(45,93%,42%)]", label: "C" },
  { bg: "bg-[hsl(152,60%,42%)]", hover: "hover:bg-[hsl(152,60%,37%)]", label: "D" },
];

const MAX_POINTS = 150;
const TIME_LIMIT_MS = 10000;

function calcPoints(responseTimeMs: number): number {
  if (responseTimeMs <= 1000) return MAX_POINTS;
  if (responseTimeMs >= TIME_LIMIT_MS) return 10;
  const fraction = 1 - (responseTimeMs - 1000) / (TIME_LIMIT_MS - 1000);
  return Math.round(10 + fraction * (MAX_POINTS - 10));
}

const KahootQuizPlayer = ({ quizId, title, questions, onBack }: KahootQuizPlayerProps) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<"choose" | "ranked" | "practice">("choose");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(100);
  const [hasRankedAttempt, setHasRankedAttempt] = useState(false);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [totalTimeMs, setTotalTimeMs] = useState(0);

  const questionStartRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = questions[currentIndex];
  const options = (current?.question_data?.options || []) as QuestionOption[];
  const correctIdx = options.findIndex((o) => o.correct);

  // Check if user already has a ranked attempt
  useEffect(() => {
    if (!user) return;
    supabase
      .from("quiz_rankings")
      .select("id")
      .eq("user_id", user.id)
      .eq("quiz_id", quizId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setHasRankedAttempt(true);
      });
  }, [user, quizId]);

  // Timer
  useEffect(() => {
    if (answered || finished || mode === "choose") return;
    questionStartRef.current = Date.now();
    setTimeLeft(100);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - questionStartRef.current;
      const pct = Math.max(0, 100 - (elapsed / TIME_LIMIT_MS) * 100);
      setTimeLeft(pct);
      if (pct <= 0) {
        handleSelect(-1); // time's up
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, answered, finished, mode]);

  const handleSelect = useCallback(
    (idx: number) => {
      if (answered) return;
      if (timerRef.current) clearInterval(timerRef.current);

      const elapsed = Date.now() - questionStartRef.current;
      setTotalTimeMs((t) => t + elapsed);
      setAnswered(true);
      setSelectedIdx(idx);

      const isCorrect = idx === correctIdx;
      const pts = isCorrect ? calcPoints(elapsed) : 0;
      setPointsEarned(pts);
      if (isCorrect) {
        setCorrectCount((c) => c + 1);
      }
      setTotalScore((s) => s + pts);
    },
    [answered, correctIdx]
  );

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setAnswered(false);
      setSelectedIdx(null);
      setPointsEarned(0);
    } else {
      setFinished(true);
      if (mode === "ranked" && user) {
        saveRanking();
      }
      loadRankings();
    }
  };

  const saveRanking = async () => {
    if (!user) return;
    await supabase.from("quiz_rankings").upsert(
      {
        user_id: user.id,
        quiz_id: quizId,
        score: totalScore,
        total_questions: questions.length,
        correct_answers: correctCount,
        time_ms: totalTimeMs,
      },
      { onConflict: "user_id,quiz_id" }
    );
    setHasRankedAttempt(true);
  };

  const loadRankings = async () => {
    const { data } = await supabase
      .from("quiz_rankings")
      .select("user_id, score, correct_answers")
      .eq("quiz_id", quizId)
      .order("score", { ascending: false })
      .limit(50);

    if (!data) return;

    // Fetch display names
    const userIds = data.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p.display_name]) || []);

    const ranked = data.map((r) => ({
      ...r,
      display_name: profileMap.get(r.user_id) || "Anonim",
    }));

    setRankings(ranked);

    if (user) {
      const idx = ranked.findIndex((r) => r.user_id === user.id);
      setUserRank(idx >= 0 ? idx + 1 : null);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setTotalScore(0);
    setCorrectCount(0);
    setAnswered(false);
    setSelectedIdx(null);
    setPointsEarned(0);
    setFinished(false);
    setTimeLeft(100);
    setTotalTimeMs(0);
    setMode("choose");
  };

  // Mode selection
  if (mode === "choose") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground font-body mb-6">
          {questions.length} pytań · Odpowiadaj szybko, zdobywaj punkty!
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Ranked mode */}
          <button
            onClick={() => {
              if (!user) return;
              if (hasRankedAttempt) {
                loadRankings();
                setFinished(true);
                setMode("ranked");
                return;
              }
              setMode("ranked");
            }}
            disabled={!user}
            className="group relative overflow-hidden rounded-xl border-2 border-primary/20 bg-primary/5 p-6 text-left transition-all hover:border-primary/40 hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Crown size={20} className="text-primary" />
              </div>
              <span className="font-display font-bold text-foreground">Tryb rankingowy</span>
            </div>
            <p className="text-sm text-muted-foreground font-body">
              {hasRankedAttempt
                ? "Już ukończyłeś ten quiz. Zobacz ranking!"
                : "Jedno podejście. Twój wynik trafi do rankingu."}
            </p>
            {!user && (
              <p className="text-xs text-destructive font-body mt-2">Zaloguj się, aby grać w trybie rankingowym</p>
            )}
          </button>

          {/* Practice mode */}
          <button
            onClick={() => setMode("practice")}
            className="group relative overflow-hidden rounded-xl border-2 border-border bg-secondary/30 p-6 text-left transition-all hover:border-primary/30 hover:bg-secondary/50"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <RotateCcw size={20} className="text-muted-foreground" />
              </div>
              <span className="font-display font-bold text-foreground">Tryb ćwiczeniowy</span>
            </div>
            <p className="text-sm text-muted-foreground font-body">
              Ćwicz bez limitu. Wynik nie trafia do rankingu.
            </p>
          </button>
        </div>

        <button onClick={onBack} className="mt-6 text-sm text-muted-foreground hover:text-foreground font-body transition-colors">
          ← Wróć do listy
        </button>
      </div>
    );
  }

  // Finished
  if (finished) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <div className="text-center mb-8">
          <Trophy size={52} className="mx-auto text-accent mb-4" />
          <h2 className="font-display text-3xl font-bold text-foreground mb-1">Quiz ukończony!</h2>
          <p className="text-muted-foreground font-body">{title}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl bg-primary/10 p-4 text-center">
            <p className="text-2xl font-display font-bold text-primary">{totalScore}</p>
            <p className="text-xs text-muted-foreground font-body">Punkty</p>
          </div>
          <div className="rounded-xl bg-[hsl(var(--success))]/10 p-4 text-center">
            <p className="text-2xl font-display font-bold text-[hsl(var(--success))]">
              {correctCount}/{questions.length}
            </p>
            <p className="text-xs text-muted-foreground font-body">Poprawne</p>
          </div>
          <div className="rounded-xl bg-accent/10 p-4 text-center">
            <p className="text-2xl font-display font-bold text-accent">
              {userRank ? `#${userRank}` : "—"}
            </p>
            <p className="text-xs text-muted-foreground font-body">Ranking</p>
          </div>
        </div>

        {/* Rankings table */}
        {rankings.length > 0 && (
          <div className="mb-6">
            <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
              <Medal size={18} className="text-accent" /> Ranking
            </h3>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="bg-secondary/60">
                    <th className="px-4 py-2.5 text-left font-semibold text-foreground w-12">#</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-foreground">Gracz</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-foreground">Punkty</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-foreground">Poprawne</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((r, i) => (
                    <tr
                      key={r.user_id}
                      className={`border-t border-border ${
                        user && r.user_id === user.id ? "bg-primary/5 font-semibold" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                      </td>
                      <td className="px-4 py-2.5 text-foreground">{r.display_name}</td>
                      <td className="px-4 py-2.5 text-right text-primary font-bold">{r.score}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{r.correct_answers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-body font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} /> Zagraj ponownie
          </button>
          <button
            onClick={onBack}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-body font-medium hover:opacity-90 transition-opacity"
          >
            Wróć do listy
          </button>
        </div>
      </div>
    );
  }

  // Playing
  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      {/* Top bar */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-body">
          {currentIndex + 1} / {questions.length}
        </span>
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-accent" />
          <span className="font-display font-bold text-foreground">{totalScore} pkt</span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 bg-secondary mx-6 rounded-full overflow-hidden mb-5">
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{
            width: `${timeLeft}%`,
            backgroundColor:
              timeLeft > 60
                ? "hsl(var(--success))"
                : timeLeft > 30
                ? "hsl(var(--warning))"
                : "hsl(var(--destructive))",
          }}
        />
      </div>

      {/* Question */}
      <div className="px-6 pb-4">
        <h3 className="font-display text-lg font-bold text-foreground leading-snug">
          {current.question_text}
        </h3>
      </div>

      {/* Points feedback */}
      {answered && (
        <div className="px-6 pb-3">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold font-body ${
              selectedIdx === correctIdx
                ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {selectedIdx === correctIdx ? (
              <>
                <Zap size={14} /> +{pointsEarned} pkt
              </>
            ) : (
              <>Niepoprawna odpowiedź · 0 pkt</>
            )}
          </div>
        </div>
      )}

      {/* Kahoot-style colored options */}
      <div className="grid grid-cols-2 gap-3 px-6 pb-6">
        {options.map((opt, i) => {
          const color = KAHOOT_COLORS[i] || KAHOOT_COLORS[0];
          const isCorrectOption = i === correctIdx;
          const isSelected = i === selectedIdx;

          let classes = `relative rounded-xl p-4 min-h-[70px] font-body font-semibold text-white text-sm transition-all duration-200 text-left `;

          if (!answered) {
            classes += `${color.bg} ${color.hover} cursor-pointer active:scale-[0.97] shadow-lg`;
          } else if (isCorrectOption) {
            classes += `${color.bg} ring-4 ring-white/50 shadow-xl`;
          } else if (isSelected && !isCorrectOption) {
            classes += `${color.bg} opacity-40 grayscale`;
          } else {
            classes += `${color.bg} opacity-25`;
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={answered}
              className={classes}
            >
              <span className="absolute top-2 left-3 w-6 h-6 rounded-md bg-white/20 flex items-center justify-center text-xs font-bold">
                {color.label}
              </span>
              <span className="block mt-5 leading-snug">{opt.text}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation + Next */}
      {answered && (
        <div className="px-6 pb-6">
          {current.question_data?.explanation && (
            <div className="rounded-xl bg-secondary/60 border border-border p-4 mb-4">
              <p className="text-sm text-foreground font-body">
                <strong>Wyjaśnienie:</strong> {current.question_data.explanation}
              </p>
            </div>
          )}
          <button
            onClick={handleNext}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-body font-semibold hover:opacity-90 transition-opacity"
          >
            {currentIndex < questions.length - 1 ? "Następne pytanie →" : "Zobacz wynik"}
          </button>
        </div>
      )}
    </div>
  );
};

export default KahootQuizPlayer;
