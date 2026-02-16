import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Brain, FileText, CheckCircle, ArrowRight } from "lucide-react";

const features = [
  {
    icon: <BookOpen size={24} />,
    title: "Interaktywne lekcje",
    desc: "Przystępne materiały do każdej epoki literackiej, podzielone na przejrzyste bloki.",
  },
  {
    icon: <Brain size={24} />,
    title: "Quizy i e-testy",
    desc: "Sprawdź swoją wiedzę dzięki quizom dopasowanym do każdego tematu.",
  },
  {
    icon: <FileText size={24} />,
    title: "Karty pracy",
    desc: "Pobieraj gotowe materiały do druku i ćwicz offline.",
  },
  {
    icon: <CheckCircle size={24} />,
    title: "Śledzenie postępów",
    desc: "Monitoruj swoje wyniki i wracaj do tematów, które wymagają powtórki.",
  },
];

const Index = () => {
  const { user } = useAuth();

  if (user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16">
        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground text-center mb-3">
          Cześć! 👋
        </h1>
        <p className="text-muted-foreground font-body text-center mb-8 max-w-md">
          Wybierz epokę i rozpocznij naukę — wszystko czego potrzebujesz jest w zakładce Epoki.
        </p>
        <Link
          to="/epoka/antyk"
          className="h-12 px-8 rounded-xl bg-primary text-primary-foreground text-sm font-body font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          Przejdź do nauki
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 -left-32 w-[36rem] h-[36rem] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 -right-32 w-[40rem] h-[40rem] bg-accent/6 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-6 pt-20 pb-16 md:pt-32 md:pb-24 text-center">
          <span className="inline-block text-xs font-body font-semibold uppercase tracking-[0.15em] text-primary bg-primary/10 px-3 py-1 rounded-full mb-6">
            Matura z polskiego
          </span>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.08] mb-5">
            Epoki literackie
            <br />
            <span className="text-primary">bez stresu</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-body leading-relaxed max-w-xl mx-auto mb-10">
            Interaktywne lekcje, quizy i materiały do nauki — wszystko czego
            potrzebujesz, by zdać maturę z polskiego.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/auth"
              className="h-12 px-8 rounded-xl bg-primary text-primary-foreground text-sm font-body font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              Zacznij za darmo
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/auth"
              className="h-12 px-8 rounded-xl bg-secondary text-secondary-foreground text-sm font-body font-semibold flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              Mam już konto
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-20 md:pb-28">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground text-center mb-3">
          Wszystko w jednym miejscu
        </h2>
        <p className="text-muted-foreground font-body text-center mb-10 max-w-lg mx-auto">
          Platforma stworzona z myślą o uczniach przygotowujących się do matury.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 flex gap-4 items-start hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {f.icon}
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground mb-1">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-20 md:pb-28 text-center">
        <div className="rounded-3xl bg-primary/5 border border-primary/10 p-10 md:p-14">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
            Gotowy na maturę?
          </h2>
          <p className="text-muted-foreground font-body mb-8 max-w-md mx-auto">
            Dołącz do platformy i zacznij naukę epok literackich już teraz.
          </p>
          <Link
            to="/auth"
            className="inline-flex h-12 px-8 rounded-xl bg-primary text-primary-foreground text-sm font-body font-semibold items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            Zarejestruj się
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;
