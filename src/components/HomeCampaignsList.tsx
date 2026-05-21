import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Campaign = {
  id: string;
  name: string;
  summary: string;
};

export default function HomeCampaignsList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCampaigns() {
      const { data, error: queryError } = await supabase
        .from("campaigns")
        .select("id, name, summary")
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

    loadCampaigns();

    const channel = supabase
      .channel("home-campaigns")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () => {
        loadCampaigns();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-400">Cargando campañas disponibles...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-300">{error}</p>;
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-6 text-center">
        <p className="text-slate-300">No hay campañas disponibles.</p>
        <a
          href="/campanas/"
          className="mt-4 inline-block rounded-md border border-purple-500/40 bg-purple-900/30 px-4 py-2 text-sm font-semibold text-purple-200 transition hover:bg-purple-800/40"
        >
          Crear campaña
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {campaigns.map((campaign) => (
        <article
          key={campaign.id}
          className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-5 transition hover:border-teal-500/50 hover:bg-slate-800/60"
        >
          <h2 className="font-display text-2xl text-teal-100">{campaign.name}</h2>
          <p className="mt-2 min-h-[3rem] text-sm text-slate-300">
            {campaign.summary || "Sin resumen todavía."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`/campana/?id=${encodeURIComponent(campaign.id)}`}
              className="rounded-md border border-teal-500/40 bg-teal-900/30 px-3 py-2 text-sm font-semibold text-teal-200 transition hover:bg-teal-800/40"
            >
              Abrir campaña
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
