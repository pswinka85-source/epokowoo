import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

const Sidebar = () => {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const unreadCount = useUnreadMessages();

  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Użytkownik";

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
    <div className="mx-8 mb-4">
      <div className="pt-12 md:pt-20">
        <div className="w-[300px] bg-card p-6 flex flex-col rounded-3xl mx-auto shadow-sm">
          {/* Greeting header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden text-lg font-bold text-muted-foreground shrink-0">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <h2 className="font-display text-xl font-extrabold text-foreground">
              Cześć, {displayName}!
            </h2>
          </div>

          <div className="border-b border-border mb-4" />

          {/* Navigation */}
          <nav>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-4 px-3 py-3 rounded-2xl text-base font-bold transition-all duration-200 ${
                      isActive(item.path)
                        ? "bg-primary/15 text-primary"
                        : "bg-secondary/50 text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span className="w-11 h-11 rounded-full bg-card flex items-center justify-center text-xl shrink-0 shadow-sm">
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.name}</span>
                    {"badge" in item && (item as any).badge > 0 && (
                      <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
                        {(item as any).badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
