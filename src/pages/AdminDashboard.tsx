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
import logo from "@/assets/logo.png";

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
      {/* Floating nav bar matching site header */}
      <div className="sticky top-0 z-50 px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-full bg-card shadow-sm px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Epokowo" className="h-7" />
            </Link>
            <div className="flex items-center gap-1.5 text-sm font-body">
              <Link
                to="/"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <ArrowLeft size={14} />
                Strona główna
              </Link>
              <div className="px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-xs">
                Admin
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Title section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground">
          Panel zarządzania ⚙️
        </h1>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Section tabs - pill-style nav */}
        <div className="py-4 mb-2">
          <div className="rounded-2xl bg-card shadow-[var(--shadow-card)] border border-border/60 p-1.5">
            <div className="flex gap-1 overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSection(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <Icon size={15} /> {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Epoch selector - compact inline */}
        {showEpochSelector && (
          <div className="mb-6 flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground font-body">Epoka:</span>
            <div className="relative">
              <select
                value={selectedEpoch}
                onChange={(e) => setSelectedEpoch(e.target.value)}
                className="appearance-none h-9 pl-3 pr-8 rounded-full border border-input bg-card text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
              >
                {epochs.map(ep => (
                  <option key={ep.id} value={ep.id}>{ep.icon} {ep.name}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        )}

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
