import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Save, Upload, FileDown } from "lucide-react";
import { toast } from "sonner";

interface WorksheetRow {
  id: string;
  epoch_id: string;
  title: string;
  description: string | null;
  file_url: string;
  published: boolean;
  sort_order: number;
}

export default function AdminWorksheetManager({ epochId, epochName }: { epochId: string; epochName: string }) {
  const [worksheets, setWorksheets] = useState<WorksheetRow[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newTitle, setNewTitle] = useState("");

  const fetchWorksheets = async () => {
    const { data } = await supabase
      .from("worksheets")
      .select("*")
      .eq("epoch_id", epochId)
      .order("sort_order");
    if (data) setWorksheets(data);
  };

  useEffect(() => { fetchWorksheets(); }, [epochId]);

  const uploadFile = async (file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${epochId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("worksheets").upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("worksheets").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleCreate = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) { toast.error("Wybierz plik PDF"); return; }
    if (!newTitle.trim()) { toast.error("Podaj tytuł"); return; }

    setUploading(true);
    try {
      const url = await uploadFile(file);
      const { error } = await supabase.from("worksheets").insert({
        epoch_id: epochId,
        title: newTitle.trim(),
        file_url: url,
        sort_order: worksheets.length,
      });
      if (error) throw error;
      setNewTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Karta pracy dodana!");
      await fetchWorksheets();
    } catch (e: any) {
      toast.error(e.message);
    }
    setUploading(false);
  };

  const updateWorksheet = async (id: string, updates: Partial<WorksheetRow>) => {
    setSaving(id);
    const { error } = await supabase.from("worksheets").update(updates).eq("id", id);
    setSaving(null);
    if (error) toast.error(error.message);
    else { toast.success("Zapisano!"); await fetchWorksheets(); }
  };

  const deleteWorksheet = async (id: string) => {
    if (!confirm("Usunąć kartę pracy?")) return;
    await supabase.from("worksheets").delete().eq("id", id);
    toast.success("Usunięto");
    await fetchWorksheets();
  };

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-foreground mb-6">Karty pracy — {epochName}</h2>

      {/* Add new */}
      <div className="rounded-lg border border-dashed border-border bg-card p-4 mb-6">
        <h3 className="font-body font-medium text-foreground text-sm mb-3">Dodaj nową kartę pracy</h3>
        <div className="space-y-3">
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Tytuł karty pracy"
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
          <div className="flex items-center gap-3">
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="text-sm font-body file:mr-3 file:h-9 file:px-4 file:rounded-md file:border-0 file:bg-secondary file:text-foreground file:text-sm file:font-medium file:cursor-pointer" />
            <button onClick={handleCreate} disabled={uploading}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-body font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap">
              <Upload size={14} /> {uploading ? "Wysyłam..." : "Dodaj"}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      {worksheets.length === 0 ? (
        <p className="text-muted-foreground font-body text-sm py-8 text-center">Brak kart pracy.</p>
      ) : (
        <div className="space-y-3">
          {worksheets.map(ws => (
            <div key={ws.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <input value={ws.title} onChange={e => {
                  setWorksheets(worksheets.map(w => w.id === ws.id ? { ...w, title: e.target.value } : w));
                }} className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm font-body font-medium focus:outline-none focus:ring-2 focus:ring-ring mr-2" />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-body">
                    <input type="checkbox" checked={ws.published} onChange={e => updateWorksheet(ws.id, { published: e.target.checked })} className="rounded" />
                    Publ.
                  </label>
                  <button onClick={() => updateWorksheet(ws.id, { title: ws.title })} disabled={saving === ws.id}
                    className="p-2 text-muted-foreground hover:text-primary"><Save size={14} /></button>
                  <a href={ws.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground hover:text-primary"><FileDown size={14} /></a>
                  <button onClick={() => deleteWorksheet(ws.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
