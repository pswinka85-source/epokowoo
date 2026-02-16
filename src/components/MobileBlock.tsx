import { Monitor, Tablet } from "lucide-react";
import logo from "@/assets/logo.png";

const MobileBlock = () => (
  <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-8 md:hidden">
    <div className="text-center max-w-sm">
      <img src={logo} alt="Epochowo" className="h-8 mx-auto mb-8" />
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
        <Monitor size={32} className="text-primary" />
      </div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-3">
        Strona niedostępna na telefonie
      </h1>
      <p className="text-muted-foreground font-body leading-relaxed mb-6">
        Epochowo działa wyłącznie na tabletach i komputerach. Otwórz stronę na większym ekranie, aby korzystać z platformy.
      </p>
      <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground font-body">
        <Tablet size={16} /> Tablet lub komputer
      </div>
    </div>
  </div>
);

export default MobileBlock;
