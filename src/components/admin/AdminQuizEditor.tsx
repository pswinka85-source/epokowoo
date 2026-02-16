import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Save, ChevronUp, ChevronDown } from "lucide-react";
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

interface QuizRow {
  id: string;
  title: string;
  description: string | null;
  epoch_id: string;
  published: boolean;
}

const QUESTION_LABELS: Record<QuestionType, string> = {
  abcd: "ABCD (wielokrotny wybór)",
  fill_blank: "Uzupełnianie luk",
  matching: "Dopasowywanie",
  table_gap: "Uzupełnianie tabeli",
  ordering: "Ustalenie kolejności",
};

export default function AdminQuizEditor({ epochId, epochName }: { epochId: string; epochName: string }) {
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPublished, setEditPublished] = useState(false);
  const [editRequiresAuth, setEditRequiresAuth] = useState(false);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchQuizzes = async () => {
    const { data } = await supabase.from("quizzes").select("*").eq("epoch_id", epochId).order("created_at");
    if (data) setQuizzes(data);
  };

  const fetchQuestions = async (quizId: string) => {
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("sort_order");
    if (data) setQuestions(data as QuestionRow[]);
  };

  useEffect(() => { fetchQuizzes(); }, [epochId]);

  const startEdit = async (quiz: QuizRow) => {
    setEditingId(quiz.id);
    setEditTitle(quiz.title);
    setEditDesc(quiz.description || "");
    setEditPublished(quiz.published);
    setEditRequiresAuth((quiz as any).requires_auth || false);
    await fetchQuestions(quiz.id);
  };

  const createQuiz = async () => {
    const { data, error } = await supabase.from("quizzes").insert({ epoch_id: epochId, title: "Nowy quiz" }).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) { await fetchQuizzes(); startEdit(data); }
  };

  const saveQuiz = async () => {
    if (!editingId) return;
    setSaving(true);
    const { error } = await supabase.from("quizzes").update({ title: editTitle, description: editDesc || null, published: editPublished, requires_auth: editRequiresAuth }).eq("id", editingId);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Zapisano!"); await fetchQuizzes(); }
  };

  const deleteQuiz = async (id: string) => {
    if (!confirm("Usunąć quiz?")) return;
    await supabase.from("quizzes").delete().eq("id", id);
    if (editingId === id) { setEditingId(null); setQuestions([]); }
    await fetchQuizzes();
  };

  const addQuestion = async (type: QuestionType) => {
    if (!editingId) return;
    let defaultData: Json = {};
    if (type === "abcd") defaultData = { options: [{ text: "", correct: true }, { text: "" }, { text: "" }, { text: "" }], explanation: "" };
    if (type === "fill_blank") defaultData = { text_with_gaps: "Tekst z [___] lukami", answers: [""] };
    if (type === "matching") defaultData = { pairs: [{ left: "", right: "" }] };
    if (type === "table_gap") defaultData = { headers: ["Kolumna 1", "Kolumna 2"], rows: [["", ""]] };
    if (type === "ordering") defaultData = { items: ["Element 1", "Element 2", "Element 3"] };

    const { error } = await supabase.from("quiz_questions").insert({
      quiz_id: editingId,
      question_type: type,
      question_text: "",
      question_data: defaultData,
      sort_order: questions.length,
    });
    if (error) toast.error(error.message);
    else await fetchQuestions(editingId);
  };

  const updateQuestion = async (id: string, updates: Partial<{ question_text: string; question_data: Json }>) => {
    await supabase.from("quiz_questions").update(updates).eq("id", id);
    if (editingId) await fetchQuestions(editingId);
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("quiz_questions").delete().eq("id", id);
    if (editingId) await fetchQuestions(editingId);
  };

  if (editingId) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { setEditingId(null); setQuestions([]); }} className="text-sm text-muted-foreground hover:text-primary font-body">← Wróć do listy</button>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-body">
              <input type="checkbox" checked={editPublished} onChange={e => setEditPublished(e.target.checked)} className="rounded" />
              Opublikowany
            </label>
            <label className="flex items-center gap-2 text-sm font-body">
              <input type="checkbox" checked={editRequiresAuth} onChange={e => setEditRequiresAuth(e.target.checked)} className="rounded" />
              Wymaga konta
            </label>
            <button onClick={saveQuiz} disabled={saving} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-body font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
              <Save size={14} /> {saving ? "Zapisuję..." : "Zapisz"}
            </button>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Tytuł quizu" className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground font-display text-lg font-bold focus:outline-none focus:ring-2 focus:ring-ring" />
          <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Opis quizu" rows={2} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
        </div>

        {/* Questions */}
        <h3 className="font-display font-semibold text-foreground mb-3">Pytania ({questions.length})</h3>
        <div className="space-y-4 mb-6">
          {questions.map((q, idx) => (
            <QuestionEditor key={q.id} question={q} onUpdate={(u) => updateQuestion(q.id, u)} onDelete={() => deleteQuestion(q.id)} />
          ))}
        </div>

        {/* Add question */}
        <div>
          <p className="text-sm text-muted-foreground font-body mb-2">Dodaj pytanie:</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(QUESTION_LABELS) as QuestionType[]).map(type => (
              <button key={type} onClick={() => addQuestion(type)} className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-border text-sm font-body text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                <Plus size={14} /> {QUESTION_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold text-foreground">Quizy — {epochName}</h2>
        <button onClick={createQuiz} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-body font-medium hover:bg-primary/90 flex items-center gap-2">
          <Plus size={14} /> Nowy quiz
        </button>
      </div>
      {quizzes.length === 0 ? (
        <p className="text-muted-foreground font-body text-sm py-8 text-center">Brak quizów.</p>
      ) : (
        <div className="space-y-2">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:shadow-[var(--shadow-card)] transition-shadow">
              <div className="cursor-pointer flex-1" onClick={() => startEdit(quiz)}>
                <h3 className="font-display font-semibold text-foreground">{quiz.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-body ${quiz.published ? "bg-green-500/10 text-green-600" : "bg-secondary text-muted-foreground"}`}>
                  {quiz.published ? "Opublikowany" : "Szkic"}
                </span>
              </div>
              <button onClick={() => deleteQuiz(quiz.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionEditor({ question, onUpdate, onDelete }: { question: QuestionRow; onUpdate: (u: Partial<{ question_text: string; question_data: Json }>) => void; onDelete: () => void }) {
  const data = question.question_data as Record<string, any>;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">{QUESTION_LABELS[question.question_type]}</span>
        <button onClick={onDelete} className="p-1 text-destructive hover:text-destructive/80"><Trash2 size={14} /></button>
      </div>

      <input value={question.question_text} onChange={e => onUpdate({ question_text: e.target.value })} placeholder="Treść pytania" className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-body font-medium focus:outline-none focus:ring-2 focus:ring-ring mb-3" />

      {question.question_type === "abcd" && (
        <AbcdEditor data={data} onChange={d => onUpdate({ question_data: d as Json })} />
      )}
      {question.question_type === "fill_blank" && (
        <FillBlankEditor data={data} onChange={d => onUpdate({ question_data: d as Json })} />
      )}
      {question.question_type === "matching" && (
        <MatchingEditor data={data} onChange={d => onUpdate({ question_data: d as Json })} />
      )}
      {question.question_type === "table_gap" && (
        <TableGapEditor data={data} onChange={d => onUpdate({ question_data: d as Json })} />
      )}
      {question.question_type === "ordering" && (
        <OrderingEditor data={data} onChange={d => onUpdate({ question_data: d as Json })} />
      )}
    </div>
  );
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
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground font-body block mb-1">Tekst z lukami (użyj [___] dla luk)</label>
        <textarea value={data.text_with_gaps || ""} onChange={e => onChange({ ...data, text_with_gaps: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground font-body block mb-1">Poprawne odpowiedzi (w kolejności luk)</label>
        {answers.map((ans, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
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
      <label className="text-xs text-muted-foreground font-body block">Pary do dopasowania</label>
      {pairs.map((pair, i) => (
        <div key={i} className="flex items-center gap-2">
          <input value={pair.left} onChange={e => { const p = [...pairs]; p[i] = { ...p[i], left: e.target.value }; onChange({ ...data, pairs: p }); }} placeholder="Lewa strona" className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
          <span className="text-muted-foreground">↔</span>
          <input value={pair.right} onChange={e => { const p = [...pairs]; p[i] = { ...p[i], right: e.target.value }; onChange({ ...data, pairs: p }); }} placeholder="Prawa strona" className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
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
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground font-body block mb-1">Nagłówki kolumn</label>
        <div className="flex gap-2">
          {headers.map((h, i) => (
            <input key={i} value={h} onChange={e => { const hs = [...headers]; hs[i] = e.target.value; onChange({ ...data, headers: hs }); }} placeholder={`Kolumna ${i + 1}`} className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
          ))}
          {headers.length < 5 && <button onClick={() => {
            onChange({ ...data, headers: [...headers, ""], rows: rows.map(r => [...r, ""]) });
          }} className="text-xs text-primary hover:underline font-body whitespace-nowrap">+ Kolumna</button>}
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground font-body block mb-1">Wiersze (puste = luka do uzupełnienia)</label>
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-2 mb-1">
            {row.map((cell, ci) => (
              <input key={ci} value={cell} onChange={e => { const r = rows.map(r => [...r]); r[ri][ci] = e.target.value; onChange({ ...data, rows: r }); }} placeholder="..." className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
            ))}
            {rows.length > 1 && <button onClick={() => onChange({ ...data, rows: rows.filter((_, j) => j !== ri) })} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>}
          </div>
        ))}
        <button onClick={() => onChange({ ...data, rows: [...rows, headers.map(() => "")] })} className="text-xs text-primary hover:underline font-body">+ Dodaj wiersz</button>
      </div>
    </div>
  );
}

function OrderingEditor({ data, onChange }: { data: Record<string, any>; onChange: (d: Record<string, any>) => void }) {
  const items = (data.items || []) as string[];
  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground font-body block">Elementy w poprawnej kolejności (od góry do dołu)</label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-body w-6">{i + 1}.</span>
          <input value={item} onChange={e => { const a = [...items]; a[i] = e.target.value; onChange({ ...data, items: a }); }}
            placeholder={`Element ${i + 1}`} className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
          {items.length > 2 && <button onClick={() => onChange({ ...data, items: items.filter((_, j) => j !== i) })} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>}
        </div>
      ))}
      {items.length < 10 && <button onClick={() => onChange({ ...data, items: [...items, ""] })} className="text-xs text-primary hover:underline font-body">+ Dodaj element</button>}
    </div>
  );
}
