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
    <aside className="hidden md:flex w-[280px] shrink-0 flex-col bg-foreground text-primary-foreground min-h-0 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />
      <div className="absolute bottom-40 -left-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-12 w-36 h-36 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10 px-7 pt-8 pb-2">
        <Link to="/epoki" className="block">
          <img src={logo} alt="Epokowo" className="h-7 brightness-0 invert opacity-80 hover:opacity-100 transition-opacity" />
        </Link>
      </div>

      {/* User profile */}
      <div className="relative z-10 px-7 py-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/20 backdrop-blur flex items-center justify-center overflow-hidden text-base font-bold shrink-0 ring-2 ring-primary/30">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary-foreground/90">{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm font-bold truncate text-primary-foreground/90">
              {displayName}
            </p>
            <p className="text-[11px] text-primary-foreground/40 truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-7 h-px bg-primary-foreground/10" />

      {/* Navigation */}
      <nav className="relative z-10 flex-1 px-4 py-4 overflow-y-auto">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/30 px-3 mb-3">
          Menu
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                to={item.path}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive(item.path)
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/5"
                }`}
              >
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 transition-all duration-200 ${
                    isActive(item.path)
                      ? "bg-primary-foreground/15"
                      : "bg-primary-foreground/5 group-hover:bg-primary-foreground/10"
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

      {/* Bottom section - visually connecting to footer */}
      <div className="relative z-10 mt-auto">
        <div className="mx-7 h-px bg-primary-foreground/10" />
        <div className="px-7 py-5">
          <p className="text-[11px] text-primary-foreground/30 leading-relaxed">
            © {new Date().getFullYear()} Epokowo
          </p>
          <p className="text-[10px] text-primary-foreground/20 mt-0.5">
            Wszystkie prawa zastrzeżone.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
