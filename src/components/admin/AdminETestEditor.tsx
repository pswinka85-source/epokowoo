import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, ClipboardCheck, ChevronUp, ChevronDown } from "lucide-react";
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
      // Update the lesson's test_quiz_id
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
    // Remove link from lesson
    await supabase.from("lessons").update({ test_quiz_id: null }).eq("id", lessonId);
    // Delete questions and quiz
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

  if (!testQuizId) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center">
        <ClipboardCheck size={28} className="mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground font-body mb-3">Ta lekcja nie ma jeszcze e-testu.</p>
        <button
          onClick={createETest}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-body font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus size={14} /> {loading ? "Tworzę..." : "Utwórz e-test"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={16} className="text-primary" />
          <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-wider">E-test ({questions.length} pytań)</h3>
        </div>
        <button onClick={removeETest} className="text-xs text-destructive hover:text-destructive/80 font-body flex items-center gap-1">
          <Trash2 size={12} /> Usuń e-test
        </button>
      </div>

      {/* Questions list */}
      <div className="space-y-3 mb-4">
        {questions.map((q, idx) => (
          <div key={q.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                {idx + 1}. {QUESTION_LABELS[q.question_type]}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => moveQuestion(idx, -1)} disabled={idx === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp size={14} /></button>
                <button onClick={() => moveQuestion(idx, 1)} disabled={idx === questions.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown size={14} /></button>
                <button onClick={() => deleteQuestion(q.id)} className="p-1 text-destructive hover:text-destructive/80"><Trash2 size={14} /></button>
              </div>
            </div>
            <input
              value={q.question_text}
              onChange={e => updateQuestion(q.id, { question_text: e.target.value })}
              placeholder="Treść pytania"
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-body font-medium focus:outline-none focus:ring-2 focus:ring-ring mb-2"
            />
            <QuestionDataEditor type={q.question_type} data={q.question_data as Record<string, any>} onChange={d => updateQuestion(q.id, { question_data: d as Json })} />
          </div>
        ))}
      </div>

      {/* Add question buttons */}
      <div>
        <p className="text-xs text-muted-foreground font-body mb-2">Dodaj pytanie:</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(QUESTION_LABELS) as QuestionType[]).map(type => (
            <button key={type} onClick={() => addQuestion(type)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-border text-xs font-body text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
              <Plus size={12} /> {QUESTION_LABELS[type]}
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
          <input type="radio" checked={!!opt.correct} onChange={() => {
            const newOpts = options.map((o, j) => ({ text: o.text, ...(j === i ? { correct: true } : {}) }));
            onChange({ ...data, options: newOpts });
          }} className="accent-primary" />
          <input value={opt.text} onChange={e => {
            const newOpts = [...options]; newOpts[i] = { ...newOpts[i], text: e.target.value };
            onChange({ ...data, options: newOpts });
          }} placeholder={`Odpowiedź ${String.fromCharCode(65 + i)}`} className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
          {options.length > 2 && <button onClick={() => onChange({ ...data, options: options.filter((_, j) => j !== i) })} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>}
        </div>
      ))}
      {options.length < 6 && <button onClick={() => onChange({ ...data, options: [...options, { text: "" }] })} className="text-xs text-primary hover:underline font-body">+ Dodaj</button>}
      <textarea value={data.explanation || ""} onChange={e => onChange({ ...data, explanation: e.target.value })} placeholder="Wyjaśnienie" rows={2} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
    </div>
  );
}

function FillBlankEditor({ data, onChange }: { data: Record<string, any>; onChange: (d: Record<string, any>) => void }) {
  const answers = (data.answers || [""]) as string[];
  return (
    <div className="space-y-2">
      <textarea value={data.text_with_gaps || ""} onChange={e => onChange({ ...data, text_with_gaps: e.target.value })} placeholder="Tekst z [___] lukami" rows={2} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
      <div>
        <label className="text-xs text-muted-foreground font-body block mb-1">Odpowiedzi:</label>
        {answers.map((ans, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
            <input value={ans} onChange={e => { const a = [...answers]; a[i] = e.target.value; onChange({ ...data, answers: a }); }} className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
            {answers.length > 1 && <button onClick={() => onChange({ ...data, answers: answers.filter((_, j) => j !== i) })} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>}
          </div>
        ))}
        <button onClick={() => onChange({ ...data, answers: [...answers, ""] })} className="text-xs text-primary hover:underline font-body">+ Dodaj lukę</button>
      </div>
    </div>
  );
}

function MatchingEditor({ data, onChange }: { data: Record<string, any>; onChange: (d: Record<string, any>) => void }) {
  const pairs = (data.pairs || []) as { left: string; right: string }[];
  return (
    <div className="space-y-2">
      {pairs.map((pair, i) => (
        <div key={i} className="flex items-center gap-2">
          <input value={pair.left} onChange={e => { const p = [...pairs]; p[i] = { ...p[i], left: e.target.value }; onChange({ ...data, pairs: p }); }} placeholder="Lewa" className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
          <span className="text-muted-foreground text-xs">↔</span>
          <input value={pair.right} onChange={e => { const p = [...pairs]; p[i] = { ...p[i], right: e.target.value }; onChange({ ...data, pairs: p }); }} placeholder="Prawa" className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
          {pairs.length > 1 && <button onClick={() => onChange({ ...data, pairs: pairs.filter((_, j) => j !== i) })} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>}
        </div>
      ))}
      <button onClick={() => onChange({ ...data, pairs: [...pairs, { left: "", right: "" }] })} className="text-xs text-primary hover:underline font-body">+ Dodaj parę</button>
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
          <input key={i} value={h} onChange={e => { const hs = [...headers]; hs[i] = e.target.value; onChange({ ...data, headers: hs }); }} placeholder={`Kol. ${i + 1}`} className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
        ))}
        {headers.length < 5 && <button onClick={() => onChange({ ...data, headers: [...headers, ""], rows: rows.map(r => [...r, ""]) })} className="text-xs text-primary hover:underline font-body whitespace-nowrap">+ Kol.</button>}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-2">
          {row.map((cell, ci) => (
            <input key={ci} value={cell} onChange={e => { const r = rows.map(r => [...r]); r[ri][ci] = e.target.value; onChange({ ...data, rows: r }); }} placeholder="..." className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
          ))}
          {rows.length > 1 && <button onClick={() => onChange({ ...data, rows: rows.filter((_, j) => j !== ri) })} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>}
        </div>
      ))}
      <button onClick={() => onChange({ ...data, rows: [...rows, headers.map(() => "")] })} className="text-xs text-primary hover:underline font-body">+ Wiersz</button>
    </div>
  );
}

function OrderingEditor({ data, onChange }: { data: Record<string, any>; onChange: (d: Record<string, any>) => void }) {
  const items = (data.items || []) as string[];
  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground font-body block">Poprawna kolejność:</label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
          <input value={item} onChange={e => { const it = [...items]; it[i] = e.target.value; onChange({ ...data, items: it }); }} className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
          {items.length > 2 && <button onClick={() => onChange({ ...data, items: items.filter((_, j) => j !== i) })} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>}
        </div>
      ))}
      <button onClick={() => onChange({ ...data, items: [...items, ""] })} className="text-xs text-primary hover:underline font-body">+ Element</button>
    </div>
  );
}
