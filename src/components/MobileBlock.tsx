import { Monitor } from "lucide-react";
import logo from "@/assets/logo.png";

const MobileBlock = () => (
  <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-8 lg:hidden">
    <div className="text-center max-w-xs">
      <img src={logo} alt="Epochowo" className="h-7 mx-auto mb-10 opacity-80" />

      <div className="w-14 h-14 rounded-xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
        <Monitor size={26} className="text-primary" />
      </div>

      <h1 className="font-display text-xl font-semibold text-foreground mb-2">
        Otwórz na komputerze
      </h1>

      <p className="text-muted-foreground font-body text-sm leading-relaxed">
        Epochowo wymaga większego ekranu. Przełącz się na komputer lub włącz widok pulpitu w przeglądarce.
      </p>
    </div>
  </div>
);

export default MobileBlock;
