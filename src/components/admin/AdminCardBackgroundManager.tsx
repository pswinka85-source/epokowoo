import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Palette, Image as ImageIcon, Check } from "lucide-react";
import { toast } from "sonner";
import { epochs } from "@/data/epochs";

interface CardBackground {
  id: string;
  epoch_id: string;
  background_type: 'color' | 'image';
  background_value: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const AdminCardBackgroundManager = () => {
  const { user } = useAuth();
  const [backgrounds, setBackgrounds] = useState<CardBackground[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedEpoch, setSelectedEpoch] = useState(epochs[0]?.id || '');
  const [colorValue, setColorValue] = useState('#6973ff');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    loadBackgrounds();
  }, []);

  const loadBackgrounds = async () => {
    const { data, error } = await supabase
      .from("card_backgrounds")
      .select("*")
      .order("epoch_id, created_at", { ascending: true });

    if (error) {
      console.error("Error loading backgrounds:", error);
      toast.error("Błąd ładowania tł");
    } else {
      setBackgrounds(data || []);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Sprawdź typ pliku
    if (!file.type.startsWith('image/')) {
      toast.error("Można przesyłać tylko pliki graficzne (JPG, PNG, SVG)");
      return;
    }

    // Sprawdź rozmiar pliku (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Plik jest zbyt duży. Maksymalny rozmiar to 5MB");
      return;
    }

    setSelectedFile(file);
    
    // Podgląd obrazka
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async () => {
    if (!selectedFile || !selectedEpoch) return;

    setUploading(true);
    
    try {
      // Prześlij plik do Supabase Storage
      const fileName = `card-bg-${Date.now()}-${selectedFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('card-backgrounds')
        .upload(fileName, selectedFile);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Błąd przesyłania pliku");
        setUploading(false);
        return;
      }

      // Pobierz publiczny URL
      const { data: { publicUrl } } = supabase.storage
        .from('card-backgrounds')
        .getPublicUrl(fileName);

      // Zapisz w bazie danych
      const { error: dbError } = await supabase
        .from("card_backgrounds")
        .insert({
          epoch_id: selectedEpoch,
          background_type: 'image',
          background_value: publicUrl,
          is_active: false
        });

      if (dbError) {
        console.error("Database error:", dbError);
        toast.error("Błąd zapisywania tła");
      } else {
        toast.success("Obraz tła został dodany");
        setSelectedFile(null);
        setPreviewUrl('');
        loadBackgrounds();
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Wystąpił nieoczekiwany błąd");
    } finally {
      setUploading(false);
    }
  };

  // Funkcja do tworzenia tabeli jeśli nie istnieje
  const createTableIfNotExists = async () => {
    try {
      // Sprawdź czy użytkownik jest adminem
      const { data: adminCheck } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!adminCheck) {
        toast.error("Tylko admin może tworzyć tabele");
        return;
      }

      // Wykonaj surowe SQL do stworzenia tabeli
      const { error: tableError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.card_backgrounds (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            epoch_id TEXT NOT NULL,
            background_type TEXT NOT NULL DEFAULT 'color' CHECK (background_type IN ('color', 'image')),
            background_value TEXT NOT NULL DEFAULT 'hsl(217, 91%, 60%)',
            is_active BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
        `
      });

      if (tableError) {
        toast.error(`Błąd tworzenia tabeli: ${tableError.message}`);
        return;
      }

      // Włącz RLS
      await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE public.card_backgrounds ENABLE ROW LEVEL SECURITY;`
      });

      // Utwórz polityki
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE POLICY IF NOT EXISTS "Anyone can read card backgrounds" ON public.card_backgrounds
          FOR SELECT USING (true);
        `
      });

      await supabase.rpc('exec_sql', {
        sql: `
          CREATE POLICY IF NOT EXISTS "Admins can insert card backgrounds" ON public.card_backgrounds
          FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
        `
      });

      await supabase.rpc('exec_sql', {
        sql: `
          CREATE POLICY IF NOT EXISTS "Admins can update card backgrounds" ON public.card_backgrounds
          FOR UPDATE USING (public.is_admin(auth.uid()));
        `
      });

      await supabase.rpc('exec_sql', {
        sql: `
          CREATE POLICY IF NOT EXISTS "Admins can delete card backgrounds" ON public.card_backgrounds
          FOR DELETE USING (public.is_admin(auth.uid()));
        `
      });

      toast.success("Tabela card_backgrounds została utworzona pomyślnie!");
      loadBackgrounds();
      
    } catch (error) {
      console.error("Error creating table:", error);
      toast.error(`Błąd: ${error.message || error}`);
    }
  };

  const saveColorBackground = async () => {
    if (!selectedEpoch) {
      toast.error("Wybierz epokę przed zapisaniem koloru");
      return;
    }

    try {
      console.log("Saving color background:", { epoch_id: selectedEpoch, background_value: colorValue });
      
      const { data, error } = await supabase
        .from("card_backgrounds")
        .insert({
          epoch_id: selectedEpoch,
          background_type: 'color',
          background_value: colorValue,
          is_active: false
        })
        .select()
        .single();

      if (error) {
        console.error("Error saving color:", error);
        
        // Sprawdź czy to błąd braku tabeli
        if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
          toast.error("Tabela 'card_backgrounds' nie istnieje. Uruchom migracje w Supabase.");
        } else {
          toast.error(`Błąd zapisywania koloru tła: ${error.message || error.details || 'Nieznany błąd'}`);
        }
      } else if (data) {
        console.log("Color saved successfully:", data);
        toast.success("Kolor tła został dodany");
        setColorValue('#6973ff'); // Reset do domyślnej wartości
        loadBackgrounds();
      } else {
        toast.error("Nie udało się zapisać koloru tła - brak danych zwrotnych");
      }
    } catch (error) {
      console.error("Save color error:", error);
      toast.error(`Wystąpił nieoczekiwany błąd: ${error.message || error}`);
    }
  };

  const setActiveBackground = async (id: string) => {
    try {
      // Dezaktywuj wszystkie tła dla tej epoki
      const { error: updateError } = await supabase
        .from("card_backgrounds")
        .update({ is_active: false })
        .eq("epoch_id", backgrounds.find(bg => bg.id === id)?.epoch_id || '');

      if (updateError) {
        console.error("Error deactivating:", updateError);
        toast.error("Błąd aktualizacji tła");
        return;
      }

      // Aktywuj wybrane tło
      const { error: activateError } = await supabase
        .from("card_backgrounds")
        .update({ is_active: true })
        .eq("id", id);

      if (activateError) {
        console.error("Error activating:", activateError);
        toast.error("Błąd aktywacji tła");
      } else {
        toast.success("Tło zostało aktywowane");
        loadBackgrounds();
      }
    } catch (error) {
      console.error("Set active error:", error);
      toast.error("Wystąpił nieoczekiwany błąd");
    }
  };

  const deleteBackground = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć to tło?")) return;

    try {
      const { error } = await supabase
        .from("card_backgrounds")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting:", error);
        toast.error("Błąd usuwania tła");
      } else {
        toast.success("Tło zostało usunięte");
        loadBackgrounds();
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Wystąpił nieoczekiwany błąd");
    }
  };

  const getBackgroundsForEpoch = (epochId: string) => {
    return backgrounds.filter(bg => bg.epoch_id === epochId);
  };

  const getActiveBackground = (epochId: string) => {
    return backgrounds.find(bg => bg.epoch_id === epochId && bg.is_active);
  };

  return (
    <div className="space-y-8">
      {/* Dodawanie nowego tła */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-semibold text-foreground">
            Dodaj tło kart
          </h3>
          <button
            onClick={createTableIfNotExists}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
          >
            Utwórz tabelę
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Wybór epoki */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Epoka
            </label>
            <select
              value={selectedEpoch}
              onChange={(e) => setSelectedEpoch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            >
              {epochs.map(epoch => (
                <option key={epoch.id} value={epoch.id}>
                  {epoch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Zakładki: kolor vs obraz */}
          <div className="flex gap-4">
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl('');
              }}
              className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
                !selectedFile ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground'
              }`}
            >
              <Palette size={20} className="mx-auto mb-2" />
              <div className="text-sm font-medium">Kolor</div>
            </button>
            
            <button
              onClick={() => {
                setColorValue('#6973ff');
                setPreviewUrl('');
              }}
              className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
                selectedFile ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground'
              }`}
            >
              <ImageIcon size={20} className="mx-auto mb-2" />
              <div className="text-sm font-medium">Obraz</div>
            </button>
          </div>

          {/* Panel koloru */}
          {!selectedFile && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Wartość koloru
                </label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={colorValue}
                    onChange={(e) => setColorValue(e.target.value)}
                    className="w-20 h-10 rounded border border-border"
                  />
                  <input
                    type="text"
                    value={colorValue}
                    onChange={(e) => setColorValue(e.target.value)}
                    placeholder="#6973ff"
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                </div>
              </div>
              <button
                onClick={saveColorBackground}
                disabled={!selectedEpoch}
                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Zapisz kolor tła
              </button>
            </div>
          )}

          {/* Panel obrazu */}
          {selectedFile && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Obraz tła (JPG, PNG, SVG - max 5MB)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-border file:bg-background file:text-sm"
                />
              </div>
              
              {/* Podgląd obrazu */}
              {previewUrl && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Podgląd
                  </label>
                  <div className="w-full h-32 rounded-lg border border-border overflow-hidden bg-gray-100">
                    <img 
                      src={previewUrl} 
                      alt="Podgląd tła" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              
              <button
                onClick={uploadImage}
                disabled={uploading || !selectedEpoch}
                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    Przesyłanie...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Upload size={16} />
                    Prześlij obraz tła
                  </div>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Zarządzanie istniejącymi tłami */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display font-semibold text-foreground mb-6">
          Zarządzanie tłami
        </h3>
        
        {epochs.map(epoch => {
          const epochBackgrounds = getBackgroundsForEpoch(epoch.id);
          const activeBg = getActiveBackground(epoch.id);
          
          return (
            <div key={epoch.id} className="mb-8 last:mb-0">
              <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                {epoch.name}
                {activeBg && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    Aktywne
                  </span>
                )}
              </h4>
              
              {epochBackgrounds.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Brak tł dla tej epoki
                </p>
              ) : (
                <div className="space-y-3">
                  {epochBackgrounds.map(bg => (
                    <div
                      key={bg.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        bg.is_active 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {bg.background_type === 'color' ? (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded border border-border"
                              style={{ backgroundColor: bg.background_value }}
                            />
                            <div>
                              <p className="text-sm font-medium">Kolor</p>
                              <p className="text-xs text-muted-foreground">{bg.background_value}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <img 
                              src={bg.background_value} 
                              alt="Tło" 
                              className="w-8 h-8 rounded object-cover border border-border"
                            />
                            <div>
                              <p className="text-sm font-medium">Obraz</p>
                              <p className="text-xs text-muted-foreground truncate max-w-32">{bg.background_value}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!bg.is_active && (
                          <button
                            onClick={() => setActiveBackground(bg.id)}
                            className="px-3 py-1.5 rounded bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200 transition-colors"
                          >
                            <Check size={14} />
                            Aktywuj
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteBackground(bg.id)}
                          className="px-3 py-1.5 rounded bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 transition-colors"
                        >
                          <X size={14} />
                          Usuń
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminCardBackgroundManager;
