import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import logo from "@/assets/logo.png";

const Sidebar = () => {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const unreadCount = useUnreadMessages();

  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Użytkownik";

  const navItems = [
    { name: "Nauka", icon: "💡", path: "/epoki" },
    { name: "Skrzynka odbiorcza", icon: "📬", path: "/kontakt", badge: unreadCount },
    { name: "Egzaminy", icon: "⏰", path: "/egzaminy" },
    { name: "Testy & Quizy", icon: "✏️", path: "/testy" },
    { name: "Ustawienia", icon: "⚙️", path: "/profil" },
    ...(isAdmin ? [{ name: "Panel admina", icon: "🛡️", path: "/admin" }] : []),
  ];

  if (location.pathname === "/") return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="hidden md:flex w-[280px] shrink-0 py-6 pl-6">
      <div className="w-full flex flex-col bg-card rounded-3xl shadow-[var(--shadow-elevated)] border border-border/50 overflow-hidden animate-slide-in-sidebar">
        {/* Logo */}
        <div className="px-7 pt-7 pb-1">
          <Link to="/epoki" className="block">
            <img src={logo} alt="Epokowo" className="h-7 opacity-80 hover:opacity-100 transition-opacity duration-300" />
          </Link>
        </div>

        {/* User profile */}
        <div className="px-7 py-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden text-base font-bold shrink-0 ring-2 ring-primary/20 transition-all duration-300 hover:ring-primary/40 hover:scale-105">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary">{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold truncate text-foreground">
                {displayName}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-7 h-px bg-border" />

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 px-3 mb-3">
            Menu
          </p>
          <ul className="space-y-1">
            {navItems.map((item, index) => (
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
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 transition-all duration-300 ${
                      isActive(item.path)
                        ? "bg-primary-foreground/15"
                        : "bg-secondary group-hover:bg-primary/10"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1 truncate">{item.name}</span>
                  {"badge" in item && (item as any).badge > 0 && (
                    <span className="w-5 h-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {(item as any).badge}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="mt-auto">
          <div className="mx-7 h-px bg-border" />
          <div className="px-7 py-4">
            <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
              © {new Date().getFullYear()} Epokowo
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
