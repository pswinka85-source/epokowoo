import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { epochs } from "@/data/epochs";
import type { Lesson, LessonBlock } from "@/data/lessons";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import LessonCard from "@/components/LessonCard";
import LessonViewer from "@/components/LessonViewer";
import QuizPlayer from "@/components/QuizPlayer";
import {
  ArrowLeft,
  BookOpen,
  Users,
  Lightbulb,
  List,
  Play,
  ChevronRight,
  Brain,
} from "lucide-react";

interface Author {
  name: string;
  works: string[];
}
interface EpochOverride {
  characteristics: string[] | null;
  key_themes: string[] | null;
  authors: Author[] | null;
}

interface DbQuiz {
  id: string;
  title: string;
  description: string | null;
  questions: { id: string; question_type: string; question_text: string; question_data: Record<string, any> }[];
}

const EpochDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [override, setOverride] = useState<EpochOverride | null>(null);
  const [lessons, setLessons] = useState<(Lesson & { testQuizId?: string | null })[]>([]);
  const [quizzes, setQuizzes] = useState<DbQuiz[]>([]);
  const [testResults, setTestResults] = useState<Record<string, { best_score: number; total_questions: number }>>({});
  const [loading, setLoading] = useState(true);

  const epoch = epochs.find((e) => e.id === id);
  const epochIndex = epochs.findIndex((e) => e.id === id);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setActiveLessonId(null);
    setActiveQuizId(null);

    const fetchAll = async () => {
      const { data: overrideData } = await supabase
        .from("epoch_overrides")
        .select("characteristics, key_themes, authors")
        .eq("epoch_id", id)
        .maybeSingle();

      if (overrideData)
        setOverride({
          characteristics: overrideData.characteristics,
          key_themes: overrideData.key_themes,
          authors: (overrideData.authors as unknown as Author[]) || null,
        });
      else setOverride(null);

      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("id, title, description, blocks, sort_order, test_quiz_id")
        .eq("epoch_id", id)
        .eq("published", true)
        .order("sort_order");

      const mappedLessons = (lessonsData || []).map((l: any) => ({
        id: l.id,
        title: l.title,
        description: l.description || "",
        blocks: (l.blocks as unknown as LessonBlock[]) || [],
        testQuizId: l.test_quiz_id,
      }));
      setLessons(mappedLessons);

      // Fetch user test results
      if (user) {
        const lessonIds = mappedLessons.map((l: any) => l.id);
        if (lessonIds.length > 0) {
          const { data: results } = await supabase
            .from("lesson_test_results")
            .select("lesson_id, best_score, total_questions")
            .eq("user_id", user.id)
            .in("lesson_id", lessonIds);
          const resultsMap: Record<string, { best_score: number; total_questions: number }> = {};
          (results || []).forEach((r: any) => { resultsMap[r.lesson_id] = { best_score: r.best_score, total_questions: r.total_questions }; });
          setTestResults(resultsMap);
        }
      }

      const { data: quizzesData } = await supabase
        .from("quizzes")
        .select("id, title, description")
        .eq("epoch_id", id)
        .eq("published", true)
        .order("created_at");

      const quizzesWithQuestions: DbQuiz[] = [];
      for (const quiz of quizzesData || []) {
        const { data: qData } = await supabase
          .from("quiz_questions")
          .select("id, question_type, question_text, question_data")
          .eq("quiz_id", quiz.id)
          .order("sort_order");

        quizzesWithQuestions.push({
          ...quiz,
          questions: (qData || []).map((q) => ({
            id: q.id,
            question_type: q.question_type,
            question_text: q.question_text,
            question_data: q.question_data as Record<string, any>,
          })),
        });
      }
      setQuizzes(quizzesWithQuestions);
      setLoading(false);
    };

    fetchAll();
  }, [id]);

  const prevEpoch = epochIndex > 0 ? epochs[epochIndex - 1] : null;
  const nextEpoch = epochIndex < epochs.length - 1 ? epochs[epochIndex + 1] : null;

  const activeLesson = lessons.find((l) => l.id === activeLessonId) ?? null;
  const activeLessonIndex = lessons.findIndex((l) => l.id === activeLessonId);
  const activeQuiz = quizzes.find((q) => q.id === activeQuizId) ?? null;

  if (!epoch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold mb-4 text-foreground">Nie znaleziono epoki</h1>
          <Link to="/" className="text-primary hover:underline font-body">← Wróć do listy</Link>
        </div>
      </div>
    );
  }

  if (activeLesson) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-4xl mx-auto px-6 py-8">
          <LessonViewer
            lesson={activeLesson}
            lessonIndex={activeLessonIndex}
            onBack={() => setActiveLessonId(null)}
            testQuizId={(activeLesson as any).testQuizId}
            onTestCompleted={() => {
              // Refresh test results
              if (user) {
                supabase.from("lesson_test_results").select("lesson_id, best_score, total_questions").eq("user_id", user.id).eq("lesson_id", activeLesson.id).maybeSingle().then(({ data }) => {
                  if (data) setTestResults(prev => ({ ...prev, [data.lesson_id]: { best_score: data.best_score, total_questions: data.total_questions } }));
                });
              }
            }}
          />
        </main>
      </div>
    );
  }

  if (activeQuiz && activeQuiz.questions.length > 0) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-3xl mx-auto px-6 py-8">
          <button
            onClick={() => setActiveQuizId(null)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-body text-sm mb-6"
          >
            <ArrowLeft size={16} /> Wróć do epoki
          </button>
          <QuizPlayer title={activeQuiz.title} questions={activeQuiz.questions as any} />
        </main>
      </div>
    );
  }

  const characteristics = override?.characteristics ?? epoch.characteristics;
  const keyThemes = override?.key_themes ?? epoch.keyThemes;
  const authors = override?.authors ?? epoch.authors;
  const totalQuizQuestions = quizzes.reduce((sum, q) => sum + q.questions.length, 0);
  const totalVideos = lessons.reduce((sum, l) => sum + l.blocks.filter((b) => b.type === "video").length, 0);

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-body text-sm mb-8">
          <ArrowLeft size={16} /> Wszystkie epoki
        </Link>

        {/* Hero */}
        <header className="rounded-2xl bg-card border border-border p-8 md:p-10 mb-8">
          <div className="mb-5">
            <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground font-body px-2.5 py-1 rounded-full bg-secondary mb-3">
              {epoch.period}
            </span>
            <div className="flex items-center gap-5">
              <span className="text-5xl">{epoch.icon}</span>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">{epoch.name}</h1>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed font-body max-w-3xl mb-6">{epoch.description}</p>

          {/* Stats */}
          <div className="flex flex-wrap gap-5 text-sm font-body">
            <span className="text-sm text-muted-foreground font-body"><strong className="text-foreground font-display">{lessons.length}</strong> lekcji</span>
            {totalQuizQuestions > 0 && <span className="text-sm text-muted-foreground font-body"><strong className="text-foreground font-display">{quizzes.length}</strong> quizów ({totalQuizQuestions} pytań)</span>}
            {totalVideos > 0 && <span className="text-sm text-muted-foreground font-body"><strong className="text-foreground font-display">{totalVideos}</strong> filmów</span>}
          </div>
        </header>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground font-body text-sm">Ładowanie treści…</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main */}
            <div className="lg:col-span-2 space-y-8">
              {/* Lessons */}
              <section>
                {lessons.length > 0 ? (
                  <div className="space-y-3">
                    {lessons.map((lesson, i) => (
                      <LessonCard key={lesson.id} lesson={lesson} index={i} epochId={id} onClick={() => setActiveLessonId(lesson.id)} bestScore={testResults[lesson.id] || null} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={<BookOpen size={28} />} text="Lekcje wkrótce!" />
                )}
              </section>

              {/* Quizzes */}
              {quizzes.length > 0 && (
                <section>
                  <SectionHeader icon={<Brain size={16} />} title="Quizy" accent />
                  <div className="space-y-3">
                    {quizzes.map((quiz) => (
                      <button
                        key={quiz.id}
                        onClick={() => setActiveQuizId(quiz.id)}
                        className="w-full text-left rounded-2xl border border-border bg-card p-5 hover:shadow-[var(--shadow-card-hover)] hover:border-accent/40 transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="font-display text-base font-bold text-foreground group-hover:text-accent transition-colors">
                              {quiz.title}
                            </h3>
                            {quiz.description && <p className="text-sm text-muted-foreground font-body mt-1">{quiz.description}</p>}
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-body mt-2">
                              <Brain size={12} className="text-accent" /> {quiz.questions.length} pytań
                            </span>
                          </div>
                          <ChevronRight size={18} className="text-muted-foreground/40 group-hover:text-accent transition-colors shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-5">
              <SidebarCard icon={<Lightbulb size={15} />} title="Kluczowe motywy">
                <div className="flex flex-wrap gap-1.5">
                  {keyThemes.map((theme, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground text-xs font-body font-medium">{theme}</span>
                  ))}
                </div>
              </SidebarCard>

              <SidebarCard icon={<List size={15} />} title="Cechy epoki">
                <ul className="space-y-2">
                  {characteristics.map((c, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-foreground font-body">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      <span className="leading-relaxed">{c}</span>
                    </li>
                  ))}
                </ul>
              </SidebarCard>

              <SidebarCard icon={<Users size={15} />} title="Twórcy i dzieła">
                <div className="space-y-3">
                  {authors.map((author, i) => (
                    <div key={i}>
                      <p className="font-body font-semibold text-sm text-foreground">{author.name}</p>
                      <ul className="mt-0.5 space-y-0.5 ml-3">
                        {author.works.map((work, j) => (
                          <li key={j} className="text-xs text-muted-foreground font-body italic">„{work}"</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </SidebarCard>
            </aside>
          </div>
        )}

        {/* Nav between epochs */}
        <nav className="mt-14 flex items-center justify-between border-t border-border pt-8">
          {prevEpoch ? (
            <Link to={`/epoka/${prevEpoch.id}`} className="group flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors font-body">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <div className="text-left">
                <span className="text-[10px] uppercase tracking-[0.15em] block text-muted-foreground">Poprzednia</span>
                <span className="font-display font-bold text-foreground group-hover:text-primary transition-colors">{prevEpoch.name}</span>
              </div>
            </Link>
          ) : <div />}
          {nextEpoch ? (
            <Link to={`/epoka/${nextEpoch.id}`} className="group flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors font-body text-right">
              <div>
                <span className="text-[10px] uppercase tracking-[0.15em] block text-muted-foreground">Następna</span>
                <span className="font-display font-bold text-foreground group-hover:text-primary transition-colors">{nextEpoch.name}</span>
              </div>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : <div />}
        </nav>
      </main>
    </div>
  );
};

/* Sub-components */
const Stat = ({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) => (
  <div className="flex items-center gap-2 text-muted-foreground">
    <span className="text-primary">{icon}</span>
    <span><strong className="text-foreground font-display">{value}</strong> {label}</span>
  </div>
);

const SectionHeader = ({ icon, title, accent }: { icon: React.ReactNode; title: string; accent?: boolean }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
      {icon}
    </div>
    <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
  </div>
);

const EmptyState = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
    <div className="text-muted-foreground/40 mb-3 flex justify-center">{icon}</div>
    <p className="text-muted-foreground font-body text-sm">{text}</p>
  </div>
);

const SidebarCard = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-border bg-card p-5">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-primary">{icon}</span>
      <h3 className="font-display text-xs font-bold text-foreground uppercase tracking-[0.1em]">{title}</h3>
    </div>
    {children}
  </section>
);

export default EpochDetail;
