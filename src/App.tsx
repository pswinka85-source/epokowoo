import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ScrollToTop from "./components/ScrollToTop";
import { Footer } from "./components/Footer"; // <-- dodany import stopki

// Komponent karty rozprawki
const EssayCard = () => {
  const location = useLocation();
  
  // Pokaż kartę rozprawki tylko na stronie nauka
  if (location.pathname !== "/epoki") return null;
  
  return (
    <div className="mx-8 mb-4">
      <div className="w-[300px]">
        <article className="relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl" role="img" aria-label="Rozprawka">
                📝
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground font-body px-2 py-0.5 rounded-full bg-secondary">
                EGZ
              </span>
            </div>

            <h3 className="font-display text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
              Rozprawka
            </h3>

            <p className="text-sm text-muted-foreground font-body leading-relaxed line-clamp-2 flex-1">
              Przygotuj się do egzaminu końcowego i zdaj rozprawkę na ocenę celującą.
            </p>

            <div className="flex items-center gap-2 mt-4 text-sm font-body font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Rozpocznij naukę
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

import Index from "./pages/Index";
import EpochDetail from "./pages/EpochDetail";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Contact from "./pages/Contact";
import Exams from "./pages/Exams";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col">
            <Header />
            <div className="flex flex-1">
              <div className="flex flex-col">
                <Sidebar />
                <EssayCard />
              </div>
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Auth />} />
                  <Route path="/epoki" element={<Index />} />
                  <Route path="/epoka/:id" element={<EpochDetail />} />
                  <Route path="/profil" element={<Profile />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/kontakt" element={<Contact />} />
                  <Route path="/egzaminy" element={<Exams />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
            <Footer />
          </div>

        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
