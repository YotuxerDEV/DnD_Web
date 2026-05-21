import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type LoreManagerProps = {
  campaignId?: string;
  campaignName?: string;
};

type LoreEntry = {
  id: string;
  campaign_id?: string | null;
  title: string;
  region: string;
  summary: string;
  content: string;
  tags: string[];
  created_at: string;
};

function getCampaignIdFromUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("campaign") ?? "";
}

export default function LoreManager({ campaignId, campaignName }: LoreManagerProps) {
  const [entries, setEntries] = useState<LoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolvedCampaignId, setResolvedCampaignId] = useState(campaignId ?? "");

  // Form state
  const [title, setTitle] = useState("");
  const [region, setRegion] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    setResolvedCampaignId(campaignId ?? getCampaignIdFromUrl());
  }, [campaignId]);

  async function loadEntries() {
    let query = supabase.from("lore_entries").select("*").order("created_at", { ascending: false });

    if (resolvedCampaignId) {
      query = query.eq("campaign_id", resolvedCampaignId);
    }

    const { data, error: err } = await query;

    if (err) {
      setError(err.message);
    } else {
      setEntries(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadEntries();

    const channel = supabase
      .channel("lore-entries-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "lore_entries" }, () =>
        loadEntries(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedCampaignId]);

  function openModal() {
    setError(null);
    setTitle("");
    setRegion("");
    setSummary("");
    setContent("");
    setTags("");
    setShowModal(true);
  }

  async function handleCreate() {
    setError(null);
    if (!title.trim() || !region.trim() || !summary.trim()) {
      setError("Título, región y resumen son obligatorios.");
      return;
    }
    setSaving(true);
    const { error: saveErr } = await supabase.from("lore_entries").insert({
      ...(resolvedCampaignId ? { campaign_id: resolvedCampaignId } : {}),
      title: title.trim(),
      region: region.trim(),
      summary: summary.trim(),
      content: content.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });

    if (saveErr) {
      setError(saveErr.message);
    } else {
      setShowModal(false);
    }
    setSaving(false);
  }

  async function handleDeleteLore(entryId: string) {
    const confirmed = window.confirm("¿Seguro que quieres eliminar esta crónica de lore?");
    if (!confirmed) {
      return;
    }

    setError(null);
    setDeletingId(entryId);

    const { error: deleteError } = await supabase
      .from("lore_entries")
      .delete()
      .eq("id", entryId);

    if (deleteError) {
      setError(deleteError.message);
    }

    setDeletingId(null);
  }

  return (
    <section className="space-y-4 animate-fadein">
      {/* Section header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-900/30 pb-4">
        <div>
          <h2 className="font-display text-2xl text-teal-100">Crónicas de Campaña</h2>
          <p className="text-xs text-slate-400">
            {campaignName ? `Lore de ${campaignName}` : "Lore registrado durante la aventura"}
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 rounded-lg border border-teal-500/40 bg-teal-900/30 px-4 py-2 text-sm font-semibold text-teal-200 transition hover:border-teal-400/60 hover:bg-teal-800/40"
        >
          <span>+</span> Nueva Crónica
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-800 border-t-teal-400" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-slate-700/40 bg-slate-900/30 py-12 text-center">
          <p className="mb-2 text-3xl">📜</p>
          <p className="text-sm text-slate-400">
            {campaignName
              ? `Aún no hay crónicas registradas para ${campaignName}.`
              : "Aún no hay crónicas registradas."}
          </p>
          <button
            onClick={openModal}
            className="mt-4 rounded-lg border border-teal-500/40 bg-teal-900/30 px-4 py-2 text-sm text-teal-200 transition hover:bg-teal-800/40"
          >
            + Añadir primera crónica
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className="ui-card group p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-300/70">
                {entry.region}
              </p>
              <h3 className="mt-1 font-display text-lg text-purple-100">{entry.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-300">{entry.summary}</p>

              {entry.content && (
                <>
                  <button
                    onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                    className="mt-3 text-xs text-teal-300/60 transition hover:text-teal-200"
                  >
                    {expanded === entry.id ? "▲ Ocultar" : "▼ Leer más"}
                  </button>
                  {expanded === entry.id && (
                    <p className="mt-2 whitespace-pre-wrap rounded-md border border-slate-700/40 bg-slate-950/60 p-3 text-sm leading-relaxed text-slate-200">
                      {entry.content}
                    </p>
                  )}
                </>
              )}

              {entry.tags && entry.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-purple-900/50 px-2 py-0.5 text-xs text-purple-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDeleteLore(entry.id)}
                  disabled={deletingId === entry.id}
                  className="ui-btn ui-btn-danger"
                >
                  {deletingId === entry.id ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal nueva crónica */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="my-8 w-full max-w-2xl rounded-xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-purple-950/50 animate-fadein">
            <div className="flex items-start justify-between border-b border-slate-700/60 px-6 py-6 sm:px-8">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-purple-100">Nueva Crónica</h2>
                <p className="mt-2 text-sm sm:text-base text-slate-400">Registra un nuevo fragmento del mundo.</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 px-6 py-6 sm:px-8">
              <div>
                <label className="mb-2 block text-sm sm:text-base font-semibold text-slate-300">
                  Título <span className="text-rose-400">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nombre del lugar o evento"
                  className="w-full rounded-lg border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base sm:text-lg text-slate-100 placeholder:text-slate-600 focus:border-teal-500/60 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Región <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="Ej: Norte de Aetheria"
                    className="w-full rounded-lg border border-slate-700/60 bg-slate-950/60 px-4 py-2.5 text-slate-100 placeholder:text-slate-600 focus:border-teal-500/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Etiquetas (separadas por coma)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="magia, ruinas, peligro"
                    className="w-full rounded-lg border border-slate-700/60 bg-slate-950/60 px-4 py-2.5 text-slate-100 placeholder:text-slate-600 focus:border-teal-500/60 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Resumen <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Una descripción breve..."
                  className="w-full resize-none rounded-lg border border-slate-700/60 bg-slate-950/60 px-4 py-2.5 text-slate-100 placeholder:text-slate-600 focus:border-teal-500/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Contenido</label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="El texto completo de la entrada de lore..."
                  className="w-full resize-y rounded-lg border border-slate-700/60 bg-slate-950/60 px-4 py-2.5 text-slate-100 placeholder:text-slate-600 focus:border-teal-500/60 focus:outline-none"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
                  {error}
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-700/60 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-slate-600/60 bg-slate-800/30 px-6 py-3 text-sm sm:text-base font-semibold text-slate-300 transition hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="rounded-lg bg-gradient-to-b from-teal-600 to-teal-700 px-6 py-3 text-sm sm:text-base font-semibold text-teal-50 shadow-lg shadow-teal-900/50 transition hover:from-teal-500 hover:to-teal-600 disabled:opacity-60"
              >
                {saving ? "Guardando…" : "✦ Añadir al Archivo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
