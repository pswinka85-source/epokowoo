import { Link, useLocation } from "react-router-dom";
import { BookOpen, Shield, LogOut, User, Mail, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";

const linkClass =
  "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200";

const Sidebar = () => {
  const location = useLocation();
  const { user, isAdmin: hasAdminRole, signOut } = useAuth();

  const isActive = (path: string) =>
    location.pathname === path
      ? "bg-primary text-primary-foreground"
      : "text-foreground hover:bg-secondary";

  if (location.pathname === "/") return null;

  return (
    <aside className="w-64 min-h-screen bg-card shadow-sm border-r border-secondary flex flex-col p-4">
      <Link to="/epoki" className="flex items-center gap-3 mb-8 px-2">
        <img src={logo} alt="Epokowo" className="h-8" />
      </Link>

      <nav className="flex flex-col gap-2 flex-1">
        <Link to="/epoki" className={`${linkClass} ${isActive("/epoki")}`}>
          <BookOpen size={18} />
          Nauka
        </Link>

        {user && (
          <>
            <Link to="/profil" className={`${linkClass} ${isActive("/profil")}`}>
              <User size={18} />
              Profil
            </Link>

            <Link to="/kontakt" className={`${linkClass} ${isActive("/kontakt")}`}>
              <Mail size={18} />
              Kontakt
            </Link>

            <Link to="/egzaminy" className={`${linkClass} ${isActive("/egzaminy")}`}>
              <Calendar size={18} />
              Egzaminy
            </Link>
          </>
        )}

        {hasAdminRole && (
          <Link to="/admin" className={`${linkClass} ${isActive("/admin")}`}>
            <Shield size={18} />
            Panel admina
          </Link>
        )}
      </nav>

      {user && (
        <button
          onClick={signOut}
          className="mt-6 flex items-center gap-3 px-4 py-3 text-sm rounded-xl text-muted-foreground hover:bg-secondary transition-all"
        >
          <LogOut size={18} />
          Wyloguj się
        </button>
      )}
    </aside>
  );
};

export default Sidebar;
