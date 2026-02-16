import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, Shield, LogIn, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";

const Header = () => {
  const location = useLocation();
  const { user, isAdmin: hasAdminRole, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 px-6 pt-3 pb-2">
      <div className="max-w-6xl mx-auto rounded-full bg-card shadow-sm px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Epochowo" className="h-7" />
        </Link>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className="absolute right-4 top-16 mt-1 w-56 rounded-2xl bg-card shadow-[var(--shadow-elevated)] py-2 z-50">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-body font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <BookOpen size={16} className="text-primary" />
            Epoki
          </Link>

          {hasAdminRole && (
            <Link
              to="/admin"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-body font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <Shield size={16} className="text-primary" />
              Panel admina
            </Link>
          )}

          <div className="h-px bg-secondary mx-3 my-1" />

          {user ? (
            <button
              onClick={() => { signOut(); setMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-body font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut size={16} className="text-muted-foreground" />
              Wyloguj się
            </button>
          ) : (
            <Link
              to="/auth"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-body font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <LogIn size={16} className="text-muted-foreground" />
              Zaloguj się
            </Link>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
