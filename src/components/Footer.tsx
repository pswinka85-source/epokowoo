import { Link, useLocation } from "react-router-dom";
import { BookOpen, Mail, Calendar, Settings } from "lucide-react";
import logo from "@/assets/logo.png";

export const Footer = () => {
  const location = useLocation();

  if (location.pathname === "/") return null;

  return (
    <footer className="border-t border-border bg-card text-foreground">
      <div className="px-8 sm:px-10 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/">
            <img src={logo} alt="Epokowo" className="h-6" />
          </Link>
        </div>

        <nav
          className="flex flex-wrap gap-x-6 gap-y-2 mb-6"
          aria-label="Stopka - linki"
        >
          <Link
            to="/epoki"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <BookOpen size={14} className="text-primary" />
            Nauka
          </Link>
          <Link
            to="/kontakt"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail size={14} className="text-primary" />
            Kontakt
          </Link>
          <Link
            to="/egzaminy"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Calendar size={14} className="text-primary" />
            Egzaminy
          </Link>
          <Link
            to="/testy"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <BookOpen size={14} className="text-primary" />
            Testy
          </Link>
          <Link
            to="/profil"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail size={14} className="text-primary" />
            Ustawienia
          </Link>
        </nav>

        <div className="h-px bg-border mb-4" />

        <p className="text-[11px] text-muted-foreground/50">
          © {new Date().getFullYear()} Epokowo. Wszystkie prawa zastrzeżone.
        </p>
      </div>
    </footer>
  );
};
