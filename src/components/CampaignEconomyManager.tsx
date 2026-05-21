import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type CampaignEconomyManagerProps = {
  campaignId: string;
};

type TreasuryItem = {
  id: string;
  name: string;
  qty: number;
  value: number;
  notes: string;
};

type TreasuryRow = {
  campaign_id: string;
  items: TreasuryItem[];
};

function normalizeItems(value: unknown): TreasuryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): TreasuryItem | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const data = item as Record<string, unknown>;
      const id = String(data.id ?? "");
      const name = String(data.name ?? "").trim();
      if (!id || !name) {
        return null;
      }

      return {
        id,
        name,
        qty: Math.max(1, Number(data.qty ?? 1)),
        value: Math.max(0, Number(data.value ?? 0)),
        notes: String(data.notes ?? ""),
      };
    })
    .filter((item): item is TreasuryItem => Boolean(item));
}

function isMissingTableError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("campaign_treasury") && (lower.includes("does not exist") || lower.includes("relation"));
}

export default function CampaignEconomyManager({ campaignId }: CampaignEconomyManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<TreasuryItem[]>([]);

  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemValue, setItemValue] = useState("0");
  const [itemNotes, setItemNotes] = useState("");

  async function loadTreasury() {
    const { data, error: queryError } = await supabase
      .from("campaign_treasury")
      .select("campaign_id, items")
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (queryError) {
      if (isMissingTableError(queryError.message)) {
        setError("Falta la tabla de tesoro compartido. Ejecuta db/migrations/006_campaign_treasury.sql en Supabase.");
      } else {
        setError(queryError.message);
      }
      setLoading(false);
      return;
    }

    if (!data) {
      setItems([]);
      setLoading(false);
      return;
    }

    const row = data as TreasuryRow;
    setItems(normalizeItems(row.items));
    setLoading(false);
  }

  useEffect(() => {
    loadTreasury();

    const channel = supabase
      .channel(`campaign-treasury-${campaignId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaign_treasury", filter: `campaign_id=eq.${campaignId}` },
        () => loadTreasury(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  function handleAddItem() {
    if (!itemName.trim()) {
      setError("Debes indicar nombre para el objeto compartido.");
      return;
    }

    const next: TreasuryItem = {
      id: `treasure-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: itemName.trim(),
      qty: Math.max(1, Number(itemQty || 1)),
      value: Math.max(0, Number(itemValue || 0)),
      notes: itemNotes.trim(),
    };

    setItems((prev) => [...prev, next]);
    setItemName("");
    setItemQty("1");
    setItemValue("0");
    setItemNotes("");
    setError(null);
  }

  function handleRemoveItem(itemId: string) {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const payload = {
      campaign_id: campaignId,
      items,
    };

    const { error: saveError } = await supabase
      .from("campaign_treasury")
      .upsert(payload, { onConflict: "campaign_id" });

    if (saveError) {
      if (isMissingTableError(saveError.message)) {
        setError("Falta la tabla de tesoro compartido. Ejecuta db/migrations/006_campaign_treasury.sql en Supabase.");
      } else {
        setError(saveError.message);
      }
    }

    setSaving(false);
  }

  return (
    <section className="parchment-panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-2xl text-amber-100">Tesoro compartido</h2>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando tesoro...</p>
      ) : (
        <>
          <div className="rounded-md border border-slate-700/60 bg-slate-950/35 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Añadir objeto común</p>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                type="text"
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                className="ui-input"
                placeholder="Nombre del objeto"
              />
              <input
                type="number"
                min={1}
                value={itemQty}
                onChange={(event) => setItemQty(event.target.value)}
                className="ui-input"
                placeholder="Cantidad"
              />
              <input
                type="number"
                min={0}
                value={itemValue}
                onChange={(event) => setItemValue(event.target.value)}
                className="ui-input"
                placeholder="Valor (PO)"
              />
              <input
                type="text"
                value={itemNotes}
                onChange={(event) => setItemNotes(event.target.value)}
                className="ui-input"
                placeholder="Notas"
              />
            </div>
            <button type="button" onClick={handleAddItem} className="ui-btn mt-3">
              Añadir objeto
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {items.length === 0 ? (
              <p className="text-sm text-slate-400">No hay objetos compartidos todavía.</p>
            ) : (
              items.map((item) => (
                <article key={item.id} className="rounded-md border border-slate-700/60 bg-slate-950/40 px-3 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{item.name}</p>
                      <p className="text-xs text-slate-400">
                        x{item.qty} · {item.value} PO · {item.notes || "Sin notas"}
                      </p>
                    </div>
                    <button type="button" onClick={() => handleRemoveItem(item.id)} className="ui-btn ui-btn-danger">
                      Quitar
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

          <button type="button" onClick={handleSave} disabled={saving} className="ui-btn mt-4">
            {saving ? "Guardando..." : "Guardar tesoro"}
          </button>
        </>
      )}
    </section>
  );
}
