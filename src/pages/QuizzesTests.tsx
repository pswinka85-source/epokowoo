import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Brain, FileText, Zap, ArrowLeft } from "lucide-react";
import KahootQuizPlayer from "@/components/KahootQuizPlayer";
import QuizPlayer from "@/components/QuizPlayer";

interface QuizItem {
  id: string;
  title: string;
  description: string | null;
  epoch_id: string;
  type: "quiz" | "test";
  lesson_title?: string;
  questions: any[];
}

const QuizzesTests = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState<QuizItem | null>(null);
  const [tab, setTab] = useState<"quizzes" | "tests">("quizzes");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Load all published quizzes with their questions
    const { data: quizzes } = await supabase
      .from("quizzes")
      .select("id, title, description, epoch_id, published")
      .eq("published", true);

    const { data: allQuestions } = await supabase
      .from("quiz_questions")
      .select("id, quiz_id, question_type, question_text, question_data, sort_order")
      .order("sort_order");

    // Load lessons with test_quiz_id
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, title, epoch_id, test_quiz_id, published")
      .eq("published", true)
      .not("test_quiz_id", "is", null);

    const questionsByQuiz = new Map<string, any[]>();
    (allQuestions || []).forEach((q) => {
      const list = questionsByQuiz.get(q.quiz_id) || [];
      list.push(q);
      questionsByQuiz.set(q.quiz_id, list);
    });

    const lessonTestQuizIds = new Set((lessons || []).map((l) => l.test_quiz_id).filter(Boolean));

    const result: QuizItem[] = [];

    // Standalone quizzes (not lesson tests)
    (quizzes || []).forEach((q) => {
      if (lessonTestQuizIds.has(q.id)) return; // skip lesson tests from quiz tab
      const qs = questionsByQuiz.get(q.id) || [];
      if (qs.length === 0) return;
      // Only include ABCD quizzes for Kahoot mode
      const abcdOnly = qs.filter((qq: any) => qq.question_type === "abcd");
      if (abcdOnly.length === 0) return;
      result.push({
        id: q.id,
        title: q.title,
        description: q.description,
        epoch_id: q.epoch_id,
        type: "quiz",
        questions: abcdOnly,
      });
    });

    // Lesson tests
    (lessons || []).forEach((l) => {
      if (!l.test_quiz_id) return;
      const qs = questionsByQuiz.get(l.test_quiz_id) || [];
      if (qs.length === 0) return;
      result.push({
        id: l.test_quiz_id!,
        title: `E-test: ${l.title}`,
        description: `Test do lekcji "${l.title}"`,
        epoch_id: l.epoch_id,
        type: "test",
        lesson_title: l.title,
        questions: qs,
      });
    });

    setItems(result);
    setLoading(false);
  };

  const quizzes = items.filter((i) => i.type === "quiz");
  const tests = items.filter((i) => i.type === "test");
  const currentList = tab === "quizzes" ? quizzes : tests;

  if (activeQuiz) {
    if (activeQuiz.type === "quiz") {
      return (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <KahootQuizPlayer
            quizId={activeQuiz.id}
            title={activeQuiz.title}
            questions={activeQuiz.questions}
            onBack={() => setActiveQuiz(null)}
          />
        </div>
      );
    }
    // Test mode — use existing QuizPlayer
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => setActiveQuiz(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-body mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Wróć do listy
        </button>
        <QuizPlayer title={activeQuiz.title} questions={activeQuiz.questions} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Quizy & Testy</h1>
        <p className="text-muted-foreground font-body">
          Sprawdź swoją wiedzę — rozwiązuj quizy w stylu Kahoot lub testy z lekcji.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary/60 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setTab("quizzes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-body transition-all ${
            tab === "quizzes"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap size={15} />
          Quizy ({quizzes.length})
        </button>
        <button
          onClick={() => setTab("tests")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-body transition-all ${
            tab === "tests"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText size={15} />
          E-testy ({tests.length})
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
              <div className="h-5 bg-secondary rounded w-2/3 mb-3" />
              <div className="h-4 bg-secondary rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && currentList.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Brain size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-display font-semibold text-foreground mb-1">
            {tab === "quizzes" ? "Brak quizów" : "Brak e-testów"}
          </p>
          <p className="text-sm text-muted-foreground font-body">
            {tab === "quizzes"
              ? "Quizy pojawią się tutaj, gdy zostaną opublikowane."
              : "E-testy pojawią się, gdy lekcje będą miały przypisane testy."}
          </p>
        </div>
      )}

      {/* List */}
      {!loading && currentList.length > 0 && (
        <div className="space-y-3">
          {currentList.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveQuiz(item)}
              className="w-full text-left rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground font-body line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-muted-foreground font-body">
                      {item.questions.length} pytań
                    </span>
                    {item.type === "quiz" && (
                      <span className="text-xs font-semibold text-accent font-body flex items-center gap-1">
                        <Zap size={12} /> Kahoot
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    item.type === "quiz"
                      ? "bg-accent/10 text-accent"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {item.type === "quiz" ? <Zap size={18} /> : <FileText size={18} />}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizzesTests;
