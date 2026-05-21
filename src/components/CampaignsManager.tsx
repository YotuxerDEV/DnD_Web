import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Campaign = {
  id: string;
  name: string;
  summary: string;
  created_at: string;
};

export default function CampaignsManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [accessWord, setAccessWord] = useState("");

  async function loadCampaigns() {
    const { data, error: queryError } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setCampaigns([]);
    } else {
      setError(null);
      setCampaigns((data ?? []) as Campaign[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCampaigns();

    const channel = supabase
      .channel("campaigns-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () =>
        loadCampaigns(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleCreate() {
    setError(null);
    if (!name.trim()) {
      setError("El nombre de la campaña es obligatorio.");
      return;
    }

    setSaving(true);
    const { error: saveError } = await supabase.from("campaigns").insert({
      name: name.trim(),
      summary: summary.trim(),
      access_word: accessWord.trim() || null,
    });

    if (saveError) {
      setError(saveError.message);
    } else {
      setShowModal(false);
      setName("");
      setSummary("");
      setAccessWord("");
    }

    setSaving(false);
  }

  async function handleDeleteCampaign(campaignId: string) {
    const confirmed = window.confirm(
      "¿Eliminar esta campaña? También se eliminarán sus personajes y entradas de lore.",
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setDeletingId(campaignId);

    const { error: loreDeleteError } = await supabase
      .from("lore_entries")
      .delete()
      .eq("campaign_id", campaignId);

    if (loreDeleteError) {
      setError(loreDeleteError.message);
      setDeletingId(null);
      return;
    }

    const { error: characterDeleteError } = await supabase
      .from("personajes")
      .delete()
      .eq("campaign_id", campaignId);

    if (characterDeleteError) {
      setError(characterDeleteError.message);
      setDeletingId(null);
      return;
    }

    const { error: campaignDeleteError } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaignId);

    if (campaignDeleteError) {
      setError(campaignDeleteError.message);
    }

    setDeletingId(null);
  }

  if (loading) {
    return <div className="py-12 text-sm text-slate-400">Cargando campañas...</div>;
  }

  return (
    <section className="space-y-6 animate-fadein">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-purple-900/30 pb-5">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-wide text-purple-100">
            Campañas
          </h1>
          <p className="mt-1 text-slate-400">
            Organiza personajes y lore dentro de cada campaña.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-lg border border-purple-500/50 bg-purple-800/40 px-5 py-2.5 text-sm font-semibold text-purple-100 transition hover:bg-purple-800/60"
        >
          Nueva campaña
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="parchment-panel py-16 text-center text-slate-400">
          No hay campañas todavía. Crea la primera para empezar a separar el contenido.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => (
            <article
              key={campaign.id}
              className="ui-card p-5"
            >
              <h2 className="font-display text-2xl text-teal-100">{campaign.name}</h2>
              <p className="mt-2 min-h-[3rem] text-sm text-slate-300">
                {campaign.summary || "Sin resumen todavía."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`/campana/?id=${encodeURIComponent(campaign.id)}`}
                  className="ui-btn"
                >
                  Abrir campaña
                </a>
                <a
                  href={`/personajes/?campaign=${encodeURIComponent(campaign.id)}`}
                  className="ui-btn ui-btn-secondary"
                >
                  Personajes
                </a>
                <a
                  href={`/lore/?campaign=${encodeURIComponent(campaign.id)}`}
                  className="ui-btn"
                >
                  Lore
                </a>
                <button
                  type="button"
                  onClick={() => handleDeleteCampaign(campaign.id)}
                  disabled={deletingId === campaign.id}
                  className="ui-btn ui-btn-danger"
                >
                  {deletingId === campaign.id ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowModal(false);
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-purple-950/50 animate-fadein">
            <div className="border-b border-slate-700/60 px-6 py-6 sm:px-8">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-purple-100">Nueva Campaña</h2>
              <p className="mt-2 text-sm sm:text-base text-slate-400">Crea el contenedor para su lore y personajes.</p>
            </div>
            <div className="space-y-5 px-6 py-6 sm:px-8">
              <div>
                <label className="mb-2 block text-sm sm:text-base font-semibold text-slate-300">Nombre <span className="text-rose-400">*</span></label>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base sm:text-lg text-slate-100 placeholder:text-slate-600 focus:border-teal-500/60 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
                  placeholder="Ej: La Guarida del Dragón"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm sm:text-base font-semibold text-slate-300">Resumen</label>
                <textarea
                  rows={5}
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  className="w-full rounded-lg border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base sm:text-lg text-slate-100 placeholder:text-slate-600 focus:border-teal-500/60 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
                  placeholder="Describe brevemente tu campaña..."
                />
              </div>
              <div>
                <label className="mb-2 block text-sm sm:text-base font-semibold text-slate-300">Palabra de acceso (opcional)</label>
                <input
                  type="text"
                  value={accessWord}
                  onChange={(event) => setAccessWord(event.target.value)}
                  className="w-full rounded-lg border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base sm:text-lg text-slate-100 placeholder:text-slate-600 focus:border-teal-500/60 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
                  placeholder="Ej: Hydra2026"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Si la defines, al abrir la campaña se pedirá esta palabra en un popup.
                </p>
              </div>
              {error && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
                  {error}
                </div>
              )}
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-700/60 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-slate-600/60 bg-slate-800/30 px-6 py-3 text-sm sm:text-base font-semibold text-slate-300 transition hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="rounded-lg bg-gradient-to-b from-teal-600 to-teal-700 px-6 py-3 text-sm sm:text-base font-semibold text-teal-50 shadow-lg shadow-teal-900/50 transition hover:from-teal-500 hover:to-teal-600 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "✦ Crear Campaña"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
