import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { uploadPhoto } from "@/lib/api";
import { resizeImageFile } from "@/lib/image";

interface PhotoUploadFieldProps {
  label: string;
  photos: string[];
  onChange: (photos: string[]) => void;
  max?: number;
}

export function PhotoUploadField({ label, photos, onChange, max = 6 }: PhotoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const room = max - photos.length;
    const selected = Array.from(files).slice(0, room);

    setUploading(true);
    try {
      // Cada foto se reduce y se sube al back (POST /files/images); se guarda la URL que devuelve.
      const urls = await Promise.all(selected.map(async (f) => uploadPhoto(await resizeImageFile(f))));
      onChange([...photos, ...urls]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir una de las fotos. Intenta de nuevo.");
    } finally {
      setUploading(false);
    }

    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-base-300">
        {label} <span className="text-base-500">({photos.length}/{max})</span>
      </label>

      <div className="flex flex-wrap gap-2">
        {photos.map((src, index) => (
          <div key={index} className="group relative size-20 shrink-0 overflow-hidden rounded-lg ring-1 ring-base-700">
            <img src={src} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(index)}
              className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-base-950/80 text-base-200 opacity-0 transition-opacity hover:bg-status-danger group-hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {photos.length < max && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-base-600 text-base-400 transition-colors hover:border-brand-500/50 hover:text-brand-400 disabled:opacity-50"
          >
            <ImagePlus className="size-5" />
            <span className="text-[10px] font-medium">{uploading ? "Subiendo..." : "Agregar"}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-xs text-status-danger">{error}</p>}
    </div>
  );
}
