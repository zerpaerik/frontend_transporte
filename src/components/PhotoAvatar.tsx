"use client";

import { useRef, useState, type ReactNode } from "react";
import { Camera, X } from "lucide-react";
import { apiFoto } from "@/lib/api";
import { fileToImageDataURL } from "@/lib/image";

export function PhotoAvatar({
  base, entityId, foto, fallback, readOnly = false, onUploaded, className = "h-11 w-11",
}: {
  base: "conductores" | "vehiculos";
  entityId: string;
  foto?: string | null;
  fallback: ReactNode;
  readOnly?: boolean;
  onUploaded?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const shown = preview ?? foto;

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (ref.current) ref.current.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const { base64, mime, dataUrl } = await fileToImageDataURL(file);
      await apiFoto.set(base, entityId, base64, mime);
      setPreview(dataUrl); // muestra la nueva foto al instante
      onUploaded?.();
    } catch (err) {
      alert((err as Error).message || "No se pudo subir la foto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={`relative shrink-0 ${className}`}>
        <div
          className={`grid h-full w-full place-items-center overflow-hidden rounded-xl bg-steel-600 text-white ${shown ? "cursor-zoom-in" : ""}`}
          onClick={() => { if (shown) setOpen(true); }}
          title={shown ? "Ver foto" : undefined}
        >
          {shown ? <img src={shown} alt="" className="h-full w-full object-cover" /> : fallback}
        </div>
        {!readOnly ? (
          <>
            <button
              type="button"
              onClick={() => ref.current?.click()}
              disabled={busy}
              title="Cambiar foto"
              aria-label="Cambiar foto"
              className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-brand-500 text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
            >
              <Camera size={11} />
            </button>
            <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick} />
          </>
        ) : null}
      </div>

      {open && shown ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X size={20} />
          </button>
          <img
            src={shown}
            alt=""
            className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
