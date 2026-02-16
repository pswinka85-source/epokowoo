import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { epochs } from "@/data/epochs";
import { Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Author {
  name: string;
  works: string[];
}

export default function AdminEpochEditor({ epochId, epochName }: { epochId: string; epochName: string }) {
  const staticEpoch = epochs.find(e => e.id === epochId);
  const [characteristics, setCharacteristics] = useState<string[]>([]);
  const [keyThemes, setKeyThemes] = useState<string[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("epoch_overrides")
        .select("*")
        .eq("epoch_id", epochId)
        .maybeSingle();

      if (data) {
        setCharacteristics(data.characteristics || []);
        setKeyThemes(data.key_themes || []);
        setAuthors((data.authors as unknown as Author[]) || []);
      } else if (staticEpoch) {
        setCharacteristics([...staticEpoch.characteristics]);
        setKeyThemes([...staticEpoch.keyThemes]);
        setAuthors(staticEpoch.authors.map(a => ({ ...a, works: [...a.works] })));
      }
      setLoaded(true);
    };
    load();
  }, [epochId]);

  const save = async () => {
    setSaving(true);
    const payload = {
      epoch_id: epochId,
      characteristics,
      key_themes: keyThemes,
      authors: authors as any,
    };
    const { error } = await supabase
      .from("epoch_overrides")
      .upsert(payload, { onConflict: "epoch_id" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Zapisano!");
  };

  if (!loaded) return <p className="text-muted-foreground font-body text-sm py-8 text-center">Ładowanie...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-semibold text-foreground">Dane epoki — {epochName}</h2>
        <button onClick={save} disabled={saving} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-body font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
          <Save size={14} /> {saving ? "Zapisuję..." : "Zapisz"}
        </button>
      </div>

      {/* Characteristics */}
      <section className="mb-8">
        <h3 className="font-display font-semibold text-foreground mb-3">Cechy charakterystyczne</h3>
        <div className="space-y-2">
          {characteristics.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={c} onChange={e => { const a = [...characteristics]; a[i] = e.target.value; setCharacteristics(a); }}
                className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={() => setCharacteristics(characteristics.filter((_, j) => j !== i))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
            </div>
          ))}
          <button onClick={() => setCharacteristics([...characteristics, ""])} className="flex items-center gap-1.5 text-xs text-primary hover:underline font-body"><Plus size={12} /> Dodaj cechę</button>
        </div>
      </section>

      {/* Key Themes */}
      <section className="mb-8">
        <h3 className="font-display font-semibold text-foreground mb-3">Kluczowe motywy i tematy</h3>
        <div className="space-y-2">
          {keyThemes.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={t} onChange={e => { const a = [...keyThemes]; a[i] = e.target.value; setKeyThemes(a); }}
                className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={() => setKeyThemes(keyThemes.filter((_, j) => j !== i))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
            </div>
          ))}
          <button onClick={() => setKeyThemes([...keyThemes, ""])} className="flex items-center gap-1.5 text-xs text-primary hover:underline font-body"><Plus size={12} /> Dodaj motyw</button>
        </div>
      </section>

      {/* Authors */}
      <section>
        <h3 className="font-display font-semibold text-foreground mb-3">Ważni twórcy i dzieła</h3>
        <div className="space-y-4">
          {authors.map((author, ai) => (
            <div key={ai} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <input value={author.name} onChange={e => { const a = [...authors]; a[ai] = { ...a[ai], name: e.target.value }; setAuthors(a); }}
                  placeholder="Imię i nazwisko" className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm font-body font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
                <button onClick={() => setAuthors(authors.filter((_, j) => j !== ai))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
              </div>
              <div className="space-y-1 ml-4">
                {author.works.map((work, wi) => (
                  <div key={wi} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">•</span>
                    <input value={work} onChange={e => {
                      const a = [...authors]; const w = [...a[ai].works]; w[wi] = e.target.value; a[ai] = { ...a[ai], works: w }; setAuthors(a);
                    }} placeholder="Tytuł dzieła" className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
                    <button onClick={() => {
                      const a = [...authors]; a[ai] = { ...a[ai], works: a[ai].works.filter((_, j) => j !== wi) }; setAuthors(a);
                    }} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                  </div>
                ))}
                <button onClick={() => {
                  const a = [...authors]; a[ai] = { ...a[ai], works: [...a[ai].works, ""] }; setAuthors(a);
                }} className="text-xs text-primary hover:underline font-body ml-4">+ Dodaj dzieło</button>
              </div>
            </div>
          ))}
          <button onClick={() => setAuthors([...authors, { name: "", works: [""] }])} className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-border text-sm font-body text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
            <Plus size={14} /> Dodaj twórcę
          </button>
        </div>
      </section>
    </div>
  );
}
