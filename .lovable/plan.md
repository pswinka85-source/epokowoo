

## Plan: Dokładne odwzorowanie strony Kontakt wg referencji

### Plik do edycji: `src/pages/Contact.tsx` oraz `src/index.css`

---

### 1. Rozmiary czcionek — wszystkie za małe o 2-3px

| Element | Obecnie | Docelowo |
|---------|---------|----------|
| Nazwa nadawcy | `text-[15px]` | `text-[17px]` |
| "Aktywny: Xh temu" | `text-[11px]` | `text-[13px]` |
| Tytuł wiadomości (Re:...) | `text-[12px]` | `text-[14px]` |
| Podgląd treści | `text-[11px]` | `text-[13px]` |
| "Automatyczne powiadomienie" | `text-[11px]` | `text-[13px]` |

### 2. Padding kart
- Obecny: `px-5 py-3.5` → zmiana na `px-6 py-4`

### 3. Odstęp między kartami
- Obecny: `space-y-8` → zmiana na `space-y-10`

### 4. Kolor podglądu treści — za jasny
- Obecny: `text-muted-foreground/40` → zmiana na `text-muted-foreground/60`

### 5. Kropki statusu — za jasne
- Obecne: `bg-muted-foreground/30, /20, /10`
- Zmiana na: `bg-foreground/70, /50, /30` (ciemniejsze, bardziej widoczne)

### 6. Prawy panel (pusty stan)
- Ilustracja: `w-48 h-48` → `w-56 h-56`
- Tekst: `text-[15px]` i `text-muted-foreground/50` → `text-[17px]` i `text-muted-foreground/70`

### 7. Suwak (scrollbar) — za mało widoczny
Na referencji suwak jest cienki, ale wyraźniejszy — ciemniejszy kolor, delikatnie zaokrąglony.

**Zmiany w `src/index.css`:**
- Zwiększyć grubość scrollbar thumb do ~8px
- Ciemniejszy kolor: `hsl(var(--muted-foreground) / 0.3)` zamiast `hsl(var(--border))`
- Dodać `:hover` state na thumb z jeszcze ciemniejszym kolorem (`/0.5`)
- Track lekko widoczny: `hsl(var(--muted) / 0.5)`

**Zmiany w `Contact.tsx`:**
- Kontener listy (linia 399): upewnić się, że klasa `scrollbar-thin` jest obecna (jest) — styl zostanie zaktualizowany globalnie w CSS

---

### Podsumowanie
Dwa pliki do edycji: `Contact.tsx` (rozmiary czcionek, paddingi, kolory, spacing) oraz `src/index.css` (styl suwaka — grubszy, ciemniejszy, z hover efektem).

