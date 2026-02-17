import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Save, GripVertical, ChevronDown, ChevronUp, Image, Video, Type, AlertCircle, Brain, Heading, ClipboardList, Clock } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import AdminETestEditor from "./AdminETestEditor";

type AdvancedQuestionType = "abcd" | "fill_blank" | "matching" | "table_gap" | "ordering";

interface LessonBlock {
  type: "heading" | "text" | "image" | "video" | "quiz" | "callout" | "advanced_quiz" | "timeline";
  content?: string;
  src?: string;
  alt?: string;
  caption?: string;
  youtubeId?: string;
  icon?: string;
  question?: string;
  options?: { text: string; correct?: boolean }[];
  explanation?: string;
  // Advanced quiz fields
  advanced_question_type?: AdvancedQuestionType;
  question_data?: Record<string, any>;
  // Timeline fields
  events?: { date: string; title: string; description?: string }[];
}

interface LessonRow {
  id: string;
  title: string;
  description: string | null;
  blocks: Json;
  sort_order: number;
  published: boolean;
  epoch_id: string;
  requires_auth: boolean;
  test_quiz_id: string | null;
}

const BLOCK_TYPES = [
  { type: "heading", label: "Nagłówek", icon: Heading },
  { type: "text", label: "Tekst", icon: Type },
  { type: "image", label: "Obraz", icon: Image },
  { type: "video", label: "Film YT", icon: Video },
  { type: "callout", label: "Wskazówka", icon: AlertCircle },
  { type: "quiz", label: "Mini-quiz", icon: Brain },
  { type: "advanced_quiz", label: "Quiz zaawansowany", icon: ClipboardList },
  { type: "timeline", label: "Oś czasu", icon: Clock },
] as const;

const ADVANCED_QUESTION_LABELS: Record<AdvancedQuestionType, string> = {
  abcd: "ABCD (wielokrotny wybór)",
  fill_blank: "Uzupełnianie luk",
  matching: "Dopasowywanie",
  table_gap: "Uzupełnianie tabeli",
  ordering: "Ustalenie kolejności",
};

export default function AdminLessonEditor({ epochId, epochName, initialEditId, onEditStarted }: { epochId: string; epochName: string; initialEditId?: string | null; onEditStarted?: () => void }) {
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editBlocks, setEditBlocks] = useState<LessonBlock[]>([]);
  const [editPublished, setEditPublished] = useState(false);
  const [editRequiresAuth, setEditRequiresAuth] = useState(false);
  const [editTestQuizId, setEditTestQuizId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchLessons = async () => {
    const { data } = await supabase.from("lessons").select("*").eq("epoch_id", epochId).order("sort_order");
    if (data) {
      setLessons(data);
      // Auto-open lesson for editing if initialEditId is set
      if (initialEditId && !editingId) {
        const lesson = data.find(l => l.id === initialEditId);
        if (lesson) {
          startEdit(lesson);
          onEditStarted?.();
        }
      }
    }
  };

  useEffect(() => { fetchLessons(); }, [epochId]);

  const startEdit = (lesson: LessonRow) => {
    setEditingId(lesson.id);
    setEditTitle(lesson.title);
    setEditDesc(lesson.description || "");
    setEditBlocks((lesson.blocks as unknown as LessonBlock[]) || []);
    setEditPublished(lesson.published);
    setEditRequiresAuth(lesson.requires_auth);
    setEditTestQuizId(lesson.test_quiz_id);
  };

  const createNew = async () => {
    const { data, error } = await supabase.from("lessons").insert({
      epoch_id: epochId,
      title: "Nowa lekcja",
      description: "",
      blocks: [] as unknown as Json,
      sort_order: lessons.length,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) {
      await fetchLessons();
      startEdit(data);
    }
  };

  const saveLesson = async () => {
    if (!editingId) return;
    setSaving(true);
    const { error } = await supabase.from("lessons").update({
      title: editTitle,
      description: editDesc || null,
      blocks: editBlocks as unknown as Json,
      published: editPublished,
      requires_auth: editRequiresAuth,
      test_quiz_id: editTestQuizId,
    }).eq("id", editingId);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Zapisano!"); await fetchLessons(); }
  };

  const deleteLesson = async (id: string) => {
    if (!confirm("Usunąć lekcję?")) return;
    await supabase.from("lessons").delete().eq("id", id);
    if (editingId === id) setEditingId(null);
    await fetchLessons();
    toast.success("Usunięto");
  };

  const moveLesson = async (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= lessons.length) return;
    const a = lessons[idx];
    const b = lessons[newIdx];
    await Promise.all([
      supabase.from("lessons").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("lessons").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    await fetchLessons();
  };

  const addBlock = (type: LessonBlock["type"]) => {
    const newBlock: LessonBlock = { type };
    if (type === "heading" || type === "text" || type === "callout") newBlock.content = "";
    if (type === "image") { newBlock.src = ""; newBlock.alt = ""; }
    if (type === "video") newBlock.youtubeId = "";
    if (type === "callout") newBlock.icon = "💡";
    if (type === "quiz") { newBlock.question = ""; newBlock.options = [{ text: "", correct: true }, { text: "" }]; newBlock.explanation = ""; }
    if (type === "advanced_quiz") { newBlock.advanced_question_type = "abcd"; newBlock.question = ""; newBlock.question_data = { options: [{ text: "", correct: true }, { text: "" }, { text: "" }, { text: "" }], explanation: "" }; }
    if (type === "timeline") { newBlock.events = [{ date: "", title: "", description: "" }]; }
    setEditBlocks([...editBlocks, newBlock]);
  };

  const updateBlock = (idx: number, updates: Partial<LessonBlock>) => {
    setEditBlocks(editBlocks.map((b, i) => i === idx ? { ...b, ...updates } : b));
  };

  const removeBlock = (idx: number) => setEditBlocks(editBlocks.filter((_, i) => i !== idx));

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= editBlocks.length) return;
    const arr = [...editBlocks];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setEditBlocks(arr);
  };

  // If editing, show editor
  if (editingId) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setEditingId(null)} className="text-sm text-muted-foreground hover:text-primary font-body">
            ← Wróć do listy
          </button>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-body">
              <input type="checkbox" checked={editPublished} onChange={e => setEditPublished(e.target.checked)} className="rounded" />
              Opublikowana
            </label>
            <label className="flex items-center gap-2 text-sm font-body">
              <input type="checkbox" checked={editRequiresAuth} onChange={e => setEditRequiresAuth(e.target.checked)} className="rounded" />
              Wymaga konta
            </label>
            <button onClick={saveLesson} disabled={saving} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-body font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
              <Save size={14} /> {saving ? "Zapisuję..." : "Zapisz"}
            </button>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Tytuł lekcji" className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground font-display text-lg font-bold focus:outline-none focus:ring-2 focus:ring-ring" />
          <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Opis lekcji" rows={2} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          
          {/* E-test editor */}
          <AdminETestEditor
            lessonId={editingId}
            lessonTitle={editTitle}
            epochId={epochId}
            testQuizId={editTestQuizId}
            onTestQuizIdChange={setEditTestQuizId}
          />
        </div>

        {/* Blocks */}
        <div className="space-y-3 mb-6">
          {editBlocks.map((block, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GripVertical size={14} className="text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">{BLOCK_TYPES.find(b => b.type === block.type)?.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveBlock(idx, -1)} className="p-1 text-muted-foreground hover:text-foreground"><ChevronUp size={14} /></button>
                  <button onClick={() => moveBlock(idx, 1)} className="p-1 text-muted-foreground hover:text-foreground"><ChevronDown size={14} /></button>
                  <button onClick={() => removeBlock(idx)} className="p-1 text-destructive hover:text-destructive/80"><Trash2 size={14} /></button>
                </div>
              </div>
              <BlockEditor block={block} onChange={(updates) => updateBlock(idx, updates)} />
            </div>
          ))}
        </div>

        {/* Add block buttons */}
        <div className="flex flex-wrap gap-2">
          {BLOCK_TYPES.map(bt => {
            const Icon = bt.icon;
            return (
              <button key={bt.type} onClick={() => addBlock(bt.type)} className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-border text-sm font-body text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                <Icon size={14} /> {bt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Lesson list
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold text-foreground">Lekcje — {epochName}</h2>
        <button onClick={createNew} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-body font-medium hover:bg-primary/90 flex items-center gap-2">
          <Plus size={14} /> Nowa lekcja
        </button>
      </div>
      {lessons.length === 0 ? (
        <p className="text-muted-foreground font-body text-sm py-8 text-center">Brak lekcji. Kliknij "Nowa lekcja" aby dodać pierwszą.</p>
      ) : (
        <div className="space-y-2">
          {lessons.map((lesson, idx) => (
            <div key={lesson.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:shadow-[var(--shadow-card)] transition-shadow">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveLesson(idx, -1)} disabled={idx === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp size={14} /></button>
                  <button onClick={() => moveLesson(idx, 1)} disabled={idx === lessons.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown size={14} /></button>
                </div>
                <div className="cursor-pointer flex-1" onClick={() => startEdit(lesson)}>
                  <h3 className="font-display font-semibold text-foreground">{lesson.title}</h3>
                  <p className="text-sm text-muted-foreground font-body">{lesson.description || "Brak opisu"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-body ${lesson.published ? "bg-green-500/10 text-green-600" : "bg-secondary text-muted-foreground"}`}>
                      {lesson.published ? "Opublikowana" : "Szkic"}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => deleteLesson(lesson.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BlockEditor({ block, onChange }: { block: LessonBlock; onChange: (u: Partial<LessonBlock>) => void }) {
  if (block.type === "heading" || block.type === "text") {
    return block.type === "heading" ? (
      <input value={block.content || ""} onChange={e => onChange({ content: e.target.value })} placeholder="Treść nagłówka" className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-display font-bold focus:outline-none focus:ring-2 focus:ring-ring" />
    ) : (
      <textarea value={block.content || ""} onChange={e => onChange({ content: e.target.value })} placeholder="Treść tekstu (obsługuje **pogrubienie** i *kursywę*)" rows={4} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring resize-y" />
    );
  }

  if (block.type === "image") {
    return (
      <div className="space-y-2">
        <input value={block.src || ""} onChange={e => onChange({ src: e.target.value })} placeholder="URL obrazu" className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
        <input value={block.alt || ""} onChange={e => onChange({ alt: e.target.value })} placeholder="Opis alt" className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
        <input value={block.caption || ""} onChange={e => onChange({ caption: e.target.value })} placeholder="Podpis (opcjonalnie)" className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
        {block.src && <img src={block.src} alt={block.alt} className="max-h-40 rounded-md object-cover" />}
      </div>
    );
  }

  if (block.type === "video") {
    return (
      <div className="space-y-2">
        <input value={block.youtubeId || ""} onChange={e => onChange({ youtubeId: e.target.value })} placeholder="YouTube ID (np. dQw4w9WgXcQ)" className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
        <input value={block.caption || ""} onChange={e => onChange({ caption: e.target.value })} placeholder="Podpis (opcjonalnie)" className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
        {block.youtubeId && <img src={`https://img.youtube.com/vi/${block.youtubeId}/hqdefault.jpg`} alt="Miniatura" className="max-h-32 rounded-md" />}
      </div>
    );
  }

  if (block.type === "callout") {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <input value={block.icon || ""} onChange={e => onChange({ icon: e.target.value })} placeholder="Emoji" className="w-16 h-9 px-3 rounded-md border border-input bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring" />
          <input value={block.content || ""} onChange={e => onChange({ content: e.target.value })} placeholder="Treść wskazówki" className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
    );
  }

  if (block.type === "quiz") {
    const options = block.options || [];
    return (
      <div className="space-y-3">
        <input value={block.question || ""} onChange={e => onChange({ question: e.target.value })} placeholder="Pytanie" className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-body font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name={`quiz-block-correct`} checked={!!opt.correct} onChange={() => {
                const newOpts = options.map((o, j) => ({ ...o, correct: j === i ? true : undefined }));
                onChange({ options: newOpts });
              }} className="accent-primary" />
              <input value={opt.text} onChange={e => {
                const newOpts = [...options];
                newOpts[i] = { ...newOpts[i], text: e.target.value };
                onChange({ options: newOpts });
              }} placeholder={`Odpowiedź ${i + 1}`} className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
              {options.length > 2 && (
                <button onClick={() => onChange({ options: options.filter((_, j) => j !== i) })} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <button onClick={() => onChange({ options: [...options, { text: "" }] })} className="text-xs text-primary hover:underline font-body">+ Dodaj odpowiedź</button>
          )}
        </div>
        <textarea value={block.explanation || ""} onChange={e => onChange({ explanation: e.target.value })} placeholder="Wyjaśnienie poprawnej odpowiedzi" rows={2} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
      </div>
    );
  }

  if (block.type === "advanced_quiz") {
    return <AdvancedQuizBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "timeline") {
    const events = block.events || [];
    return (
      <div className="space-y-3">
        {events.map((ev, i) => (
          <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-background p-3">
            <div className="flex-1 space-y-2">
              <input value={ev.date} onChange={e => { const evs = [...events]; evs[i] = { ...evs[i], date: e.target.value }; onChange({ events: evs }); }} placeholder="Data (np. 1543)" className="w-full h-8 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={ev.title} onChange={e => { const evs = [...events]; evs[i] = { ...evs[i], title: e.target.value }; onChange({ events: evs }); }} placeholder="Tytuł wydarzenia" className="w-full h-8 px-3 rounded-md border border-input bg-background text-sm font-body font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={ev.description || ""} onChange={e => { const evs = [...events]; evs[i] = { ...evs[i], description: e.target.value }; onChange({ events: evs }); }} placeholder="Opis (opcjonalnie)" className="w-full h-8 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            {events.length > 1 && <button onClick={() => onChange({ events: events.filter((_, j) => j !== i) })} className="p-1 text-muted-foreground hover:text-destructive mt-1"><Trash2 size={12} /></button>}
          </div>
        ))}
        <button onClick={() => onChange({ events: [...events, { date: "", title: "", description: "" }] })} className="text-xs text-primary hover:underline font-body">+ Dodaj wydarzenie</button>
      </div>
    );
  }

  return null;
}

function AdvancedQuizBlockEditor({ block, onChange }: { block: LessonBlock; onChange: (u: Partial<LessonBlock>) => void }) {
  const qType = block.advanced_question_type || "abcd";
  const data = block.question_data || {};

  const setType = (type: AdvancedQuestionType) => {
    let defaultData: Record<string, any> = {};
    if (type === "abcd") defaultData = { options: [{ text: "", correct: true }, { text: "" }, { text: "" }, { text: "" }], explanation: "" };
    if (type === "fill_blank") defaultData = { text_with_gaps: "Tekst z [___] lukami", answers: [""] };
    if (type === "matching") defaultData = { pairs: [{ left: "", right: "" }] };
    if (type === "table_gap") defaultData = { headers: ["Kolumna 1", "Kolumna 2"], rows: [["", ""]] };
    if (type === "ordering") defaultData = { items: ["Element 1", "Element 2", "Element 3"] };
    onChange({ advanced_question_type: type, question_data: defaultData });
  };

  const updateData = (d: Record<string, any>) => onChange({ question_data: d });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <label className="text-xs text-muted-foreground font-body">Typ:</label>
        <select value={qType} onChange={e => setType(e.target.value as AdvancedQuestionType)} className="h-8 px-2 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring">
          {(Object.keys(ADVANCED_QUESTION_LABELS) as AdvancedQuestionType[]).map(t => (
            <option key={t} value={t}>{ADVANCED_QUESTION_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <input value={block.question || ""} onChange={e => onChange({ question: e.target.value })} placeholder="Treść pytania" className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-body font-medium focus:outline-none focus:ring-2 focus:ring-ring" />

      {qType === "abcd" && <AbcdInlineEditor data={data} onChange={updateData} />}
      {qType === "fill_blank" && <FillBlankInlineEditor data={data} onChange={updateData} />}
      {qType === "matching" && <MatchingInlineEditor data={data} onChange={updateData} />}
      {qType === "table_gap" && <TableGapInlineEditor data={data} onChange={updateData} />}
      {qType === "ordering" && <OrderingInlineEditor data={data} onChange={updateData} />}
    </div>
  );
}

function AbcdInlineEditor({ data, onChange }: { data: Record<string, any>; onChange: (d: Record<string, any>) => void }) {
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

function FillBlankInlineEditor({ data, onChange }: { data: Record<string, any>; onChange: (d: Record<string, any>) => void }) {
  const answers = (data.answers || [""]) as string[];
  return (
    <div className="space-y-3">
      <textarea value={data.text_with_gaps || ""} onChange={e => onChange({ ...data, text_with_gaps: e.target.value })} placeholder="Tekst z [___] lukami" rows={3} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
      <label className="text-xs text-muted-foreground font-body block">Poprawne odpowiedzi:</label>
      {answers.map((ans, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
          <input value={ans} onChange={e => { const a = [...answers]; a[i] = e.target.value; onChange({ ...data, answers: a }); }} className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
          {answers.length > 1 && <button onClick={() => onChange({ ...data, answers: answers.filter((_, j) => j !== i) })} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>}
        </div>
      ))}
      <button onClick={() => onChange({ ...data, answers: [...answers, ""] })} className="text-xs text-primary hover:underline font-body">+ Dodaj lukę</button>
    </div>
  );
}

function MatchingInlineEditor({ data, onChange }: { data: Record<string, any>; onChange: (d: Record<string, any>) => void }) {
  const pairs = (data.pairs || []) as { left: string; right: string }[];
  return (
    <div className="space-y-2">
      {pairs.map((pair, i) => (
        <div key={i} className="flex items-center gap-2">
          <input value={pair.left} onChange={e => { const p = [...pairs]; p[i] = { ...p[i], left: e.target.value }; onChange({ ...data, pairs: p }); }} placeholder="Lewa" className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
          <span className="text-muted-foreground">↔</span>
          <input value={pair.right} onChange={e => { const p = [...pairs]; p[i] = { ...p[i], right: e.target.value }; onChange({ ...data, pairs: p }); }} placeholder="Prawa" className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
          {pairs.length > 1 && <button onClick={() => onChange({ ...data, pairs: pairs.filter((_, j) => j !== i) })} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>}
        </div>
      ))}
      <button onClick={() => onChange({ ...data, pairs: [...pairs, { left: "", right: "" }] })} className="text-xs text-primary hover:underline font-body">+ Dodaj parę</button>
    </div>
  );
}

function TableGapInlineEditor({ data, onChange }: { data: Record<string, any>; onChange: (d: Record<string, any>) => void }) {
  const headers = (data.headers || ["", ""]) as string[];
  const rows = (data.rows || [["", ""]]) as string[][];
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {headers.map((h, i) => (
          <input key={i} value={h} onChange={e => { const hs = [...headers]; hs[i] = e.target.value; onChange({ ...data, headers: hs }); }} placeholder={`Kolumna ${i + 1}`} className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
        ))}
        {headers.length < 5 && <button onClick={() => onChange({ ...data, headers: [...headers, ""], rows: rows.map(r => [...r, ""]) })} className="text-xs text-primary hover:underline font-body whitespace-nowrap">+ Kolumna</button>}
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

function OrderingInlineEditor({ data, onChange }: { data: Record<string, any>; onChange: (d: Record<string, any>) => void }) {
  const items = (data.items || []) as string[];
  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground font-body block">Elementy w poprawnej kolejności:</label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
          <input value={item} onChange={e => { const a = [...items]; a[i] = e.target.value; onChange({ ...data, items: a }); }} className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
          {items.length > 2 && <button onClick={() => onChange({ ...data, items: items.filter((_, j) => j !== i) })} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>}
        </div>
      ))}
      {items.length < 10 && <button onClick={() => onChange({ ...data, items: [...items, ""] })} className="text-xs text-primary hover:underline font-body">+ Element</button>}
    </div>
  );
}
