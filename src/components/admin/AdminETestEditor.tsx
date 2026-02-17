import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";

type QuestionType = "abcd" | "fill_blank" | "matching" | "table_gap" | "ordering";

interface QuestionRow {
  id: string;
  quiz_id: string;
  question_type: QuestionType;
  question_text: string;
  question_data: Json;
  sort_order: number;
}

const QUESTION_LABELS: Record<QuestionType, string> = {
  abcd: "ABCD",
  fill_blank: "Uzupełnianie luk",
  matching: "Dopasowywanie",
  table_gap: "Tabela z lukami",
  ordering: "Kolejność",
};

interface AdminETestEditorProps {
  lessonId: string;
  lessonTitle: string;
  epochId: string;
  testQuizId: string | null;
  onTestQuizIdChange: (id: string | null) => void;
}

const inputClass =
  "w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-body placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-200";

const smallInputClass =
  "flex-1 h-9 px-3 rounded-lg border border-input bg-background text-sm font-body placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-200";

const textareaClass =
  "w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm font-body placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-200 resize-none";

const linkBtnClass =
  "text-xs text-primary font-body font-medium hover:text-primary/80 transition-colors";

const dangerLinkClass =
  "text-xs text-muted-foreground hover:text-destructive font-body transition-colors";

export default function AdminETestEditor({ lessonId, lessonTitle, epochId, testQuizId, onTestQuizIdChange }: AdminETestEditorProps) {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchQuestions = async (quizId: string) => {
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("sort_order");
    if (data) setQuestions(data as QuestionRow[]);
  };

  useEffect(() => {
    if (testQuizId) fetchQuestions(testQuizId);
    else setQuestions([]);
  }, [testQuizId]);

  const createETest = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("quizzes").insert({
      epoch_id: epochId,
      title: `${lessonTitle} — E-test`,
      published: true,
    }).select().single();

    if (error) { toast.error(error.message); setLoading(false); return; }
    if (data) {
      const { error: updateError } = await supabase.from("lessons").update({ test_quiz_id: data.id }).eq("id", lessonId);
      if (updateError) { toast.error(updateError.message); setLoading(false); return; }
      onTestQuizIdChange(data.id);
      toast.success("E-test utworzony!");
    }
    setLoading(false);
  };

  const removeETest = async () => {
    if (!testQuizId) return;
    if (!confirm("Usunąć e-test i wszystkie jego pytania?")) return;
    await supabase.from("lessons").update({ test_quiz_id: null }).eq("id", lessonId);
    await supabase.from("quiz_questions").delete().eq("quiz_id", testQuizId);
    await supabase.from("quizzes").delete().eq("id", testQuizId);
    onTestQuizIdChange(null);
    setQuestions([]);
    toast.success("E-test usunięty");
  };

  const addQuestion = async (type: QuestionType) => {
    if (!testQuizId) return;
    let defaultData: Json = {};
    if (type === "abcd") defaultData = { options: [{ text: "", correct: true }, { text: "" }, { text: "" }, { text: "" }], explanation: "" };
    if (type === "fill_blank") defaultData = { text_with_gaps: "Tekst z [___] lukami", answers: [""] };
    if (type === "matching") defaultData = { pairs: [{ left: "", right: "" }] };
    if (type === "table_gap") defaultData = { headers: ["Kolumna 1", "Kolumna 2"], rows: [["", ""]] };
    if (type === "ordering") defaultData = { items: ["Element 1", "Element 2", "Element 3"] };

    const { error } = await supabase.from("quiz_questions").insert({
      quiz_id: testQuizId,
      question_type: type,
      question_text: "",
      question_data: defaultData,
      sort_order: questions.length,
    });
    if (error) toast.error(error.message);
    else await fetchQuestions(testQuizId);
  };

  const updateQuestion = async (id: string, updates: Partial<{ question_text: string; question_data: Json }>) => {
    await supabase.from("quiz_questions").update(updates).eq("id", id);
    if (testQuizId) await fetchQuestions(testQuizId);
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("quiz_questions").delete().eq("id", id);
    if (testQuizId) await fetchQuestions(testQuizId);
  };

  const moveQuestion = async (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    const a = questions[idx];
    const b = questions[newIdx];
    await Promise.all([
      supabase.from("quiz_questions").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("quiz_questions").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    if (testQuizId) await fetchQuestions(testQuizId);
  };

  // Empty state
  if (!testQuizId) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-8 text-center">
        <p className="text-sm text-muted-foreground font-body mb-4">Brak e-testu dla tej lekcji</p>
        <button
          onClick={createETest}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-body font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
        >
          {loading ? "Tworzę…" : "Utwórz e-test"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-wider">
          E-test · {questions.length} {questions.length === 1 ? "pytanie" : "pytań"}
        </p>
        <button onClick={removeETest} className={dangerLinkClass}>
          Usuń e-test
        </button>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div key={q.id} className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-body font-semibold text-muted-foreground uppercase tracking-widest">
                {idx + 1}. {QUESTION_LABELS[q.question_type]}
              </span>
              <div className="flex items-center gap-3">
                {idx > 0 && (
                  <button onClick={() => moveQuestion(idx, -1)} className={dangerLinkClass}>↑</button>
                )}
                {idx < questions.length - 1 && (
                  <button onClick={() => moveQuestion(idx, 1)} className={dangerLinkClass}>↓</button>
                )}
                <button onClick={() => deleteQuestion(q.id)} className="text-xs text-muted-foreground hover:text-destructive font-body transition-colors">
                  Usuń
                </button>
              </div>
            </div>
            <input
              value={q.question_text}
              onChange={e => updateQuestion(q.id, { question_text: e.target.value })}
              placeholder="Treść pytania…"
              className={inputClass + " mb-3 font-medium"}
            />
            <QuestionDataEditor type={q.question_type} data={q.question_data as Record<string, any>} onChange={d => updateQuestion(q.id, { question_data: d as Json })} />
          </div>
        ))}
      </div>

      {/* Add question */}
      <div className="rounded-2xl border border-dashed border-border bg-secondary/10 p-4">
        <p className="text-[11px] font-body font-semibold text-muted-foreground uppercase tracking-widest mb-3">Dodaj pytanie</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(QUESTION_LABELS) as QuestionType[]).map(type => (
            <button
              key={type}
              onClick={() => addQuestion(type)}
              className="px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-body font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 active:scale-[0.97] transition-all duration-200"
            >
              {QUESTION_LABELS[type]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Question Data Editors ── */

function QuestionDataEditor({ type, data, onChange }: { type: QuestionType; data: Record<string, any>; onChange: (d: Record<string, any>) => void }) {
  if (type === "abcd") return <AbcdEditor data={data} onChange={onChange} />;
  if (type === "fill_blank") return <FillBlankEditor data={data} onChange={onChange} />;
  if (type === "matching") return <MatchingEditor data={data} onChange={onChange} />;
  if (type === "table_gap") return <TableGapEditor data={data} onChange={onChange} />;
  if (type === "ordering") return <OrderingEditor data={data} onChange={onChange} />;
  return null;
}

function AbcdEditor({ data, onChange }: { data: Record<string, any>; onChange: (d: Record<string, any>) => void }) {
  const options = (data.options || []) as { text: string; correct?: boolean }[];
  return (
    <div className="space-y-2">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="radio"
            checked={!!opt.correct}
            onChange={() => {
              const newOpts = options.map((o, j) => ({ text: o.text, ...(j === i ? { correct: true } : {}) }));
              onChange({ ...data, options: newOpts });
            }}
            className="accent-primary w-4 h-4"
          />
          <input
            value={opt.text}
            onChange={e => {
              const newOpts = [...options]; newOpts[i] = { ...newOpts[i], text: e.target.value };
              onChange({ ...data, options: newOpts });
            }}
            placeholder={`Odpowiedź ${String.fromCharCode(65 + i)}`}
            className={smallInputClass}
          />
          {options.length > 2 && (
            <button onClick={() => onChange({ ...data, options: options.filter((_, j) => j !== i) })} className={dangerLinkClass}>×</button>
          )}
        </div>
      ))}
      {options.length < 6 && (
        <button onClick={() => onChange({ ...data, options: [...options, { text: "" }] })} className={linkBtnClass}>+ Dodaj odpowiedź</button>
      )}
      <textarea
        value={data.explanation || ""}
        onChange={e => onChange({ ...data, explanation: e.target.value })}
        placeholder="Wyjaśnienie (opcjonalne)"
        rows={2}
        className={textareaClass}
      />
    </div>
  );
}

function FillBlankEditor({ data, onChange }: { data: Record<string, any>; onChange: (d: Record<string, any>) => void }) {
  const answers = (data.answers || [""]) as string[];
  return (
    <div className="space-y-2">
      <textarea
        value={data.text_with_gaps || ""}
        onChange={e => onChange({ ...data, text_with_gaps: e.target.value })}
        placeholder="Tekst z [___] lukami"
        rows={2}
        className={textareaClass}
      />
      <p className="text-[11px] font-body text-muted-foreground uppercase tracking-widest">Odpowiedzi</p>
      {answers.map((ans, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-body w-5 text-right">{i + 1}.</span>
          <input
            value={ans}
            onChange={e => { const a = [...answers]; a[i] = e.target.value; onChange({ ...data, answers: a }); }}
            className={smallInputClass}
          />
          {answers.length > 1 && (
            <button onClick={() => onChange({ ...data, answers: answers.filter((_, j) => j !== i) })} className={dangerLinkClass}>×</button>
          )}
        </div>
      ))}
      <button onClick={() => onChange({ ...data, answers: [...answers, ""] })} className={linkBtnClass}>+ Dodaj lukę</button>
    </div>
  );
}

function MatchingEditor({ data, onChange }: { data: Record<string, any>; onChange: (d: Record<string, any>) => void }) {
  const pairs = (data.pairs || []) as { left: string; right: string }[];
  return (
    <div className="space-y-2">
      {pairs.map((pair, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={pair.left}
            onChange={e => { const p = [...pairs]; p[i] = { ...p[i], left: e.target.value }; onChange({ ...data, pairs: p }); }}
            placeholder="Lewa strona"
            className={smallInputClass}
          />
          <span className="text-muted-foreground/40 text-xs font-body">—</span>
          <input
            value={pair.right}
            onChange={e => { const p = [...pairs]; p[i] = { ...p[i], right: e.target.value }; onChange({ ...data, pairs: p }); }}
            placeholder="Prawa strona"
            className={smallInputClass}
          />
          {pairs.length > 1 && (
            <button onClick={() => onChange({ ...data, pairs: pairs.filter((_, j) => j !== i) })} className={dangerLinkClass}>×</button>
          )}
        </div>
      ))}
      <button onClick={() => onChange({ ...data, pairs: [...pairs, { left: "", right: "" }] })} className={linkBtnClass}>+ Dodaj parę</button>
    </div>
  );
}

function TableGapEditor({ data, onChange }: { data: Record<string, any>; onChange: (d: Record<string, any>) => void }) {
  const headers = (data.headers || ["", ""]) as string[];
  const rows = (data.rows || [["", ""]]) as string[][];
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {headers.map((h, i) => (
          <input
            key={i}
            value={h}
            onChange={e => { const hs = [...headers]; hs[i] = e.target.value; onChange({ ...data, headers: hs }); }}
            placeholder={`Kolumna ${i + 1}`}
            className={smallInputClass + " font-medium"}
          />
        ))}
        {headers.length < 5 && (
          <button onClick={() => onChange({ ...data, headers: [...headers, ""], rows: rows.map(r => [...r, ""]) })} className={linkBtnClass + " whitespace-nowrap self-center"}>+ Kol.</button>
        )}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-2">
          {row.map((cell, ci) => (
            <input
              key={ci}
              value={cell}
              onChange={e => { const r = rows.map(r => [...r]); r[ri][ci] = e.target.value; onChange({ ...data, rows: r }); }}
              placeholder="…"
              className={smallInputClass}
            />
          ))}
          {rows.length > 1 && (
            <button onClick={() => onChange({ ...data, rows: rows.filter((_, j) => j !== ri) })} className={dangerLinkClass + " self-center"}>×</button>
          )}
        </div>
      ))}
      <button onClick={() => onChange({ ...data, rows: [...rows, headers.map(() => "")] })} className={linkBtnClass}>+ Wiersz</button>
    </div>
  );
}

function OrderingEditor({ data, onChange }: { data: Record<string, any>; onChange: (d: Record<string, any>) => void }) {
  const items = (data.items || []) as string[];
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-body text-muted-foreground uppercase tracking-widest">Poprawna kolejność</p>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-body w-5 text-right">{i + 1}.</span>
          <input
            value={item}
            onChange={e => { const it = [...items]; it[i] = e.target.value; onChange({ ...data, items: it }); }}
            className={smallInputClass}
          />
          {items.length > 2 && (
            <button onClick={() => onChange({ ...data, items: items.filter((_, j) => j !== i) })} className={dangerLinkClass}>×</button>
          )}
        </div>
      ))}
      <button onClick={() => onChange({ ...data, items: [...items, ""] })} className={linkBtnClass}>+ Element</button>
    </div>
  );
}
