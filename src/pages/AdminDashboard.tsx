import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { epochs } from "@/data/epochs";
import AdminLessonEditor from "@/components/admin/AdminLessonEditor";
import AdminQuizEditor from "@/components/admin/AdminQuizEditor";
import AdminEpochEditor from "@/components/admin/AdminEpochEditor";
import AdminWorksheetManager from "@/components/admin/AdminWorksheetManager";
import AdminExamManager from "@/components/admin/AdminExamManager";
import { BookOpen, Brain, ArrowLeft, ChevronDown, Settings, FileText, Calendar } from "lucide-react";

const AdminDashboard = () => {
  const { isAdmin, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const epochParam = searchParams.get("epoch");
  const editLessonParam = searchParams.get("editLesson");
  const [selectedEpoch, setSelectedEpoch] = useState(epochParam && epochs.find(e => e.id === epochParam) ? epochParam : epochs[0].id);
  const [activeSection, setActiveSection] = useState<"lessons" | "quizzes" | "epoch" | "worksheets" | "exams">("lessons");
  const [initialEditLessonId, setInitialEditLessonId] = useState<string | null>(editLessonParam);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground font-body">Ładowanie...</p></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const epoch = epochs.find(e => e.id === selectedEpoch)!;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-body text-sm mb-6">
          <ArrowLeft size={16} /> Strona główna
        </Link>

        <h1 className="font-display text-3xl font-bold text-foreground mb-6">Panel admina</h1>

        {/* Epoch selector - ukryj gdy Egzaminy */}
        {activeSection !== "exams" && (
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground font-body block mb-2">Wybierz epokę</label>
          <div className="relative inline-block">
            <select
              value={selectedEpoch}
              onChange={(e) => setSelectedEpoch(e.target.value)}
              className="appearance-none h-10 pl-3 pr-10 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
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
        <div className="border-b border-border mb-6">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {([
              { id: "lessons" as const, label: "Lekcje", icon: BookOpen },
              { id: "quizzes" as const, label: "Quizy", icon: Brain },
              { id: "epoch" as const, label: "Dane epoki", icon: Settings },
              { id: "worksheets" as const, label: "Karty pracy", icon: FileText },
              { id: "exams" as const, label: "Egzaminy", icon: Calendar },
            ]).map(tab => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-body font-medium border-b-2 transition-colors whitespace-nowrap ${isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
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
        {activeSection === "exams" && (
          <AdminExamManager />
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
