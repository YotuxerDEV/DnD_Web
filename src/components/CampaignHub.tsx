import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import CampaignDashboard from "./CampaignDashboard";
import CampaignEconomyManager from "./CampaignEconomyManager";
import LoreManager from "./LoreManager";
import PersonajesManager from "./PersonajesManager";

type Campaign = {
  id: string;
  name: string;
  summary: string;
  access_word?: string | null;
};

function getCampaignIdFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") ?? "";
}

export default function CampaignHub() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlockValue, setUnlockValue] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  function storageKey(campaignId: string): string {
    return `campaign-unlock-${campaignId}`;
  }

  function hasAccessWordColumnError(message: string): boolean {
    const lower = message.toLowerCase();
    return lower.includes("access_word") && (lower.includes("column") || lower.includes("schema cache"));
  }

  useEffect(() => {
    async function loadCampaign() {
      const id = getCampaignIdFromUrl();
      if (!id) {
        setError("Falta el identificador de la campaña en la URL.");
        setLoading(false);
        return;
      }

      let data: Campaign | null = null;
      let queryError: { message: string } | null = null;

      const withWord = await supabase
        .from("campaigns")
        .select("id, name, summary, access_word")
        .eq("id", id)
        .maybeSingle();

      if (withWord.error && hasAccessWordColumnError(withWord.error.message)) {
        const withoutWord = await supabase
          .from("campaigns")
          .select("id, name, summary")
          .eq("id", id)
          .maybeSingle();

        data = (withoutWord.data as Campaign | null) ?? null;
        queryError = withoutWord.error ? { message: withoutWord.error.message } : null;
      } else {
        data = (withWord.data as Campaign | null) ?? null;
        queryError = withWord.error ? { message: withWord.error.message } : null;
      }

      if (queryError) {
        setError(queryError.message);
      } else if (!data) {
        setError("No se encontró la campaña solicitada.");
      } else {
        setCampaign(data as Campaign);
        const neededWord = (data.access_word ?? "").trim();
        const alreadyUnlocked =
          typeof window !== "undefined" && sessionStorage.getItem(storageKey(data.id)) === "ok";
        setUnlocked(!neededWord || alreadyUnlocked);
      }

      setLoading(false);
    }

    loadCampaign();
  }, []);

  if (loading) {
    return <section className="parchment-panel p-6 text-sm text-slate-400">Cargando campaña...</section>;
  }

  if (error || !campaign) {
    return (
      <section className="parchment-panel p-6">
        <p className="text-sm text-rose-300">{error ?? "Campaña no disponible."}</p>
        <a href="/campanas/" className="mt-4 inline-block text-sm text-teal-300 hover:text-teal-200">
          Volver a campañas
        </a>
      </section>
    );
  }

  const needsWord = Boolean((campaign.access_word ?? "").trim());

  function handleUnlock() {
    if (!campaign) {
      return;
    }

    const expected = (campaign.access_word ?? "").trim();
    if (!expected) {
      setUnlocked(true);
      return;
    }

    if (unlockValue.trim() === expected) {
      setUnlockError(null);
      setUnlocked(true);
      sessionStorage.setItem(storageKey(campaign.id), "ok");
      return;
    }

    setUnlockError("La palabra no coincide. Inténtalo de nuevo.");
  }

  return (
    <section className="space-y-6">
      {needsWord && !unlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700/80 bg-slate-900 p-6 shadow-2xl shadow-purple-950/50">
            <p className="text-xs font-semibold uppercase tracking-widest text-purple-300/70">Acceso restringido</p>
            <h2 className="mt-2 font-display text-3xl text-purple-100">{campaign.name}</h2>
            <p className="mt-2 text-sm text-slate-400">
              Esta campaña está protegida. Introduce la palabra de acceso para continuar.
            </p>

            <div className="mt-5 space-y-3">
              <input
                autoFocus
                type="text"
                value={unlockValue}
                onChange={(event) => setUnlockValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleUnlock();
                  }
                }}
                className="ui-input"
                placeholder="Palabra de acceso"
              />

              {unlockError && (
                <p className="rounded-md border border-rose-500/35 bg-rose-950/35 px-3 py-2 text-sm text-rose-300">
                  {unlockError}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleUnlock} className="ui-btn">
                  Desbloquear campaña
                </button>
                <a href="/campanas/" className="ui-btn ui-btn-secondary">
                  Volver
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="parchment-panel p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-purple-300/70">Campaña activa</p>
        <h1 className="mt-2 font-display text-4xl text-purple-100">{campaign.name}</h1>
        <p className="mt-2 max-w-3xl text-slate-300">{campaign.summary || "Sin resumen todavía."}</p>
      </div>

      <CampaignDashboard campaignId={campaign.id} campaignName={campaign.name} />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="parchment-panel p-6">
          <LoreManager campaignId={campaign.id} campaignName={campaign.name} />
        </div>
        <div className="parchment-panel p-6">
          <PersonajesManager campaignId={campaign.id} campaignName={campaign.name} />
        </div>
      </div>

      <CampaignEconomyManager campaignId={campaign.id} />
    </section>
  );
}
