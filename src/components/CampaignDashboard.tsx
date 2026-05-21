import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type CampaignDashboardProps = {
  campaignId: string;
  campaignName: string;
};

type CharacterRow = {
  id: string;
  nombre: string;
  level: number;
  current_hp: number;
  gold?: number;
  class_resources?: unknown;
};

type DashboardData = {
  characters: CharacterRow[];
  loreCount: number;
  totalCharacterGold: number;
};

function isMissingColumnError(message: string, column: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes(column.toLowerCase()) && (lower.includes("column") || lower.includes("schema cache"));
}

function getExhaustedResourcesCount(resources: unknown): number {
  if (!Array.isArray(resources)) {
    return 0;
  }

  return resources.filter((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const data = item as Record<string, unknown>;
    const max = Math.max(0, Number(data.max ?? 0));
    const used = Math.max(0, Number(data.used ?? 0));
    return max > 0 && used >= max;
  }).length;
}

export default function CampaignDashboard({ campaignId, campaignName }: CampaignDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({
    characters: [],
    loreCount: 0,
    totalCharacterGold: 0,
  });

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError(null);

      let characters: CharacterRow[] = [];
      let loreCount = 0;
      let totalCharacterGold = 0;

      const charactersWithResources = await supabase
        .from("personajes")
        .select("id, nombre, level, current_hp, gold, class_resources")
        .eq("campaign_id", campaignId);

      if (charactersWithResources.error && (
        isMissingColumnError(charactersWithResources.error.message, "class_resources") ||
        isMissingColumnError(charactersWithResources.error.message, "gold")
      )) {
        const fallbackCharacters = await supabase
          .from("personajes")
          .select("id, nombre, level, current_hp")
          .eq("campaign_id", campaignId);

        if (fallbackCharacters.error) {
          setError(fallbackCharacters.error.message);
          setLoading(false);
          return;
        }

        characters = ((fallbackCharacters.data ?? []) as CharacterRow[]).map((row) => ({
          ...row,
          gold: 0,
          class_resources: [],
        }));
      } else if (charactersWithResources.error) {
        setError(charactersWithResources.error.message);
        setLoading(false);
        return;
      } else {
        characters = (charactersWithResources.data ?? []) as CharacterRow[];
      }

      const loreQuery = await supabase
        .from("lore_entries")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId);

      if (!loreQuery.error) {
        loreCount = loreQuery.count ?? 0;
      }

      totalCharacterGold = characters.reduce(
        (sum, character) => sum + Math.max(0, Number(character.gold ?? 0)),
        0,
      );

      setData({ characters, loreCount, totalCharacterGold });
      setLoading(false);
    }

    loadDashboard();

    const channel = supabase
      .channel(`campaign-dashboard-${campaignId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "personajes", filter: `campaign_id=eq.${campaignId}` }, () => loadDashboard())
      .on("postgres_changes", { event: "*", schema: "public", table: "lore_entries", filter: `campaign_id=eq.${campaignId}` }, () => loadDashboard())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  const averageLevel = useMemo(() => {
    if (data.characters.length === 0) {
      return 0;
    }

    const sum = data.characters.reduce((total, character) => total + Math.max(1, Number(character.level ?? 1)), 0);
    return Math.round((sum / data.characters.length) * 10) / 10;
  }, [data.characters]);

  const exhaustedResources = useMemo(() => {
    return data.characters.filter((character) => getExhaustedResourcesCount(character.class_resources) > 0);
  }, [data.characters]);

  if (loading) {
    return <section className="parchment-panel p-4 text-sm text-slate-400">Cargando dashboard de campaña...</section>;
  }

  if (error) {
    return (
      <section className="parchment-panel p-4">
        <p className="text-sm text-rose-300">{error}</p>
      </section>
    );
  }

  return (
    <section className="parchment-panel p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-2xl text-teal-100">Panel de campaña</h2>
        <p className="text-xs uppercase tracking-widest text-slate-400">{campaignName}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="ui-card p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Aventureros</p>
          <p className="mt-1 text-2xl font-semibold text-purple-100">{data.characters.length}</p>
        </article>
        <article className="ui-card p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Crónicas</p>
          <p className="mt-1 text-2xl font-semibold text-teal-100">{data.loreCount}</p>
        </article>
        <article className="ui-card p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Nivel medio</p>
          <p className="mt-1 text-2xl font-semibold text-cyan-100">{averageLevel.toFixed(1)}</p>
        </article>
        <article className="ui-card p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Oro total personajes (PO)</p>
          <p className="mt-1 text-2xl font-semibold text-amber-100">{data.totalCharacterGold}</p>
        </article>
      </div>

      <div className="mt-4 rounded-md border border-slate-700/60 bg-slate-950/40 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-400">Recursos agotados</p>
        {exhaustedResources.length === 0 ? (
          <p className="mt-1 text-sm text-slate-300">Nadie tiene recursos de clase agotados.</p>
        ) : (
          <ul className="mt-1 space-y-1 text-sm text-amber-100">
            {exhaustedResources.map((character) => (
              <li key={character.id}>{character.nombre}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
