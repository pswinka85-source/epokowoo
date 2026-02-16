import { useState, useMemo, useCallback } from "react";
import { CheckCircle2, XCircle, RotateCcw, Trophy, ArrowRight, GripVertical } from "lucide-react";

type QuestionType = "abcd" | "fill_blank" | "matching" | "table_gap" | "ordering";

interface QuestionData {
  id: string;
  question_type: QuestionType;
  question_text: string;
  question_data: Record<string, any>;
}

interface QuizPlayerProps {
  title: string;
  questions: QuestionData[];
}

const QuizPlayer = ({ title, questions }: QuizPlayerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [finished, setFinished] = useState(false);

  const current = questions[currentIndex];

  const handleAnswer = (isCorrect: boolean) => {
    if (answered) return;
    setAnswered(true);
    setCorrect(isCorrect);
    if (isCorrect) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setAnswered(false);
      setCorrect(false);
    } else {
      setFinished(true);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setScore(0);
    setAnswered(false);
    setCorrect(false);
    setFinished(false);
  };

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <Trophy size={48} className="mx-auto text-primary mb-4" />
        <h3 className="font-display text-2xl font-bold text-foreground mb-2">Quiz ukończony!</h3>
        <p className="text-muted-foreground font-body mb-1">{title}</p>
        <p className="text-3xl font-display font-bold text-primary mb-2">{score}/{questions.length}</p>
        <p className="text-muted-foreground font-body mb-6">
          {pct >= 80 ? "Świetny wynik! 🎉" : pct >= 50 ? "Nieźle, ale warto powtórzyć! 📖" : "Wróć do materiałów i spróbuj ponownie 💪"}
        </p>
        <button onClick={handleReset} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-body font-medium hover:opacity-90 transition-opacity">
          <RotateCcw size={16} /> Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      {/* Progress */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-body">Pytanie {currentIndex + 1} z {questions.length}</span>
        <span className="text-sm font-medium text-primary font-body">Wynik: {score}/{currentIndex + (answered ? 1 : 0)}</span>
      </div>
      <div className="w-full h-1.5 bg-secondary rounded-full mb-6">
        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${((currentIndex + (answered ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>

      <h3 className="font-display text-lg font-semibold text-foreground mb-5">{current.question_text}</h3>

      {current.question_type === "abcd" && <AbcdQuestion data={current.question_data} answered={answered} onAnswer={handleAnswer} />}
      {current.question_type === "fill_blank" && <FillBlankQuestion data={current.question_data} answered={answered} onAnswer={handleAnswer} />}
      {current.question_type === "matching" && <MatchingQuestion data={current.question_data} answered={answered} onAnswer={handleAnswer} />}
      {current.question_type === "table_gap" && <TableGapQuestion data={current.question_data} answered={answered} onAnswer={handleAnswer} />}
      {current.question_type === "ordering" && <OrderingQuestion data={current.question_data} answered={answered} onAnswer={handleAnswer} />}

      {answered && (
        <button onClick={handleNext} className="w-full mt-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-body font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
          {currentIndex < questions.length - 1 ? <>Następne pytanie <ArrowRight size={16} /></> : "Zobacz wynik"}
        </button>
      )}
    </div>
  );
};

export default QuizPlayer;

/* ── ABCD ── */
function AbcdQuestion({ data, answered, onAnswer }: { data: Record<string, any>; answered: boolean; onAnswer: (c: boolean) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const options = (data.options || []) as { text: string; correct?: boolean }[];
  const correctIdx = options.findIndex((o) => o.correct);

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

/* ── Fill Blank ── */
function FillBlankQuestion({ data, answered, onAnswer }: { data: Record<string, any>; answered: boolean; onAnswer: (c: boolean) => void }) {
  const text = (data.text_with_gaps || "") as string;
  const correctAnswers = (data.answers || []) as string[];
  const parts = text.split("[___]");
  const [userAnswers, setUserAnswers] = useState<string[]>(correctAnswers.map(() => ""));

  const handleCheck = () => {
    const isCorrect = correctAnswers.every((a, i) => userAnswers[i]?.trim().toLowerCase() === a.trim().toLowerCase());
    onAnswer(isCorrect);
  };

  return (
    <div>
      <div className="font-body text-foreground leading-relaxed mb-4">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < correctAnswers.length && (
              answered ? (
                <span className={`inline-block px-2 py-0.5 mx-1 rounded font-medium ${userAnswers[i]?.trim().toLowerCase() === correctAnswers[i].trim().toLowerCase() ? "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500" : "bg-red-400/10 text-red-600 dark:text-red-400 border border-red-400"}`}>
                  {userAnswers[i] || "—"} {userAnswers[i]?.trim().toLowerCase() !== correctAnswers[i].trim().toLowerCase() && <span className="text-green-600 ml-1">({correctAnswers[i]})</span>}
                </span>
              ) : (
                <input
                  value={userAnswers[i]}
                  onChange={(e) => { const a = [...userAnswers]; a[i] = e.target.value; setUserAnswers(a); }}
                  className="inline-block w-32 h-8 px-2 mx-1 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="..."
                />
              )
            )}
          </span>
        ))}
      </div>
      {!answered && (
        <button onClick={handleCheck} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90">Sprawdź</button>
      )}
    </div>
  );
}

/* ── Matching ── */
function MatchingQuestion({ data, answered, onAnswer }: { data: Record<string, any>; answered: boolean; onAnswer: (c: boolean) => void }) {
  const pairs = (data.pairs || []) as { left: string; right: string }[];
  const leftItems = pairs.map((p) => p.left);
  const [shuffledRight] = useState(() => [...pairs.map((p) => p.right)].sort(() => Math.random() - 0.5));
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [activeLeft, setActiveLeft] = useState<number | null>(null);

  const handleLeftClick = (i: number) => {
    if (answered) return;
    setActiveLeft(i);
  };

  const handleRightClick = (ri: number) => {
    if (answered || activeLeft === null) return;
    setSelected((s) => ({ ...s, [activeLeft]: ri }));
    setActiveLeft(null);
  };

  const handleCheck = () => {
    const isCorrect = leftItems.every((_, i) => {
      const rightIdx = selected[i];
      if (rightIdx === undefined) return false;
      return shuffledRight[rightIdx] === pairs[i].right;
    });
    onAnswer(isCorrect);
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          {leftItems.map((item, i) => (
            <button
              key={i}
              onClick={() => handleLeftClick(i)}
              className={`w-full text-left px-4 py-3 rounded-lg border font-body text-sm transition-all ${activeLeft === i ? "border-primary bg-primary/10 text-primary" : selected[i] !== undefined ? "border-accent bg-accent/10" : "border-border"} ${answered && shuffledRight[selected[i]] === pairs[i].right ? "border-green-500 bg-green-500/10" : answered && selected[i] !== undefined ? "border-red-400 bg-red-400/10" : ""}`}
            >
              {item} {selected[i] !== undefined && <span className="text-xs text-muted-foreground ml-1">→ {shuffledRight[selected[i]]}</span>}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {shuffledRight.map((item, i) => {
            const isUsed = Object.values(selected).includes(i);
            return (
              <button
                key={i}
                onClick={() => handleRightClick(i)}
                className={`w-full text-left px-4 py-3 rounded-lg border font-body text-sm transition-all ${isUsed ? "border-accent/40 opacity-50" : "border-border hover:border-primary cursor-pointer"}`}
                disabled={answered || isUsed}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>
      {!answered && Object.keys(selected).length === leftItems.length && (
        <button onClick={handleCheck} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90">Sprawdź</button>
      )}
    </div>
  );
}

/* ── Table Gap ── */
function TableGapQuestion({ data, answered, onAnswer }: { data: Record<string, any>; answered: boolean; onAnswer: (c: boolean) => void }) {
  const headers = (data.headers || []) as string[];
  const rows = (data.rows || []) as string[][];
  const [userRows, setUserRows] = useState<string[][]>(rows.map((r) => r.map((c) => (c === "" ? "" : c))));

  const handleCheck = () => {
    const isCorrect = rows.every((row, ri) => row.every((cell, ci) => {
      if (cell === "") return true; // empty cells in data mean they were empty originally — but admin marks empty = gap
      return userRows[ri][ci].trim().toLowerCase() === cell.trim().toLowerCase();
    }));
    onAnswer(isCorrect);
  };

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border mb-4">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="bg-secondary">
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-2 text-left font-semibold text-foreground border-b border-border">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border last:border-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2">
                    {cell !== "" ? (
                      <span className="text-foreground">{cell}</span>
                    ) : answered ? (
                      <span className={`font-medium ${userRows[ri][ci].trim().toLowerCase() === rows[ri][ci].trim().toLowerCase() ? "text-green-600" : "text-red-500"}`}>
                        {userRows[ri][ci] || "—"}
                      </span>
                    ) : (
                      <input
                        value={userRows[ri][ci]}
                        onChange={(e) => {
                          const nr = userRows.map((r) => [...r]);
                          nr[ri][ci] = e.target.value;
                          setUserRows(nr);
                        }}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="..."
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!answered && (
        <button onClick={handleCheck} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90">Sprawdź</button>
      )}
    </div>
  );
}

/* ── Ordering ── */
function OrderingQuestion({ data, answered, onAnswer }: { data: Record<string, any>; answered: boolean; onAnswer: (c: boolean) => void }) {
  const correctOrder = (data.items || []) as string[];
  const [items, setItems] = useState(() => [...correctOrder].sort(() => Math.random() - 0.5));
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const moveItem = (from: number, to: number) => {
    const newItems = [...items];
    const [moved] = newItems.splice(from, 1);
    newItems.splice(to, 0, moved);
    setItems(newItems);
  };

  const handleCheck = () => {
    const isCorrect = items.every((item, i) => item === correctOrder[i]);
    onAnswer(isCorrect);
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground font-body mb-3">Ułóż elementy w poprawnej kolejności:</p>
      <div className="space-y-2 mb-4">
        {items.map((item, i) => (
          <div
            key={i}
            draggable={!answered}
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragIdx !== null && dragIdx !== i) moveItem(dragIdx, i); setDragIdx(null); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border font-body text-sm transition-all ${
              answered
                ? item === correctOrder[i]
                  ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                  : "border-red-400 bg-red-400/10 text-red-600 dark:text-red-400"
                : "border-border bg-background cursor-grab active:cursor-grabbing hover:border-primary/40"
            }`}
          >
            {!answered && <GripVertical size={16} className="text-muted-foreground flex-shrink-0" />}
            <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium flex-shrink-0">{i + 1}</span>
            <span>{item}</span>
            {answered && item === correctOrder[i] && <CheckCircle2 size={16} className="ml-auto text-green-500" />}
            {answered && item !== correctOrder[i] && <XCircle size={16} className="ml-auto text-red-500" />}
          </div>
        ))}
      </div>
      {!answered && (
        <button onClick={handleCheck} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90">Sprawdź kolejność</button>
      )}
      {answered && !items.every((item, i) => item === correctOrder[i]) && (
        <p className="text-sm text-muted-foreground font-body mt-2">Poprawna kolejność: {correctOrder.join(" → ")}</p>
      )}
    </div>
  );
}
