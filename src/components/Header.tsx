import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import logo from "@/assets/logo.png";

const Header = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const unreadCount = useUnreadMessages();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Hide header on auth page
  if (location.pathname === "/") return null;

  return (
    <header className="sticky top-0 z-50 px-6 pt-3 pb-2">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-full bg-card shadow-sm px-6 h-14 flex items-center justify-between">
          <Link to="/epoki" className="flex items-center gap-3">
            <img src={logo} alt="Epokowo" className="h-7" />
          </Link>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button
              className="relative w-10 h-10 rounded-xl flex items-center justify-center text-foreground hover:bg-secondary transition-all duration-200"
              aria-label="Powiadomienia"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
              )}
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-foreground hover:bg-secondary transition-all duration-200"
                aria-label="Menu użytkownika"
              >
                <User size={20} />
              </button>

              {/* User dropdown */}
              <div
                className={`absolute right-0 top-full mt-2 w-48 rounded-2xl bg-card shadow-[var(--shadow-elevated)] py-2 z-50 transition-all duration-300 origin-top-right ${
                  userMenuOpen
                    ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                }`}
              >
                <div className="px-4 py-2 border-b border-border">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "Użytkownik"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>

                <div className="py-1">
                  <Link
                    to="/profil"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                  >
                    <User size={16} />
                    Profil
                  </Link>
                </div>

                <div className="h-px bg-border mx-2 my-1" />

                <button
                  onClick={() => { signOut(); setUserMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  Wyloguj się
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
export default Header;
