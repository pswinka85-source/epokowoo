import { Link, useLocation } from "react-router-dom";
import { BookOpen, Mail, Shield, Cookie, FileText, Calendar } from "lucide-react";
import logo from "@/assets/logo.png";

export const Footer = () => {
  const location = useLocation();

  // Ukryj stopkę na stronie logowania (spójnie z Header)
  if (location.pathname === "/") return null;

  return (
    <footer className="mt-auto border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-8 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          {/* Logo */}
          <Link
            to="/epoki"
            className="w-fit group"
            aria-label="Epokowo - strona główna"
          >
            <img
              src={logo}
              alt="Epokowo"
              className="h-6 sm:h-7 opacity-60 group-hover:opacity-100 transition-opacity"
            />
          </Link>

          {/* Linki nawigacyjne */}
          <nav
            className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-x-8 sm:gap-y-2"
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
            <a
              href="#"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Shield size={14} className="text-primary" />
              Polityka prywatności
            </a>
            <a
              href="#"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Cookie size={14} className="text-primary" />
              Cookies
            </a>
            <a
              href="#"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText size={14} className="text-primary" />
              Ochrona danych
            </a>
          </nav>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
            © {new Date().getFullYear()} Epokowo. Wszystkie prawa zastrzeżone.
          </p>
        </div>
      </div>
    </footer>
  );
};
