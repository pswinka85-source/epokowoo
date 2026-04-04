import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { supabase } from "@/integrations/supabase/client";
import { Lightbulb, Inbox, Clock, PenLine, Settings, ShieldCheck } from "lucide-react";
import UpcomingExamsWidget from "./UpcomingExamsWidget";

const Sidebar = () => {
  const location = useLocation();
  const { isAdmin, user } = useAuth();
  const unreadCount = useUnreadMessages();

  const navItems = [
    { name: "Nauka", icon: Lightbulb, path: "/epoki" },
    { name: "Skrzynka odbiorcza", icon: Inbox, path: "/kontakt", badge: unreadCount },
    { name: "Egzaminy", icon: Clock, path: "/egzaminy" },
    { name: "Testy & Quizy", icon: PenLine, path: "/testy" },
    { name: "Ustawienia", icon: Settings, path: "/profil" },
    ...(isAdmin ? [{ name: "Panel admina", icon: ShieldCheck, path: "/admin" }] : []),
  ];

  if (location.pathname === "/") return null;

  const isActive = (path: string) => location.pathname === path;
  const isNaukaPage = location.pathname === "/epoki" || location.pathname.startsWith("/epoka/");
  const isHorizontal = !isNaukaPage;

  if (isHorizontal) {
    return (
      <div className="hidden md:block px-4 sm:px-6 pt-3 pb-1">
        <div className="bg-card rounded-2xl shadow-[var(--shadow-card)] border border-border/50 px-2 py-1.5 animate-slide-in-sidebar">
          <nav>
            <ul className="flex items-center gap-1">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <li key={item.name} className="animate-fade-in-item" style={{ animationDelay: `${index * 40}ms` }}>
                    <Link
                      to={item.path}
                      className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                        isActive(item.path)
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon size={16} strokeWidth={2} />
                      <span>{item.name}</span>
                      {"badge" in item && (item as any).badge > 0 && (
                        <span className="w-5 h-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                          {(item as any).badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    );
  }

  return (
    <aside className="hidden md:flex flex-col w-[300px] shrink-0 px-6 pt-6 pb-6 self-start sticky top-0">
      <div className="w-full flex flex-col bg-card rounded-3xl shadow-[var(--shadow-elevated)] border border-border/50 overflow-hidden animate-slide-in-sidebar">
        {/* Title */}
        <div className="px-6 pt-6 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/60">
            Kokpit
          </p>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-3">
          <ul className="space-y-1">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.name}
                  className="animate-fade-in-item"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Link
                    to={item.path}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      isActive(item.path)
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary hover:scale-[1.01]"
                    }`}
                  >
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isActive(item.path)
                          ? "bg-primary-foreground/15"
                          : "bg-secondary group-hover:bg-primary/10"
                      }`}
                    >
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <span className="flex-1 truncate">{item.name}</span>
                    {"badge" in item && (item as any).badge > 0 && (
                      <span className="w-5 h-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                        {(item as any).badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom */}
        <div className="px-6 pb-5 pt-2">
          <div className="h-px bg-border mb-3" />
          <p className="text-[11px] text-muted-foreground/40">
            © {new Date().getFullYear()} Epokowo
          </p>
        </div>
      </div>

      {/* Upcoming Exams Widget — only on home page */}
      <UpcomingExamsWidget />
    </aside>
  );
};

export default Sidebar;
