import { Link, useLocation } from "react-router-dom";
import { BookOpen, Mail, Calendar } from "lucide-react";

export const Footer = () => {
  const location = useLocation();

  if (location.pathname === "/") return null;

  return (
    <footer className="border-t border-border bg-foreground text-primary-foreground">
      <div className="px-8 sm:px-10 py-8">
        <nav
          className="flex flex-wrap gap-x-6 gap-y-2 mb-6"
          aria-label="Stopka - linki"
        >
          <Link
            to="/epoki"
            className="flex items-center gap-2 text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors"
          >
            <BookOpen size={14} className="text-primary" />
            Nauka
          </Link>
          <Link
            to="/kontakt"
            className="flex items-center gap-2 text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors"
          >
            <Mail size={14} className="text-primary" />
            Kontakt
          </Link>
          <Link
            to="/egzaminy"
            className="flex items-center gap-2 text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors"
          >
            <Calendar size={14} className="text-primary" />
            Egzaminy
          </Link>
        </nav>

        <div className="h-px bg-primary-foreground/10 mb-4" />

        <p className="text-[11px] text-primary-foreground/30">
          © {new Date().getFullYear()} Epokowo. Wszystkie prawa zastrzeżone.
        </p>
      </div>
    </footer>
  );
};
