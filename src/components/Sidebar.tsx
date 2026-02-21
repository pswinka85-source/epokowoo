import React from "react";
import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { name: "Nauka", icon: "💡", path: "/epoki" },
    { name: "Wiadomości", icon: "📧", path: "/kontakt" },
    { name: "Egzaminy", icon: "📅", path: "/egzaminy" },
    { name: "Ustawienia", icon: "⚙️", path: "/ustawienia" },
    { name: "Panel admina", icon: "🛡️", path: "/admin" },
  ];

  const rozprawkaData = {
    id: "rozprawka",
    name: "Rozprawka",
    icon: "📝",
    period: "EGZ",
    shortDesc: "Przygotuj się do egzaminu końcowego i zdaj rozprawkę na ocenę celującą."
  };

  if (location.pathname === "/") return null;

  return (
    <div className="mx-8 mb-4">
      <div className="pt-12 md:pt-20">
        <div className="w-[300px] bg-white p-4 flex flex-col rounded-3xl shadow-lg mx-auto">
          <nav className="flex-grow">
            <ul className="space-y-3">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-4 p-2 rounded-2xl text-lg font-bold transition-colors ${
                      location.pathname === item.path
                        ? "bg-black text-white font-bold"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    <span className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                      location.pathname === item.path
                        ? "bg-white text-black font-bold"
                        : "bg-white"
                    }`}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* Karta Rozprawka */}
          <article className="relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 hover:border-primary/30">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl" role="img" aria-label="Rozprawka">
                  📝
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground font-body px-2 py-0.5 rounded-full bg-secondary">
                  EGZ
                </span>
              </div>

              <h3 className="font-display text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                Rozprawka
              </h3>

              <p className="text-sm text-muted-foreground font-body leading-relaxed line-clamp-2 flex-1">
                Przygotuj się do egzaminu końcowego i zdaj rozprawkę na ocenę celującą.
              </p>

              <div className="flex items-center gap-2 mt-4 text-sm font-body font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Rozpocznij naukę
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
