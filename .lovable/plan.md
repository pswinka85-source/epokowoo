

## Analiza różnic: obecny kod vs zdjęcie referencyjne

Porównując zdjęcie referencyjne z kodem `Contact.tsx`, strona jest już dość blisko projektu. Oto konkretne elementy do poprawienia:

### 1. Separator pod nagłówkiem
**Obecny stan:** Jest linia `h-px bg-border/50` pod nagłówkiem.
**Referencja:** Separator jest bardziej widoczny — pełna szerokość, wyraźna linia oddzielająca nagłówek od listy.
**Poprawka:** Zwiększyć widoczność separatora, rozciągnąć go na pełną szerokość kontenera.

### 2. Karty konwersacji — rozmiar awatarów i trzypunktowy status
**Obecny stan:** Awatary 60px, brak „trzech kropek" statusu online widocznych na zdjęciu.
**Referencja:** Pod awatarem „Administrator Piotr" widać trzy małe kropki (status online/pisanie). Awatar wygląda na ~60px, co się zgadza.
**Poprawka:** Dodać dekoracyjne kropki statusu pod awatarem konwersacji (widoczne na screenie).

### 3. Karty — padding i spacing
**Obecny stan:** `space-y-8`, padding karty `px-4 py-2.5`.
**Referencja:** Karty mają nieco więcej wewnętrznego paddingu, tekst jest odrobinę większy. Odstęp między kartami wygląda na podobny.
**Poprawka:** Zwiększyć padding karty do `px-5 py-3.5` i lekko zwiększyć font-size tytułu do `text-[15px]`.

### 4. Prawy panel — rozmiar ilustracji i tekst
**Obecny stan:** Ilustracja koperty 128px, tekst 14px.
**Referencja:** Ilustracja jest wyraźnie większa (~180-200px), tekst jest bardziej widoczny.
**Poprawka:** Zwiększyć rozmiar ilustracji do `w-48 h-48` i zwiększyć czcionkę tekstu.

### 5. Font podtytułu „Aktywny: Xh temu"
**Obecny stan:** `text-[10px]`
**Referencja:** Tekst statusu wygląda na nieco większy (~11-12px).
**Poprawka:** Zwiększyć do `text-[11px]`.

### 6. Tekst preview wiadomości
**Obecny stan:** Pogrubiony tytuł `text-[11px]`, podgląd treści `text-[10px]`.
**Referencja:** Te teksty są odrobinę większe.
**Poprawka:** Zwiększyć do `text-[12px]` dla tytułu i `text-[11px]` dla podglądu.

---

### Plik do edycji
- `src/pages/Contact.tsx` — jedyny plik wymagający zmian

### Podsumowanie zmian
Drobne korekty rozmiarów czcionek, paddingów kart, wielkości ilustracji w prawym panelu oraz dodanie dekoracyjnych kropek statusu online pod awatarami — tak by wygląd strony jak najlepiej odwzorowywał dostarczone zdjęcie referencyjne.

