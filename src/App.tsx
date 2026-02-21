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
              <Sidebar />
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
