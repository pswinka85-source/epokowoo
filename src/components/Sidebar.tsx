import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Mail, Clock, PenLine, Settings, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

const navItems = [
  { name: "Nauka", icon: BookOpen, path: "/epoki" },
  { name: "Skrzynka", icon: Mail, path: "/kontakt" },
  { name: "Egzaminy", icon: Clock, path: "/egzaminy" },
  { name: "Testy", icon: PenLine, path: "/testy" },
  { name: "Ustawienia", icon: Settings, path: "/profil" },
];

const Sidebar = () => {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const unreadCount = useUnreadMessages();

  if (location.pathname === "/") return null;

  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Użytkownik";
  const firstName = displayName.split(" ")[0];

  const allItems = [
    ...navItems,
    ...(isAdmin ? [{ name: "Admin", icon: ShieldCheck, path: "/admin" }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="mx-6 mb-4">
      <div className="pt-10 md:pt-16">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-[280px] rounded-[28px] overflow-hidden"
          style={{
            background: "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--card) / .85) 100%)",
            boxShadow: "0 8px 32px -8px hsl(var(--foreground) / .08), 0 1px 2px hsl(var(--foreground) / .04)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Profile header */}
          <div className="p-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-base font-bold shadow-lg shadow-primary/20 overflow-hidden shrink-0">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  firstName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="font-display text-[15px] font-bold text-foreground truncate">
                  {firstName}
                </p>
                <p className="text-[11px] text-muted-foreground font-body truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-border/60" />

          {/* Navigation */}
          <nav className="p-3">
            <ul className="space-y-0.5">
              {allItems.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                const hasBadge = item.path === "/kontakt" && unreadCount > 0;

                return (
                  <li key={item.name}>
                    <Link
                      to={item.path}
                      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[14px] font-semibold transition-all duration-200 group ${
                        active
                          ? "bg-primary/12 text-primary"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      }`}
                    >
                      {active && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute inset-0 rounded-2xl bg-primary/10"
                          transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-3 w-full">
                        <span
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                            active
                              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                              : "bg-muted/80 text-muted-foreground group-hover:bg-muted"
                          }`}
                        >
                          <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.5 : 2} />
                        </span>
                        <span className="flex-1">{item.name}</span>
                        {hasBadge && (
                          <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                            {unreadCount}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom subtle branding */}
          <div className="px-5 pb-4 pt-2">
            <div className="h-px bg-border/40 mb-3" />
            <p className="text-[10px] text-muted-foreground/50 font-body text-center tracking-wide">
              EPOKOWO · v2.0
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Sidebar;
