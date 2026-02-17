import { useState, useEffect } from "react";
import type { LessonBlock, Lesson } from "@/data/lessons";
import { ArrowLeft, CheckCircle2, XCircle, Play, ClipboardCheck, Trophy, RotateCcw, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";


function HorizontalTimeline({ events }: { events: { date: string; title: string; description?: string }[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="my-6 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <p className="font-display font-semibold text-foreground mb-5">📅 Oś czasu</p>
      <div className="overflow-x-auto pb-4">
        <div className="relative" style={{ minWidth: 'max-content', padding: '0 40px' }}>
          {/* Continuous line spanning full width, vertically centered on dots */}
          <div className="absolute h-0.5 bg-primary/30 pointer-events-none" style={{ top: 7, left: 0, right: 0 }} />
          <div className="flex justify-between" style={{ minWidth: events.length > 3 ? `${events.length * 140}px` : '100%' }}>
            {events.map((ev, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(activeIndex === i ? null : i)}
                className="relative flex flex-col items-center group cursor-pointer px-2 md:px-4 flex-shrink-0"
                style={{ minWidth: 120 }}
              >
                <div className={`w-3.5 h-3.5 rounded-full border-2 border-background z-10 transition-transform shrink-0 ${activeIndex === i ? "bg-accent scale-125" : "bg-primary group-hover:scale-125"}`} />
                <span className="text-xs font-medium text-primary font-body mt-2 whitespace-nowrap">{ev.date}</span>
                <span className="text-xs font-display font-semibold text-foreground mt-1 text-center leading-tight max-w-[120px] md:max-w-[150px]">{ev.title}</span>
                {activeIndex === i && ev.description && (
                  <div className="mt-2 p-2.5 rounded-lg bg-secondary text-left max-w-[200px]">
                    <p className="text-xs text-muted-foreground font-body leading-relaxed">{ev.description}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RichText({ content }: { content: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i}>{part.slice(1, -1)}</em>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function BlockRenderer({ block }: { block: LessonBlock }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  if (block.type === "heading") {
    return <h2 className="font-display text-xl font-bold text-foreground mt-8 mb-3">{block.content}</h2>;
  }

  if (block.type === "text") {
    const lines = block.content.split("\n");
    return (
      <div className="text-foreground/90 font-body leading-relaxed space-y-2 mb-4">
        {lines.map((line, i) =>
          line.trim() === "" ? null : (
            <p key={i}><RichText content={line} /></p>
          )
        )}
      </div>
    );
  }

  if (block.type === "image") {
    return (
      <figure className="my-6 rounded-xl overflow-hidden border border-border">
        <img src={block.src} alt={block.alt} className="w-full object-contain" loading="lazy" />
        {block.caption && (
          <figcaption className="px-4 py-2 text-xs text-muted-foreground font-body bg-secondary/50 text-center">
            {block.caption}
          </figcaption>
        )}
      </figure>
    );
  }

  if (block.type === "video") {
    return (
      <div className="my-6">
        {showVideo ? (
          <div className="relative w-full rounded-xl overflow-hidden border border-border" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${block.youtubeId}?autoplay=1`}
              title="Film"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <button
            onClick={() => setShowVideo(true)}
            className="relative w-full rounded-xl overflow-hidden border border-border group"
            style={{ paddingBottom: "56.25%" }}
          >
            <img
              src={`https://img.youtube.com/vi/${block.youtubeId}/hqdefault.jpg`}
              alt="Miniatura filmu"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-foreground/20 group-hover:bg-foreground/30 transition-colors flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <Play size={24} className="text-primary-foreground ml-1" />
              </div>
            </div>
          </button>
        )}
        {block.caption && (
          <p className="mt-2 text-xs text-muted-foreground font-body text-center">{block.caption}</p>
        )}
      </div>
    );
  }

  if (block.type === "callout") {
    return (
      <div className="my-5 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
        {block.icon && <span className="text-lg flex-shrink-0">{block.icon}</span>}
        <p className="text-sm text-foreground font-body leading-relaxed">
          <RichText content={block.content} />
        </p>
      </div>
    );
  }

  if (block.type === "quiz") {
    const answered = selectedIdx !== null;
    const correctIdx = block.options.findIndex((o) => o.correct);

    return (
      <div className="my-6 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <p className="font-display font-semibold text-foreground mb-4">🧠 {block.question}</p>
        <div className="space-y-2">
          {block.options.map((opt, i) => {
            const isSelected = selectedIdx === i;
            const isCorrect = opt.correct;
            let cls = "w-full text-left px-4 py-3 rounded-lg border font-body text-sm transition-all ";
            if (!answered) {
              cls += "border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer";
            } else if (isCorrect) {
              cls += "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
            } else if (isSelected && !isCorrect) {
              cls += "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400";
            } else {
              cls += "border-border opacity-50";
            }
            return (
              <button key={i} onClick={() => !answered && setSelectedIdx(i)} className={cls} disabled={answered}>
                <span className="flex items-center gap-2">
                  {answered && isCorrect && <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />}
                  {answered && isSelected && !isCorrect && <XCircle size={16} className="text-red-500 flex-shrink-0" />}
                  {opt.text}
                </span>
              </button>
            );
          })}
        </div>
        {answered && (
          <div className="mt-4 p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground font-body">
            <RichText content={block.explanation} />
          </div>
        )}
      </div>
    );
  }

  if (block.type === "advanced_quiz") {
    return <AdvancedQuizRenderer block={block} />;
  }

  if (block.type === "timeline") {
    const events = (block as any).events || [];
    return <HorizontalTimeline events={events} />;
  }

  return null;
}

function AdvancedQuizRenderer({ block }: { block: LessonBlock }) {
  if (block.type !== "advanced_quiz") return null;
  const { question, advanced_question_type, question_data } = block;
  const data = question_data || {};

  if (advanced_question_type === "abcd") return <AbcdRenderer question={question} data={data} />;
  if (advanced_question_type === "fill_blank") return <FillBlankRenderer question={question} data={data} />;
  if (advanced_question_type === "matching") return <MatchingRenderer question={question} data={data} />;
  if (advanced_question_type === "table_gap") return <TableGapRenderer question={question} data={data} />;
  if (advanced_question_type === "ordering") return <OrderingRenderer question={question} data={data} />;
  return null;
}

function AbcdRenderer({ question, data }: { question: string; data: Record<string, any> }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const options = (data.options || []) as { text: string; correct?: boolean }[];
  const answered = selectedIdx !== null;

  return (
    <div className="my-6 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <p className="font-display font-semibold text-foreground mb-4">🧠 {question}</p>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const isSelected = selectedIdx === i;
          const isCorrect = opt.correct;
          let cls = "w-full text-left px-4 py-3 rounded-lg border font-body text-sm transition-all ";
          if (!answered) cls += "border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer";
          else if (isCorrect) cls += "border-green-500 bg-green-500/10 text-green-700";
          else if (isSelected && !isCorrect) cls += "border-red-500 bg-red-500/10 text-red-700";
          else cls += "border-border opacity-50";
          return (
            <button key={i} onClick={() => !answered && setSelectedIdx(i)} className={cls} disabled={answered}>
              <span className="flex items-center gap-2">
                {answered && isCorrect && <CheckCircle2 size={16} className="text-green-500" />}
                {answered && isSelected && !isCorrect && <XCircle size={16} className="text-red-500" />}
                {opt.text}
              </span>
            </button>
          );
        })}
      </div>
      {answered && data.explanation && (
        <div className="mt-4 p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground font-body">{data.explanation}</div>
      )}
    </div>
  );
}

function FillBlankRenderer({ question, data }: { question: string; data: Record<string, any> }) {
  const answers = (data.answers || []) as string[];
  const [userAnswers, setUserAnswers] = useState<string[]>(answers.map(() => ""));
  const [checked, setChecked] = useState(false);
  const textParts = (data.text_with_gaps || "").split("[___]");

  return (
    <div className="my-6 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <p className="font-display font-semibold text-foreground mb-4">✏️ {question}</p>
      <div className="font-body text-sm leading-relaxed">
        {textParts.map((part: string, i: number) => (
          <span key={i}>
            {part}
            {i < answers.length && (
              <input
                value={userAnswers[i]}
                onChange={e => { const a = [...userAnswers]; a[i] = e.target.value; setUserAnswers(a); }}
                disabled={checked}
                className={`inline-block w-28 h-7 px-2 mx-1 rounded border text-sm font-body text-center ${checked ? (userAnswers[i].toLowerCase().trim() === answers[i].toLowerCase().trim() ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700") : "border-border"}`}
              />
            )}
          </span>
        ))}
      </div>
      {!checked && <button onClick={() => setChecked(true)} className="mt-4 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-body font-medium hover:bg-primary/90">Sprawdź</button>}
      {checked && (
        <div className="mt-3 text-xs text-muted-foreground font-body">
          Poprawne: {answers.join(", ")}
        </div>
      )}
    </div>
  );
}

function MatchingRenderer({ question, data }: { question: string; data: Record<string, any> }) {
  const pairs = (data.pairs || []) as { left: string; right: string }[];
  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<Record<number, number>>({});
  const [shuffledRight] = useState(() => [...pairs.map((_, i) => i)].sort(() => Math.random() - 0.5));
  const allMatched = Object.keys(matched).length === pairs.length;

  const handleRightClick = (rightIdx: number) => {
    if (selected === null) return;
    const isCorrect = shuffledRight[rightIdx] === selected;
    if (isCorrect) {
      setMatched(prev => ({ ...prev, [selected]: rightIdx }));
    }
    setSelected(null);
  };

  return (
    <div className="my-6 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <p className="font-display font-semibold text-foreground mb-4">🔗 {question}</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {pairs.map((pair, i) => (
            <button key={i} onClick={() => !matched[i] && setSelected(i)} disabled={!!matched[i]}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm font-body transition-all ${matched[i] !== undefined ? "border-green-500 bg-green-50 text-green-700" : selected === i ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
              {pair.left}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {shuffledRight.map((origIdx, i) => {
            const isMatched = Object.values(matched).includes(i);
            return (
              <button key={i} onClick={() => handleRightClick(i)} disabled={isMatched}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm font-body transition-all ${isMatched ? "border-green-500 bg-green-50 text-green-700" : "border-border hover:border-primary/40"}`}>
                {pairs[origIdx].right}
              </button>
            );
          })}
        </div>
      </div>
      {allMatched && <div className="mt-3 text-sm text-green-600 font-body font-medium">✅ Wszystko dopasowane!</div>}
    </div>
  );
}

function TableGapRenderer({ question, data }: { question: string; data: Record<string, any> }) {
  const headers = (data.headers || []) as string[];
  const rows = (data.rows || []) as string[][];
  const [userRows, setUserRows] = useState(() => rows.map(row => row.map(cell => cell ? "" : "")));
  const [checked, setChecked] = useState(false);

  return (
    <div className="my-6 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <p className="font-display font-semibold text-foreground mb-4">📊 {question}</p>
      <table className="w-full text-sm font-body">
        <thead>
          <tr>{headers.map((h, i) => <th key={i} className="text-left px-3 py-2 font-semibold text-foreground border-b border-border">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 border-b border-border">
                  {cell ? (
                    <span className="text-foreground">{cell}</span>
                  ) : (
                    <input
                      value={userRows[ri]?.[ci] || ""}
                      onChange={e => { const r = userRows.map(row => [...row]); r[ri][ci] = e.target.value; setUserRows(r); }}
                      disabled={checked}
                      className={`w-full h-7 px-2 rounded border text-sm ${checked ? (userRows[ri]?.[ci]?.toLowerCase().trim() === rows[ri][ci].toLowerCase().trim() ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50") : "border-border"}`}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!checked && <button onClick={() => setChecked(true)} className="mt-4 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-body font-medium hover:bg-primary/90">Sprawdź</button>}
    </div>
  );
}

function OrderingRenderer({ question, data }: { question: string; data: Record<string, any> }) {
  const correctOrder = (data.items || []) as string[];
  const [items, setItems] = useState(() => [...correctOrder].sort(() => Math.random() - 0.5));
  const [checked, setChecked] = useState(false);

  const moveItem = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    const arr = [...items];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setItems(arr);
  };

  const isCorrect = checked && items.every((item, i) => item === correctOrder[i]);

  return (
    <div className="my-6 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <p className="font-display font-semibold text-foreground mb-4">📋 {question}</p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-body ${checked ? (item === correctOrder[i] ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700") : "border-border"}`}>
            <span className="text-muted-foreground w-5">{i + 1}.</span>
            <span className="flex-1">{item}</span>
            {!checked && (
              <div className="flex gap-1">
                <button onClick={() => moveItem(i, -1)} className="p-1 text-muted-foreground hover:text-foreground">↑</button>
                <button onClick={() => moveItem(i, 1)} className="p-1 text-muted-foreground hover:text-foreground">↓</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {!checked && <button onClick={() => setChecked(true)} className="mt-4 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-body font-medium hover:bg-primary/90">Sprawdź</button>}
      {checked && isCorrect && <div className="mt-3 text-sm text-green-600 font-body font-medium">✅ Poprawna kolejność!</div>}
    </div>
  );
}

interface LessonViewerProps {
  lesson: Lesson;
  onBack: () => void;
  lessonIndex: number;
  testQuizId?: string | null;
  onTestCompleted?: (score: number, total: number) => void;
}

const LessonViewer = ({ lesson, onBack, lessonIndex, testQuizId, onTestCompleted }: LessonViewerProps) => {
  const { user } = useAuth();
  const [showTest, setShowTest] = useState(false);
  const [testQuestions, setTestQuestions] = useState<any[] | null>(null);
  const [testTitle, setTestTitle] = useState("");
  const [testFinished, setTestFinished] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [testTotal, setTestTotal] = useState(0);
  const [bestScore, setBestScore] = useState<{ best_score: number; total_questions: number } | null>(null);

  useEffect(() => {
    if (!testQuizId) return;
    const fetchTestQuiz = async () => {
      const { data: quiz } = await supabase.from("quizzes").select("title").eq("id", testQuizId).maybeSingle();
      if (quiz) setTestTitle(quiz.title);
      const { data: questions } = await supabase
        .from("quiz_questions")
        .select("id, question_type, question_text, question_data")
        .eq("quiz_id", testQuizId)
        .order("sort_order");
      if (questions) setTestQuestions(questions.map(q => ({ ...q, question_data: q.question_data as Record<string, any> })));
    };
    fetchTestQuiz();
  }, [testQuizId]);

  useEffect(() => {
    if (!user || !lesson.id) return;
    supabase.from("lesson_test_results").select("best_score, total_questions").eq("user_id", user.id).eq("lesson_id", lesson.id).maybeSingle().then(({ data }) => {
      if (data) setBestScore(data);
    });
  }, [user, lesson.id]);

  const handleTestFinish = async (score: number, total: number) => {
    setTestFinished(true);
    setTestScore(score);
    setTestTotal(total);

    if (!user) return;
    // Save or update best score
    const { data: existing } = await supabase.from("lesson_test_results")
      .select("id, best_score, attempts")
      .eq("user_id", user.id)
      .eq("lesson_id", lesson.id)
      .maybeSingle();

    if (existing) {
      const newBest = Math.max(existing.best_score, score);
      await supabase.from("lesson_test_results").update({
        best_score: newBest,
        total_questions: total,
        attempts: existing.attempts + 1,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
      setBestScore({ best_score: newBest, total_questions: total });
    } else {
      await supabase.from("lesson_test_results").insert({
        user_id: user.id,
        lesson_id: lesson.id,
        best_score: score,
        total_questions: total,
      });
      setBestScore({ best_score: score, total_questions: total });
    }
    onTestCompleted?.(score, total);
  };

  if (showTest && testQuestions && testQuestions.length > 0) {
    return (
      <div>
        <button
          onClick={() => { setShowTest(false); setTestFinished(false); }}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-body text-sm mb-6"
        >
          <ArrowLeft size={16} /> Wróć do lekcji
        </button>
        <ETestPlayer
          title={testTitle || "E-test"}
          questions={testQuestions}
          onFinish={handleTestFinish}
          bestScore={bestScore}
        />
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-body text-sm mb-6"
      >
        <ArrowLeft size={16} />
        Wróć do listy lekcji
      </button>

      <div className="mb-6">
        <span className="text-xs font-medium text-muted-foreground font-body uppercase tracking-wider">
          Lekcja {lessonIndex + 1}
        </span>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-1">
          {lesson.title}
        </h1>
        <p className="text-muted-foreground font-body mt-2">{lesson.description}</p>
      </div>

      <div className="max-w-3xl">
        {lesson.blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}

        {/* E-test button */}
        {testQuizId && testQuestions && testQuestions.length > 0 && (
          <div className="mt-12 pt-8 border-t border-border">
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
              <p className="text-[11px] font-body font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                E-test · {testQuestions.length} pytań
              </p>
              <h3 className="font-display text-xl font-bold text-foreground mb-2">Sprawdź swoją wiedzę</h3>
              <p className="text-sm text-muted-foreground font-body mb-5 max-w-sm mx-auto">
                Rozwiąż krótki test i sprawdź, ile zapamiętałeś z tej lekcji.
              </p>
              {bestScore && (
                <p className="text-sm font-body text-primary font-semibold mb-5">
                  Najlepszy wynik: {bestScore.best_score}/{bestScore.total_questions} ({Math.round((bestScore.best_score / bestScore.total_questions) * 100)}%)
                </p>
              )}
              <button
                onClick={() => { setShowTest(true); setTestFinished(false); }}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-body font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Rozpocznij test
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── E-Test Player ── */
function ETestPlayer({ title, questions, onFinish, bestScore }: { title: string; questions: any[]; onFinish: (score: number, total: number) => void; bestScore: { best_score: number; total_questions: number } | null }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);

  const current = questions[currentIndex];

  const handleAnswer = (isCorrect: boolean) => {
    if (answered) return;
    setAnswered(true);
    if (isCorrect) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setAnswered(false);
    } else {
      setFinished(true);
      onFinish(score, questions.length);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setScore(0);
    setAnswered(false);
    setFinished(false);
  };

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <Trophy size={48} className="mx-auto text-primary mb-4" />
        <h3 className="font-display text-2xl font-bold text-foreground mb-2">E-test ukończony!</h3>
        <p className="text-muted-foreground font-body mb-1">{title}</p>
        <p className="text-3xl font-display font-bold text-primary mb-2">{score}/{questions.length}</p>
        <p className="text-lg font-display font-semibold mb-1">{pct}%</p>
        <p className="text-muted-foreground font-body mb-2">
          {pct >= 80 ? "Świetny wynik! 🎉" : pct >= 50 ? "Nieźle, ale warto powtórzyć! 📖" : "Wróć do materiałów i spróbuj ponownie 💪"}
        </p>
        {bestScore && (
          <p className="text-sm text-muted-foreground font-body mb-4">
            Najlepszy wynik: {Math.max(bestScore.best_score, score)}/{questions.length}
          </p>
        )}
        <button onClick={handleReset} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-body font-medium hover:opacity-90 transition-opacity">
          <RotateCcw size={16} /> Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-body">Pytanie {currentIndex + 1} z {questions.length}</span>
        <span className="text-sm font-medium text-primary font-body">Wynik: {score}/{currentIndex + (answered ? 1 : 0)}</span>
      </div>
      <div className="w-full h-1.5 bg-secondary rounded-full mb-6">
        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${((currentIndex + (answered ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>

      <h3 className="font-display text-lg font-semibold text-foreground mb-5">{current.question_text}</h3>

      <ETestQuestion data={current.question_data} type={current.question_type} answered={answered} onAnswer={handleAnswer} />

      {answered && (
        <button onClick={handleNext} className="w-full mt-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-body font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
          {currentIndex < questions.length - 1 ? <>Następne pytanie <ArrowRight size={16} /></> : "Zobacz wynik"}
        </button>
      )}
    </div>
  );
}

function ETestQuestion({ data, type, answered, onAnswer }: { data: Record<string, any>; type: string; answered: boolean; onAnswer: (c: boolean) => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  if (type === "abcd") {
    const options = (data.options || []) as { text: string; correct?: boolean }[];
    const correctIdx = options.findIndex(o => o.correct);
    const handleClick = (i: number) => {
      if (answered) return;
      setSelected(i);
      onAnswer(i === correctIdx);
    };
    return (
      <div className="grid gap-3">
        {options.map((opt, i) => {
          let cls = "w-full text-left px-4 py-3 rounded-lg border font-body text-sm transition-all ";
          if (!answered) cls += "border-border bg-background hover:border-primary hover:bg-primary/5 cursor-pointer text-foreground";
          else if (i === correctIdx) cls += "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
          else if (i === selected) cls += "border-red-400 bg-red-400/10 text-red-600 dark:text-red-400";
          else cls += "border-border bg-background text-muted-foreground opacity-60";
          return (
            <button key={i} onClick={() => handleClick(i)} className={cls} disabled={answered}>
              <span className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-medium flex-shrink-0">{String.fromCharCode(65 + i)}</span>
                <span>{opt.text}</span>
                {answered && i === correctIdx && <CheckCircle2 size={18} className="ml-auto flex-shrink-0" />}
                {answered && i === selected && i !== correctIdx && <XCircle size={18} className="ml-auto flex-shrink-0" />}
              </span>
            </button>
          );
        })}
        {answered && data.explanation && (
          <div className="rounded-lg bg-secondary/60 border border-border p-4">
            <p className="text-sm text-foreground font-body"><strong>Wyjaśnienie:</strong> {data.explanation}</p>
          </div>
        )}
      </div>
    );
  }

  // For other question types, simple ABCD fallback
  return <p className="text-sm text-muted-foreground font-body">Ten typ pytania nie jest jeszcze obsługiwany w e-teście.</p>;
}

export default LessonViewer;
