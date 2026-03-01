import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { epochs } from "@/data/epochs";
import AdminLessonEditor from "@/components/admin/AdminLessonEditor";
import AdminQuizEditor from "@/components/admin/AdminQuizEditor";
import AdminEpochEditor from "@/components/admin/AdminEpochEditor";
import AdminWorksheetManager from "@/components/admin/AdminWorksheetManager";
import AdminExamManager from "@/components/admin/AdminExamManager";
import AdminExaminerManager from "@/components/admin/AdminExaminerManager";
import { BookOpen, Brain, ArrowLeft, ChevronDown, Settings, FileText, Calendar, Users } from "lucide-react";

const AdminDashboard = () => {
  const { isAdmin, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const epochParam = searchParams.get("epoch");
  const editLessonParam = searchParams.get("editLesson");
  const [selectedEpoch, setSelectedEpoch] = useState(epochParam && epochs.find(e => e.id === epochParam) ? epochParam : epochs[0].id);
  const [activeSection, setActiveSection] = useState<"lessons" | "quizzes" | "epoch" | "worksheets" | "exams" | "examiners">("lessons");
  const [initialEditLessonId, setInitialEditLessonId] = useState<string | null>(editLessonParam);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
  if (!isAdmin) return <Navigate to="/" replace />;

  const epoch = epochs.find(e => e.id === selectedEpoch)!;
  const showEpochSelector = !["exams", "examiners"].includes(activeSection);

  const tabs = [
    { id: "lessons" as const, label: "Lekcje", icon: BookOpen },
    { id: "quizzes" as const, label: "Quizy", icon: Brain },
    { id: "epoch" as const, label: "Dane epoki", icon: Settings },
    { id: "worksheets" as const, label: "Karty pracy", icon: FileText },
    { id: "examiners" as const, label: "Egzaminatorzy", icon: Users },
    { id: "exams" as const, label: "Egzaminy", icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-body text-sm mb-4"
          >
            <ArrowLeft size={16} /> Strona główna
          </Link>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground leading-[1.1]">
            Panel admina ⚙️
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Epoch selector */}
        {showEpochSelector && (
          <div className="mb-6">
            <label className="text-sm font-medium text-muted-foreground font-body block mb-2">Wybierz epokę</label>
            <div className="relative inline-block">
              <select
                value={selectedEpoch}
                onChange={(e) => setSelectedEpoch(e.target.value)}
                className="appearance-none h-10 pl-4 pr-10 rounded-xl border border-input bg-card text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring shadow-[var(--shadow-card)]"
              >
                {epochs.map(ep => (
                  <option key={ep.id} value={ep.id}>{ep.icon} {ep.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        )}

        {/* Section tabs */}
        <div className="mb-6">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Icon size={15} /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeSection === "lessons" && (
          <AdminLessonEditor epochId={selectedEpoch} epochName={epoch.name} initialEditId={initialEditLessonId} onEditStarted={() => setInitialEditLessonId(null)} />
        )}
        {activeSection === "quizzes" && (
          <AdminQuizEditor epochId={selectedEpoch} epochName={epoch.name} />
        )}
        {activeSection === "epoch" && (
          <AdminEpochEditor epochId={selectedEpoch} epochName={epoch.name} />
        )}
        {activeSection === "worksheets" && (
          <AdminWorksheetManager epochId={selectedEpoch} epochName={epoch.name} />
        )}
        {activeSection === "examiners" && (
          <AdminExaminerManager />
        )}
        {activeSection === "exams" && (
          <AdminExamManager />
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
