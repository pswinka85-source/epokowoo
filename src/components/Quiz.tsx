import { useState } from "react";
import type { QuizQuestion } from "@/data/quizzes";
import { CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";

interface QuizProps {
  questions: QuizQuestion[];
  epochName: string;
}

const Quiz = ({ questions, epochName }: QuizProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = questions[currentIndex];

  const handleSelect = (optionIndex: number) => {
    if (showResult) return;
    setSelectedOption(optionIndex);
    setShowResult(true);
    if (optionIndex === current.correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      setFinished(true);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowResult(false);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <div className="mb-4">
          <Trophy size={48} className="mx-auto text-gold" />
        </div>
        <h3 className="font-display text-2xl font-bold text-foreground mb-2">
          Quiz ukończony!
        </h3>
        <p className="text-lg text-muted-foreground font-body mb-1">
          {epochName}
        </p>
        <p className="text-3xl font-display font-bold text-primary mb-2">
          {score}/{questions.length}
        </p>
        <p className="text-muted-foreground font-body mb-6">
          {percentage >= 80
            ? "Świetny wynik! 🎉"
            : percentage >= 50
            ? "Nieźle, ale warto powtórzyć! 📖"
            : "Wróć do materiałów i spróbuj ponownie 💪"}
        </p>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-body font-medium hover:opacity-90 transition-opacity"
        >
          <RotateCcw size={16} />
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground font-body">
          Pytanie {currentIndex + 1} z {questions.length}
        </span>
        <span className="text-sm font-medium text-primary font-body">
          Wynik: {score}/{currentIndex + (showResult ? 1 : 0)}
        </span>
      </div>
      <div className="w-full h-1.5 bg-secondary rounded-full mb-6">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + (showResult ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <h3 className="font-display text-lg font-semibold text-foreground mb-5">
        {current.question}
      </h3>

      {/* Options */}
      <div className="grid gap-3 mb-5">
        {current.options.map((option, i) => {
          let optionClass =
            "w-full text-left px-4 py-3 rounded-lg border font-body text-sm transition-all ";
          if (!showResult) {
            optionClass +=
              "border-border bg-background hover:border-primary hover:bg-primary/5 cursor-pointer text-foreground";
          } else if (i === current.correctIndex) {
            optionClass +=
              "border-green-500 bg-green-500/10 text-green-700";
          } else if (i === selectedOption && i !== current.correctIndex) {
            optionClass +=
              "border-red-400 bg-red-400/10 text-red-600";
          } else {
            optionClass += "border-border bg-background text-muted-foreground opacity-60";
          }
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className={optionClass}
              disabled={showResult}
            >
              <span className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{option}</span>
                {showResult && i === current.correctIndex && (
                  <CheckCircle2 size={18} className="ml-auto flex-shrink-0" />
                )}
                {showResult && i === selectedOption && i !== current.correctIndex && (
                  <XCircle size={18} className="ml-auto flex-shrink-0" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {showResult && (
        <div className="rounded-lg bg-secondary/60 border border-border p-4 mb-5">
          <p className="text-sm text-foreground font-body leading-relaxed">
            <strong>Wyjaśnienie:</strong> {current.explanation}
          </p>
        </div>
      )}

      {/* Next button */}
      {showResult && (
        <button
          onClick={handleNext}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-body font-medium hover:opacity-90 transition-opacity"
        >
          {currentIndex < questions.length - 1 ? "Następne pytanie →" : "Zobacz wynik"}
        </button>
      )}
    </div>
  );
};

export default Quiz;
