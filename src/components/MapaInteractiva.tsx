import { useMemo, useState } from "react";

type ZoneLore = {
  slug: string;
  title: string;
  summary: string;
  preview?: string;
};

type Hotspot = {
  slug: string;
  x: number;
  y: number;
  label: string;
};

type MapaInteractivaProps = {
  svgPath: string;
  hotspots: Hotspot[];
  zones: Record<string, ZoneLore>;
};

export default function MapaInteractiva({
  svgPath,
  hotspots,
  zones,
}: MapaInteractivaProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const activeZone = useMemo(() => {
    if (!activeSlug) {
      return null;
    }

    return zones[activeSlug] ?? null;
  }, [activeSlug, zones]);

  return (
    <section className="parchment-panel p-4">
      <h2 className="mb-3 font-serif text-2xl text-teal-100">Mapa Interactivo</h2>
      <div className="relative overflow-hidden rounded-lg border border-slate-700/60">
        <img alt="Mapa de campaña" className="h-auto w-full" src={svgPath} />

        {hotspots.map((spot) => (
          <button
            aria-label={`Abrir lore de ${spot.label}`}
            className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-300/70 bg-teal-500/80 p-2 shadow-lg shadow-teal-900/50 transition hover:scale-110 hover:bg-teal-400"
            key={`${spot.slug}-${spot.x}-${spot.y}`}
            onClick={() => setActiveSlug(spot.slug)}
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
            type="button"
          >
            <span className="block h-2 w-2 rounded-full bg-slate-900" />
            <span className="pointer-events-none absolute left-1/2 top-[130%] hidden -translate-x-1/2 rounded-md bg-slate-950/90 px-2 py-1 text-xs text-slate-100 group-hover:block">
              {spot.label}
            </span>
          </button>
        ))}
      </div>

      {activeZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-slate-700 bg-slate-900 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-2xl text-purple-200">{activeZone.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{activeZone.summary}</p>
              </div>
              <button
                className="rounded-md border border-slate-600 px-3 py-1 text-sm text-slate-200"
                onClick={() => setActiveSlug(null)}
                type="button"
              >
                Cerrar
              </button>
            </div>

            {activeZone.preview && (
              <p className="mt-4 rounded-md border border-purple-900/40 bg-slate-950/70 p-3 text-sm leading-relaxed text-slate-200">
                {activeZone.preview}
              </p>
            )}

            <a
              className="mt-4 inline-flex rounded-md border border-purple-500/60 bg-purple-700/30 px-3 py-2 text-sm font-semibold text-purple-100 hover:bg-purple-700/50"
              href={`/lore/${activeZone.slug}/`}
            >
              Ver entrada completa de lore
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
