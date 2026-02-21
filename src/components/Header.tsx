import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, Shield, LogIn, LogOut, User, Mail, Bell, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import logo from "@/assets/logo.png";

const menuItemClass =
  "flex items-center gap-3 px-4 py-2.5 text-sm font-body font-medium text-foreground rounded-xl mx-2 hover:bg-secondary transition-all duration-200";

const Header = () => {
  const location = useLocation();
  const { user, isAdmin: hasAdminRole, signOut } = useAuth();
  const unreadCount = useUnreadMessages();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Close on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Hide header on auth page
  if (location.pathname === "/") return null;

  return (
    <header className="sticky top-0 z-50 px-6 pt-3 pb-2">
      <div ref={menuRef} className="max-w-6xl mx-auto relative">
        <div className="rounded-full bg-card shadow-sm px-6 h-14 flex items-center justify-between relative z-10">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Epokowo" className="h-7" />
          </Link>

          <div className="flex items-center gap-1">
            {user && (
              <Link
                to="/kontakt"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-foreground hover:bg-secondary transition-all duration-200 relative"
                aria-label="Wiadomości"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-foreground hover:bg-secondary transition-all duration-200"
              aria-label="Menu"
            >
            <div className="relative w-[22px] h-[22px]">
              <span
                className={`absolute left-0 top-[4px] w-full h-[2px] bg-current rounded-full transition-all duration-300 origin-center ${
                  menuOpen ? "rotate-45 translate-y-[7px]" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[10px] w-full h-[2px] bg-current rounded-full transition-all duration-300 ${
                  menuOpen ? "opacity-0 scale-x-0" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[16px] w-full h-[2px] bg-current rounded-full transition-all duration-300 origin-center ${
                  menuOpen ? "-rotate-45 -translate-y-[5px]" : ""
                }`}
              />
            </div>
            </button>
          </div>
        </div>

        {/* Dropdown menu */}
        <div
          className={`absolute right-0 top-full mt-3 w-60 rounded-2xl bg-card shadow-[var(--shadow-elevated)] py-2 z-[5] transition-all duration-300 origin-top-right ${
            menuOpen
              ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
              : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
          }`}
        >
          <div className="pt-2">
            <Link to="/" onClick={() => setMenuOpen(false)} className={menuItemClass}>
              <BookOpen size={16} className="text-primary" />
              Nauka
            </Link>

            {user && (
              <>
                <Link to="/profil" onClick={() => setMenuOpen(false)} className={menuItemClass}>
                  <User size={16} className="text-primary" />
                  Profil
                </Link>
                <Link to="/kontakt" onClick={() => setMenuOpen(false)} className={menuItemClass}>
                  <Mail size={16} className="text-primary" />
                  Kontakt
                </Link>
                <Link to="/egzaminy" onClick={() => setMenuOpen(false)} className={menuItemClass}>
                  <Calendar size={16} className="text-primary" />
                  Egzaminy
                </Link>
              </>
            )}

            {hasAdminRole && (
              <Link to="/admin" onClick={() => setMenuOpen(false)} className={menuItemClass}>
                <Shield size={16} className="text-primary" />
                Panel admina
              </Link>
            )}

            <div className="h-px bg-secondary mx-4 my-1.5" />

            {user ? (
              <button
                onClick={() => { signOut(); setMenuOpen(false); }}
                className={`w-full ${menuItemClass}`}
              >
                <LogOut size={16} className="text-muted-foreground" />
                Wyloguj się
              </button>
            ) : (
              <Link to="/" onClick={() => setMenuOpen(false)} className={menuItemClass}>
                <LogIn size={16} className="text-muted-foreground" />
                Zaloguj się
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-foreground hover:bg-secondary transition-all duration-200"
              aria-label="Menu"
            >
            <div className="relative w-[22px] h-[22px]">
              <span
                className={`absolute left-0 top-[4px] w-full h-[2px] bg-current rounded-full transition-all duration-300 origin-center ${
                  menuOpen ? "rotate-45 translate-y-[7px]" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[10px] w-full h-[2px] bg-current rounded-full transition-all duration-300 ${
                  menuOpen ? "opacity-0 scale-x-0" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[16px] w-full h-[2px] bg-current rounded-full transition-all duration-300 origin-center ${
                  menuOpen ? "-rotate-45 -translate-y-[5px]" : ""
                }`}
              />
            </div>
            </button>
          </div>
        </div>

        {/* Dropdown menu */}
        <div
          className={`absolute right-0 top-full mt-3 w-60 rounded-2xl bg-card shadow-[var(--shadow-elevated)] py-2 z-[5] transition-all duration-300 origin-top-right ${
            menuOpen
              ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
              : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
          }`}
        >
          <div className="pt-2">
            <Link to="/" onClick={() => setMenuOpen(false)} className={menuItemClass}>
              <BookOpen size={16} className="text-primary" />
              Nauka
            </Link>

            {user && (
              <>
                <Link to="/profil" onClick={() => setMenuOpen(false)} className={menuItemClass}>
                  <User size={16} className="text-primary" />
                  Profil
                </Link>
                <Link to="/kontakt" onClick={() => setMenuOpen(false)} className={menuItemClass}>
                  <Mail size={16} className="text-primary" />
                  Kontakt
                </Link>
                <Link to="/egzaminy" onClick={() => setMenuOpen(false)} className={menuItemClass}>
                  <Calendar size={16} className="text-primary" />
                  Egzaminy
                </Link>
              </>
            )}

            {hasAdminRole && (
              <Link to="/admin" onClick={() => setMenuOpen(false)} className={menuItemClass}>
                <Shield size={16} className="text-primary" />
                Panel admina
              </Link>
            )}

            <div className="h-px bg-secondary mx-4 my-1.5" />

            {user ? (
              <button
                onClick={() => { signOut(); setMenuOpen(false); }}
                className={`w-full ${menuItemClass}`}
              >
                <LogOut size={16} className="text-muted-foreground" />
                Wyloguj się
              </button>
            ) : (
              <Link to="/" onClick={() => setMenuOpen(false)} className={menuItemClass}>
                <LogIn size={16} className="text-muted-foreground" />
                Zaloguj się
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
