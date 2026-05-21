import { useEffect, useState } from "react";
import { getDefaultClassResources } from "../lib/classResources";
import { RACES_CONFIG } from "../lib/races";
import { supabase } from "../lib/supabase";

type PersonajesManagerProps = {
  campaignId?: string;
  campaignName?: string;
};

type CampaignOption = {
  id: string;
  name: string;
};

type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";
type Abilities = Record<AbilityKey, number>;
type SavingThrows = Record<AbilityKey, boolean>;
type ArmorProfile = {
  name: string;
  baseAc: number;
  maxDexMod: number | null;
  bonus: number;
};
type SpellCard = {
  id: string;
  name: string;
  level: string;
  school: string;
  castingTime: string;
  range: string;
  components: string[];
  duration: string;
  description: string;
  ritual: boolean;
};

type CharacterSheet = {
  id: string;
  campaignId?: string | null;
  nombre: string;
  clase: string;
  raceKey: string;
  level: number;
  abilities: Abilities;
  hitRolls: number[];
  feats: string[];
  historyBlog: string;
  skillProficiencies: string[];
  inventoryItems: Array<{ id: string; name: string; qty: number; weight: number; notes: string }>;
  gold: number;
  spellSlots: Record<string, { max: number; used: number }>;
  spellsByLevel: Record<string, SpellCard[]>;
  actionFeatures: { actions: string[]; bonusActions: string[]; reactions: string[] };
  currentHp: number;
  temporaryHp: number;
  savingThrows: SavingThrows;
  armor: ArmorProfile;
};

const RAZAS = RACES_CONFIG;

const CLASES = [
  { value: "barbarian", label: "Bárbaro" },
  { value: "fighter", label: "Guerrero" },
  { value: "paladin", label: "Paladín" },
  { value: "ranger", label: "Explorador" },
  { value: "rogue", label: "Pícaro" },
  { value: "bard", label: "Bardo" },
  { value: "cleric", label: "Clérigo" },
  { value: "druid", label: "Druida" },
  { value: "monk", label: "Monje" },
  { value: "warlock", label: "Brujo" },
  { value: "sorcerer", label: "Hechicero" },
  { value: "wizard", label: "Mago" },
];

const CLASS_LABEL_BY_VALUE = Object.fromEntries(CLASES.map((clase) => [clase.value, clase.label]));

const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];
const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: "FUE",
  dex: "DES",
  con: "CON",
  int: "INT",
  wis: "SAB",
  cha: "CAR",
};

const DEFAULT_ABILITIES: Abilities = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
};

function getClassVisual(clase: string): {
  icon: string;
  accentClass: string;
  badgeClass: string;
} {
  switch (clase) {
    case "barbarian":
      return {
        icon: "🪓",
        accentClass: "border-rose-500/35 bg-gradient-to-br from-rose-950/35 to-slate-900/70",
        badgeClass: "border-rose-500/35 bg-rose-900/25 text-rose-100",
      };
    case "wizard":
    case "sorcerer":
    case "warlock":
      return {
        icon: "✨",
        accentClass: "border-violet-500/35 bg-gradient-to-br from-violet-950/35 to-slate-900/70",
        badgeClass: "border-violet-500/35 bg-violet-900/25 text-violet-100",
      };
    case "paladin":
    case "cleric":
      return {
        icon: "🛡️",
        accentClass: "border-amber-500/35 bg-gradient-to-br from-amber-950/30 to-slate-900/70",
        badgeClass: "border-amber-500/35 bg-amber-900/20 text-amber-100",
      };
    case "rogue":
    case "ranger":
      return {
        icon: "🏹",
        accentClass: "border-emerald-500/35 bg-gradient-to-br from-emerald-950/30 to-slate-900/70",
        badgeClass: "border-emerald-500/35 bg-emerald-900/20 text-emerald-100",
      };
    case "monk":
      return {
        icon: "🥋",
        accentClass: "border-sky-500/35 bg-gradient-to-br from-sky-950/35 to-slate-900/70",
        badgeClass: "border-sky-500/35 bg-sky-900/20 text-sky-100",
      };
    default:
      return {
        icon: "⚔️",
        accentClass: "border-teal-500/35 bg-gradient-to-br from-teal-950/30 to-slate-900/70",
        badgeClass: "border-teal-500/35 bg-teal-900/20 text-teal-100",
      };
  }
}

function getAbilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

function getFinalAbilityScore(
  pj: CharacterSheet,
  ability: AbilityKey,
): number {
  const raceBonus =
    RAZAS[pj.raceKey as keyof typeof RAZAS]?.statBonuses?.[ability] ?? 0;
  return (pj.abilities[ability] ?? 10) + raceBonus;
}

function getArmorClass(pj: CharacterSheet): number {
  // Brynja usa su propia defensa natural: 12 + modificador de CON.
  if (pj.raceKey === "brynja") {
    const conMod = getAbilityMod(getFinalAbilityScore(pj, "con"));
    return Math.max(1, 12 + conMod + (pj.armor.bonus ?? 0));
  }

  const dexMod = getAbilityMod(getFinalAbilityScore(pj, "dex"));
  const dexContribution =
    pj.armor.maxDexMod === null ? dexMod : Math.min(dexMod, pj.armor.maxDexMod);
  return Math.max(1, pj.armor.baseAc + dexContribution + pj.armor.bonus);
}

function getInitiative(pj: CharacterSheet): number {
  return Math.max(0, getAbilityMod(pj.abilities.dex ?? 10));
}

type MovementProfile = {
  walk: number;
  swim?: number;
  fly?: number;
};

function getMovementProfile(raceKey: string): MovementProfile {
  const race = RAZAS[raceKey as keyof typeof RAZAS];

  const explicitByRace: Record<string, MovementProfile> = {
    elfo_bosque: { walk: 35 },
    escualo_martillo: { walk: 30, swim: 40 },
    escualo_tigre: { walk: 30, swim: 40 },
    escualo_toro: { walk: 30, swim: 40 },
    fiskanir_ballenido: { walk: 25, swim: 40 },
    fiskanir_orka: { walk: 30, swim: 40 },
    sporr_colosus: { walk: 25 },
  };

  const baseWalk = raceKey.startsWith("enano") || raceKey.startsWith("halfling") || raceKey.startsWith("gnomo")
    ? 25
    : 30;

  const explicit = explicitByRace[raceKey];
  if (explicit) {
    return explicit;
  }

  const traitText = (race?.traits ?? [])
    .map((trait) => `${trait.name} ${trait.description}`.toLowerCase())
    .join(" ");

  const hasSwim = /habitante del mar|nadar|acuatic|anfibi|swim/.test(traitText);
  const hasFly = /volar|vuelo|alas|fly/.test(traitText);

  return {
    walk: baseWalk,
    ...(hasSwim ? { swim: baseWalk } : {}),
    ...(hasFly ? { fly: baseWalk } : {}),
  };
}

function getDefaultSpellRecord(): Record<string, SpellCard[]> {
  return { "0": [], "1": [], "2": [], "3": [], "4": [], "5": [], "6": [], "7": [], "8": [], "9": [] };
}

function buildRacialSpells(raceKey: string): Record<string, SpellCard[]> {
  const race = RAZAS[raceKey as keyof typeof RAZAS];
  const result = getDefaultSpellRecord();

  if (!race?.startingSpells?.length) {
    return result;
  }

  for (const spell of race.startingSpells) {
    const level = String(spell.level ?? "0");
    if (!Array.isArray(result[level])) {
      result[level] = [];
    }

    result[level].push({
      id: `spell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: spell.name,
      level,
      school: spell.school,
      castingTime: spell.castingTime,
      range: spell.range,
      components: spell.components ?? [],
      duration: spell.duration,
      description: spell.description,
      ritual: Boolean(spell.ritual),
    });
  }

  return result;
}

function getCampaignIdFromUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("campaign") ?? "";
}

function formatPersonajesError(message: string): string {
  if (message.includes("Could not find the table 'public.personajes'")) {
    return (
      "La tabla public.personajes no existe en tu proyecto de Supabase. " +
      "Ejecuta el script SQL de inicializacion (db/schema.sql) en SQL Editor y recarga la pagina."
    );
  }
  if (message.toLowerCase().includes("column") && message.toLowerCase().includes("does not exist")) {
    return (
      "Tu tabla personajes está desactualizada y le faltan columnas nuevas. " +
      "Ejecuta db/schema.sql o las migraciones de db/migrations en Supabase SQL Editor."
    );
  }
  return message;
}

function parseMissingColumn(message: string): string | null {
  const pgMatch = message.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+of relation/i);
  if (pgMatch?.[1]) {
    return pgMatch[1];
  }

  const supabaseMatch = message.match(/Could not find the ['"]([a-zA-Z0-9_]+)['"] column/i);
  if (supabaseMatch?.[1]) {
    return supabaseMatch[1];
  }

  return null;
}

function mapRow(row: Record<string, unknown>): CharacterSheet {
  return {
    id: String(row.id),
    campaignId: row.campaign_id ? String(row.campaign_id) : null,
    nombre: String(row.nombre),
    clase: String(row.clase ?? "fighter"),
    raceKey: String(row.race_key ?? "humano"),
    level: Number(row.level ?? 1),
    abilities: (row.abilities as Abilities) ?? { ...DEFAULT_ABILITIES },
    hitRolls: (row.hit_rolls as number[]) ?? [],
    feats: (row.feats as string[]) ?? [],
    historyBlog: String(row.history_blog ?? ""),
    skillProficiencies: Array.isArray(row.skill_proficiencies)
      ? (row.skill_proficiencies as string[])
      : [],
    inventoryItems: Array.isArray(row.inventory_items)
      ? (row.inventory_items as Array<{ id: string; name: string; qty: number; weight: number; notes: string }>)
      : [],
    gold: Math.max(0, Number(row.gold ?? 0)),
    spellSlots:
      row.spell_slots && typeof row.spell_slots === "object"
        ? (row.spell_slots as Record<string, { max: number; used: number }>)
        : {
            "1": { max: 0, used: 0 },
            "2": { max: 0, used: 0 },
            "3": { max: 0, used: 0 },
            "4": { max: 0, used: 0 },
            "5": { max: 0, used: 0 },
            "6": { max: 0, used: 0 },
            "7": { max: 0, used: 0 },
            "8": { max: 0, used: 0 },
            "9": { max: 0, used: 0 },
          },
    spellsByLevel: (() => {
      const result: Record<string, SpellCard[]> = {
        "0": [], "1": [], "2": [], "3": [], "4": [], "5": [], "6": [], "7": [], "8": [], "9": []
      };
      if (row.spells_by_level && typeof row.spells_by_level === "object") {
        const source = row.spells_by_level as Record<string, unknown>;
        for (const level of Object.keys(result)) {
          if (Array.isArray(source[level])) {
            result[level] = source[level].map((spell: unknown) => {
              if (typeof spell === "object" && spell !== null) {
                const s = spell as Record<string, unknown>;
                return {
                  id: String(s.id ?? `spell-${Date.now()}-${Math.random()}`),
                  name: String(s.name ?? "Unknown"),
                  level: String(s.level ?? level),
                  school: String(s.school ?? "Evocation"),
                  castingTime: String(s.castingTime ?? "1 action"),
                  range: String(s.range ?? "Self"),
                  components: Array.isArray(s.components) ? s.components.map(String) : [],
                  duration: String(s.duration ?? "Instantaneous"),
                  description: String(s.description ?? ""),
                  ritual: Boolean(s.ritual),
                };
              }
              return {
                id: `spell-${Date.now()}-${Math.random()}`,
                name: String(spell),
                level: String(level),
                school: "Evocation",
                castingTime: "1 action",
                range: "Self",
                components: [],
                duration: "Instantaneous",
                description: "",
                ritual: false,
              };
            });
          }
        }
      }
      return result;
    })(),
    actionFeatures:
      row.action_features && typeof row.action_features === "object"
        ? (row.action_features as { actions: string[]; bonusActions: string[]; reactions: string[] })
        : { actions: [], bonusActions: [], reactions: [] },
    currentHp: Math.max(0, Number(row.current_hp ?? 0)),
    temporaryHp: Math.max(0, Number(row.temporary_hp ?? 0)),
    savingThrows: row.saving_throws && typeof row.saving_throws === "object"
      ? (row.saving_throws as SavingThrows)
      : { str: false, dex: false, con: false, int: false, wis: false, cha: false },
    armor: {
      name: String(row.armor_name ?? ""),
      baseAc: Math.max(1, Number(row.armor_base_ac ?? 10)),
      maxDexMod:
        row.armor_max_dex_mod === null || typeof row.armor_max_dex_mod === "undefined"
          ? null
          : Math.max(0, Number(row.armor_max_dex_mod)),
      bonus: Math.max(0, Number(row.armor_bonus ?? 0)),
    },
  };
}

export default function PersonajesManager({ campaignId, campaignName }: PersonajesManagerProps) {
  const [personajes, setPersonajes] = useState<CharacterSheet[]>([]);
  const [campaignOptions, setCampaignOptions] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [legacyNotice, setLegacyNotice] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resolvedCampaignId, setResolvedCampaignId] = useState(campaignId ?? "");
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaignId ?? "");

  // Form state
  const [nombre, setNombre] = useState("");
  const [clase, setClase] = useState("fighter");
  const [raceKey, setRaceKey] = useState("humano");
  const [abilities, setAbilities] = useState<Abilities>({ ...DEFAULT_ABILITIES });

  useEffect(() => {
    setResolvedCampaignId(campaignId ?? getCampaignIdFromUrl());
  }, [campaignId]);

  useEffect(() => {
    setSelectedCampaignId(campaignId ?? "");
  }, [campaignId]);

  useEffect(() => {
    async function loadCampaignOptions() {
      const { data, error: queryError } = await supabase
        .from("campaigns")
        .select("id, name")
        .order("created_at", { ascending: false });

      if (queryError) {
        return;
      }

      const rows = (data ?? []) as CampaignOption[];
      setCampaignOptions(rows);

      if (!campaignId && !selectedCampaignId && rows.length > 0) {
        setSelectedCampaignId(rows[0].id);
      }
    }

    loadCampaignOptions();
  }, [campaignId]);

  async function loadPersonajes() {
    let query = supabase.from("personajes").select("*").order("created_at", { ascending: true });
    setLegacyNotice(null);

    if (resolvedCampaignId) {
      query = query.eq("campaign_id", resolvedCampaignId);
    }

    let { data, error: err } = await query;

    if (err && resolvedCampaignId && /campaign_id|column/i.test(err.message)) {
      // Backward compatibility: if campaign_id does not exist yet, retry without filter.
      const fallback = await supabase
        .from("personajes")
        .select("*")
        .order("created_at", { ascending: true });
      data = fallback.data;
      err = fallback.error;
    }

    if (err) {
      setError(formatPersonajesError(err.message));
      setPersonajes([]);
    } else {
      let rows = (data ?? []) as Record<string, unknown>[];

      if (resolvedCampaignId && rows.length === 0) {
        const legacyQuery = await supabase
          .from("personajes")
          .select("*")
          .is("campaign_id", null)
          .order("created_at", { ascending: true });

        if (!legacyQuery.error && (legacyQuery.data?.length ?? 0) > 0) {
          rows = legacyQuery.data as Record<string, unknown>[];
          setLegacyNotice(
            "Mostrando personajes antiguos sin campaña asignada. Puedes asociarlos a esta campaña desde aquí.",
          );
        }
      }

      setError(null);
      setPersonajes(rows.map(mapRow));
    }
    setLoading(false);
  }

  async function attachLegacyCharacter(characterId: string) {
    if (!resolvedCampaignId) {
      return;
    }

    setError(null);
    const { error: updateError } = await supabase
      .from("personajes")
      .update({ campaign_id: resolvedCampaignId })
      .eq("id", characterId);

    if (updateError) {
      setError(formatPersonajesError(updateError.message));
      return;
    }

    await loadPersonajes();
  }

  useEffect(() => {
    loadPersonajes();

    const channel = supabase
      .channel("personajes-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "personajes" }, () =>
        loadPersonajes(),
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "personajes" }, () =>
        loadPersonajes(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedCampaignId]);

  function openModal() {
    setError(null);
    setNombre("");
    setClase("fighter");
    setRaceKey("humano");
    setAbilities({ ...DEFAULT_ABILITIES });
    if (!campaignId && !selectedCampaignId && campaignOptions.length > 0) {
      setSelectedCampaignId(campaignOptions[0].id);
    }
    setShowModal(true);
  }

  async function handleCreate() {
    setError(null);
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    const campaignForCharacter = campaignId ?? selectedCampaignId;
    if (!campaignForCharacter) {
      setError("Debes seleccionar una campaña para crear el personaje.");
      return;
    }

    setSaving(true);
    const id = `pj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const raceConfig = RAZAS[raceKey as keyof typeof RAZAS];
    const racialSpells = buildRacialSpells(raceKey);
    const racialFeats = raceConfig?.innateArmorNote ? [raceConfig.innateArmorNote] : [];
    const basePayload: Record<string, unknown> = {
      id,
      campaign_id: campaignForCharacter,
      nombre: nombre.trim(),
      clase,
      race_key: raceKey,
      level: 1,
      abilities,
      hit_rolls: [],
      feats: racialFeats,
      history_blog: "",
      journal_entries: [],
      skill_proficiencies: [],
      inventory_items: [],
      gold: 0,
      spell_slots: {
        "1": { max: 0, used: 0 },
        "2": { max: 0, used: 0 },
        "3": { max: 0, used: 0 },
        "4": { max: 0, used: 0 },
        "5": { max: 0, used: 0 },
        "6": { max: 0, used: 0 },
        "7": { max: 0, used: 0 },
        "8": { max: 0, used: 0 },
        "9": { max: 0, used: 0 },
      },
      spells_by_level: racialSpells,
      class_resources: getDefaultClassResources(clase, 1),
      action_features: { actions: [], bonusActions: [], reactions: [] },
      current_hp: 0,
      temporary_hp: 0,
      saving_throws: { str: false, dex: false, con: false, int: false, wis: false, cha: false },
      armor_name: "Sin armadura",
      armor_base_ac: 10,
      armor_max_dex_mod: null,
      armor_bonus: 0,
    };

    let payload = { ...basePayload };
    let saveErr: Error | null = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { error } = await supabase.from("personajes").insert(payload);
      if (!error) {
        saveErr = null;
        break;
      }

      const missingColumn = parseMissingColumn(error.message);
      if (missingColumn && missingColumn in payload) {
        const nextPayload = { ...payload };
        delete nextPayload[missingColumn];
        payload = nextPayload;
        saveErr = error;
        continue;
      }

      saveErr = error;
      break;
    }

    if (saveErr) {
      setError(formatPersonajesError(saveErr.message));
    } else {
      setShowModal(false);
    }
    setSaving(false);
  }

  async function handleDeleteCharacter(characterId: string) {
    const confirmed = window.confirm("¿Seguro que quieres eliminar este personaje? Esta acción no se puede deshacer.");
    if (!confirmed) {
      return;
    }

    setError(null);
    setDeletingId(characterId);

    const { error: deleteError } = await supabase
      .from("personajes")
      .delete()
      .eq("id", characterId);

    if (deleteError) {
      setError(formatPersonajesError(deleteError.message));
    }

    setDeletingId(null);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-800 border-t-purple-400" />
        <p className="text-sm text-slate-400">Consultando el registro de aventureros…</p>
      </div>
    );
  }

  const cardsGridClass = campaignId
    ? "grid gap-4"
    : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3";

  return (
    <div className="space-y-7 animate-fadein">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-purple-900/30 pb-5">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-wide text-purple-100">
            Registro de Aventureros
          </h1>
          <p className="mt-1 text-slate-400">
            {personajes.length > 0
              ? `${personajes.length} aventurero${personajes.length !== 1 ? "s" : ""}${campaignName ? ` en ${campaignName}` : " en la campaña"}`
              : campaignName
                ? `Ningún aventurero registrado aún en ${campaignName}`
                : "Ningún aventurero registrado aún"}
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 rounded-lg border border-purple-500/50 bg-gradient-to-b from-purple-800/60 to-purple-900/60 px-5 py-2.5 text-sm font-semibold text-purple-100 shadow-lg shadow-purple-900/40 transition hover:border-purple-400/70 hover:from-purple-700/70 hover:to-purple-800/70"
        >
          <span className="text-base leading-none">✦</span>
          Nuevo Aventurero
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {legacyNotice && (
        <div className="rounded-lg border border-amber-500/35 bg-amber-950/35 px-4 py-3 text-sm text-amber-200">
          {legacyNotice}
        </div>
      )}

      {/* Empty state */}
      {personajes.length === 0 ? (
        <div className="parchment-panel flex flex-col items-center justify-center py-24 text-center">
          <p className="mb-5 text-6xl">⚔️</p>
          <h3 className="font-display text-2xl text-purple-200">Sin aventureros registrados</h3>
          <p className="mt-2 max-w-xs text-sm text-slate-400">
            El libro de campaña está en blanco. Crea tu primer personaje para comenzar la aventura.
          </p>
          <button
            onClick={openModal}
            className="mt-7 rounded-lg border border-purple-500/50 bg-purple-800/30 px-6 py-2.5 text-sm font-semibold text-purple-200 transition hover:bg-purple-800/50"
          >
            ✦ Crear primer personaje
          </button>
        </div>
      ) : (
        <div className={cardsGridClass}>
          {personajes.map((pj) => (
            <article key={pj.id} className={`ui-card overflow-hidden p-0 ${getClassVisual(pj.clase).accentClass}`}>
              <div className="border-b border-slate-700/60 bg-slate-900/55 px-4 py-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-600/70 bg-slate-900/70 text-base">
                    {getClassVisual(pj.clase).icon}
                  </span>
                  <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Aventurero</span>
                </div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-teal-300/70">{pj.id}</p>
                <h3 className="mt-1 font-display text-2xl leading-tight text-purple-100">{pj.nombre}</h3>
              </div>

              <div className="space-y-4 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`rounded-md border px-2.5 py-1 ${getClassVisual(pj.clase).badgeClass}`}>
                    {CLASS_LABEL_BY_VALUE[pj.clase] ?? pj.clase}
                  </span>
                  <span className="rounded-md border border-teal-500/35 bg-teal-900/25 px-2.5 py-1 text-teal-100">
                    Nivel {pj.level}
                  </span>
                </div>

                <p className="text-sm text-slate-300">
                  Raza <span className="text-slate-100">{RAZAS[pj.raceKey as keyof typeof RAZAS]?.name ?? pj.raceKey}</span>
                </p>

                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-md border border-slate-700/70 bg-slate-950/45 px-2 py-2 text-center">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">HP</p>
                    <p className="text-lg font-semibold text-cyan-100">{pj.currentHp}</p>
                  </div>
                  <div className="rounded-md border border-slate-700/70 bg-slate-950/45 px-2 py-2 text-center">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">CA</p>
                    <p className="text-lg font-semibold text-emerald-100">{getArmorClass(pj)}</p>
                  </div>
                  <div className="rounded-md border border-slate-700/70 bg-slate-950/45 px-2 py-2 text-center">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">INIT</p>
                    <p className="text-lg font-semibold text-purple-100">
                      {getInitiative(pj) >= 0 ? `+${getInitiative(pj)}` : getInitiative(pj)}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-700/70 bg-slate-950/45 px-2 py-2 text-center">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">VEL</p>
                    {(() => {
                      const movement = getMovementProfile(pj.raceKey);
                      return (
                        <div className="leading-tight">
                          <p className="text-sm font-semibold text-amber-100">T {movement.walk} ft</p>
                          {movement.swim && (
                            <p className="text-[11px] text-cyan-200">N {movement.swim} ft</p>
                          )}
                          {movement.fly && (
                            <p className="text-[11px] text-sky-200">V {movement.fly} ft</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <a
                  href={`/personajes/hoja/?id=${encodeURIComponent(pj.id)}`}
                  className="ui-btn text-center"
                >
                  Abrir hoja
                </a>
                <a
                  href={`/personajes/hoja/?id=${encodeURIComponent(pj.id)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ui-btn ui-btn-secondary text-center"
                >
                  Nueva pestaña
                </a>
                <button
                  type="button"
                  onClick={() => handleDeleteCharacter(pj.id)}
                  disabled={deletingId === pj.id}
                  className="ui-btn ui-btn-danger"
                >
                  {deletingId === pj.id ? "Eliminando..." : "Eliminar"}
                </button>
                {resolvedCampaignId && !pj.campaignId && (
                  <button
                    type="button"
                    onClick={() => attachLegacyCharacter(pj.id)}
                    className="ui-btn sm:col-span-2 lg:col-span-3"
                  >
                    Asociar a campaña
                  </button>
                )}
              </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal crear personaje */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-purple-950/50 animate-fadein">
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-slate-700/60 px-6 py-6 sm:px-8">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-purple-100">Nuevo Aventurero</h2>
                <p className="mt-2 text-sm sm:text-base text-slate-400">Completa el pergamino de presentación.</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 px-6 py-6 sm:px-8">
              {/* Nombre */}
              <div>
                <label className="mb-2 block text-sm sm:text-base font-semibold text-slate-300">
                  Nombre del personaje <span className="text-rose-400">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="Ej: Seraphine Nox"
                  className="w-full rounded-lg border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base sm:text-lg text-slate-100 placeholder:text-slate-600 focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm sm:text-base font-semibold text-slate-300">Clase</label>
                  <select
                    value={clase}
                    onChange={(e) => setClase(e.target.value)}
                    className="w-full rounded-lg border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base sm:text-lg text-slate-100 focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
                  >
                    {CLASES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm sm:text-base font-semibold text-slate-300">Raza</label>
                  <select
                    value={raceKey}
                    onChange={(e) => setRaceKey(e.target.value)}
                    className="w-full rounded-lg border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base sm:text-lg text-slate-100 focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
                  >
                    {Object.entries(RAZAS).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!campaignId && (
                <div>
                  <label className="mb-2 block text-sm sm:text-base font-semibold text-slate-300">
                    Campaña <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={selectedCampaignId}
                    onChange={(event) => setSelectedCampaignId(event.target.value)}
                    className="w-full rounded-lg border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base sm:text-lg text-slate-100 focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
                  >
                    {campaignOptions.length === 0 && (
                      <option value="">No hay campañas disponibles</option>
                    )}
                    {campaignOptions.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Características */}
              <div>
                <p className="mb-2 text-sm font-medium text-slate-300">Características base</p>
                <div className="grid grid-cols-6 gap-2">
                  {ABILITY_KEYS.map((key) => (
                    <div key={key} className="text-center">
                      <p className="mb-1 text-xs font-bold tracking-wider text-teal-400/80">
                        {ABILITY_LABELS[key]}
                      </p>
                      <input
                        type="number"
                        min={3}
                        max={20}
                        value={abilities[key]}
                        onChange={(e) =>
                          setAbilities((prev) => ({
                            ...prev,
                            [key]: Math.min(20, Math.max(3, Number(e.target.value))),
                          }))
                        }
                        className="w-full rounded-lg border border-slate-700/60 bg-slate-950/60 py-2 text-center text-sm text-slate-100 focus:border-purple-500/60 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
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
                {saving ? "Registrando…" : "✦ Registrar Aventurero"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
