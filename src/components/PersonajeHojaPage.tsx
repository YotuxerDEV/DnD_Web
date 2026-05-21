import { useEffect, useState } from "react";
import {
  normalizeClassResources,
  syncClassResourcesForProgression,
  type ClassResource,
} from "../lib/classResources";
import { RACES_CONFIG } from "../lib/races";
import { supabase } from "../lib/supabase";
import FichaPersonaje from "./FichaPersonaje";

type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

type Abilities = Record<AbilityKey, number>;

type JournalEntry = {
  id: string;
  content: string;
  createdAt: string;
};

type SkillKey =
  | "acrobatics"
  | "animal_handling"
  | "arcana"
  | "athletics"
  | "deception"
  | "history"
  | "insight"
  | "intimidation"
  | "investigation"
  | "medicine"
  | "nature"
  | "perception"
  | "performance"
  | "persuasion"
  | "religion"
  | "sleight_of_hand"
  | "stealth"
  | "survival";

type InventoryItem = {
  id: string;
  name: string;
  qty: number;
  weight: number;
  notes: string;
};

type SpellSlotsByLevel = Record<string, { max: number; used: number }>;
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
type SpellsByLevel = Record<string, SpellCard[]>;
type ActionFeatures = { actions: string[]; bonusActions: string[]; reactions: string[] };
type SavingThrows = Record<AbilityKey, boolean>;
type ArmorProfile = {
  name: string;
  baseAc: number;
  maxDexMod: number | null;
  bonus: number;
};

type CharacterSheet = {
  id: string;
  nombre: string;
  clase: string;
  raceKey: string;
  level: number;
  abilities: Abilities;
  hitRolls: number[];
  feats: string[];
  historyBlog: string;
  journalEntries: JournalEntry[];
  skillProficiencies: SkillKey[];
  inventoryItems: InventoryItem[];
  gold: number;
  spellSlots: SpellSlotsByLevel;
  spellsByLevel: SpellsByLevel;
  actionFeatures: ActionFeatures;
  classResources: ClassResource[];
  currentHp: number;
  temporaryHp: number;
  savingThrows: SavingThrows;
  armor: ArmorProfile;
};

function getDefaultSpellSlots(): SpellSlotsByLevel {
  return {
    "1": { max: 0, used: 0 },
    "2": { max: 0, used: 0 },
    "3": { max: 0, used: 0 },
    "4": { max: 0, used: 0 },
    "5": { max: 0, used: 0 },
    "6": { max: 0, used: 0 },
    "7": { max: 0, used: 0 },
    "8": { max: 0, used: 0 },
    "9": { max: 0, used: 0 },
  };
}

function getDefaultSpellsByLevel(): SpellsByLevel {
  return {
    "0": [],
    "1": [],
    "2": [],
    "3": [],
    "4": [],
    "5": [],
    "6": [],
    "7": [],
    "8": [],
    "9": [],
  };
}

const RAZAS = RACES_CONFIG;

function getCharacterIdFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") ?? "";
}

function mapRow(row: Record<string, unknown>): CharacterSheet {
  const fallbackAbilities: Abilities = {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  };

  const dbEntries = Array.isArray(row.journal_entries)
    ? (row.journal_entries as Record<string, unknown>[])
    : [];

  const journalEntries: JournalEntry[] = dbEntries
    .map((entry) => ({
      id: String(entry.id ?? ""),
      content: String(entry.content ?? ""),
      createdAt: String(entry.createdAt ?? ""),
    }))
    .filter((entry) => entry.id && entry.content && entry.createdAt);

  const skillProficiencies = Array.isArray(row.skill_proficiencies)
    ? (row.skill_proficiencies as SkillKey[])
    : [];

  const dbInventory = Array.isArray(row.inventory_items)
    ? (row.inventory_items as Record<string, unknown>[])
    : [];
  const inventoryItems: InventoryItem[] = dbInventory
    .map((item) => ({
      id: String(item.id ?? ""),
      name: String(item.name ?? ""),
      qty: Number(item.qty ?? 1),
      weight: Number(item.weight ?? 0),
      notes: String(item.notes ?? ""),
    }))
    .filter((item) => item.id && item.name);

  const spellSlots = getDefaultSpellSlots();
  if (row.spell_slots && typeof row.spell_slots === "object") {
    const source = row.spell_slots as Record<string, { max?: number; used?: number }>;
    for (const level of Object.keys(spellSlots)) {
      if (source[level]) {
        spellSlots[level] = {
          max: Math.max(0, Number(source[level].max ?? 0)),
          used: Math.max(0, Number(source[level].used ?? 0)),
        };
      }
    }
  }

  const spellsByLevel = getDefaultSpellsByLevel();
  if (row.spells_by_level && typeof row.spells_by_level === "object") {
    const source = row.spells_by_level as Record<string, unknown>;
    const SPELL_LEVELS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
    for (const level of SPELL_LEVELS) {
      if (Array.isArray(source[level])) {
        spellsByLevel[level] = source[level].map((spell: unknown) => {
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

  const actionFeatures: ActionFeatures = {
    actions: [],
    bonusActions: [],
    reactions: [],
  };

  const clase = String(row.clase ?? "fighter");
  const level = Number(row.level ?? 1);
  const classResources = syncClassResourcesForProgression(
    normalizeClassResources(row.class_resources),
    clase,
    level,
  );
  if (row.action_features && typeof row.action_features === "object") {
    const source = row.action_features as Record<string, unknown>;
    actionFeatures.actions = Array.isArray(source.actions)
      ? source.actions.map((value) => String(value))
      : [];
    actionFeatures.bonusActions = Array.isArray(source.bonusActions)
      ? source.bonusActions.map((value) => String(value))
      : [];
    actionFeatures.reactions = Array.isArray(source.reactions)
      ? source.reactions.map((value) => String(value))
      : [];
  }

  const rawSavingThrows: Record<string, unknown> =
    row.saving_throws && typeof row.saving_throws === "object"
      ? (row.saving_throws as Record<string, unknown>)
      : {};
  const savingThrows: SavingThrows = {
    str: Boolean(rawSavingThrows.str),
    dex: Boolean(rawSavingThrows.dex),
    con: Boolean(rawSavingThrows.con),
    int: Boolean(rawSavingThrows.int),
    wis: Boolean(rawSavingThrows.wis),
    cha: Boolean(rawSavingThrows.cha),
  };

  return {
    id: String(row.id ?? ""),
    nombre: String(row.nombre ?? ""),
    clase,
    raceKey: String(row.race_key ?? "humano"),
    level,
    abilities: (row.abilities as Abilities) ?? fallbackAbilities,
    hitRolls: (row.hit_rolls as number[]) ?? [],
    feats: (row.feats as string[]) ?? [],
    historyBlog: String(row.history_blog ?? ""),
    journalEntries,
    skillProficiencies,
    inventoryItems,
    gold: Math.max(0, Number(row.gold ?? 0)),
    spellSlots,
    spellsByLevel,
    actionFeatures,
    classResources,
    currentHp: Math.max(0, Number(row.current_hp ?? 0)),
    temporaryHp: Math.max(0, Number(row.temporary_hp ?? 0)),
    savingThrows,
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

export default function PersonajeHojaPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [character, setCharacter] = useState<CharacterSheet | null>(null);

  useEffect(() => {
    async function loadCharacter() {
      const id = getCharacterIdFromUrl();
      if (!id) {
        setError("Falta el identificador del personaje en la URL.");
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("personajes")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (queryError) {
        setError(queryError.message);
      } else if (!data) {
        setError("No se encontro el personaje solicitado.");
      } else {
        setCharacter(mapRow(data));
      }

      setLoading(false);
    }

    loadCharacter();
  }, []);

  if (loading) {
    return (
      <section className="parchment-panel p-6">
        <p className="text-sm text-slate-400">Cargando hoja del personaje...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="parchment-panel p-6 space-y-3">
        <h1 className="font-display text-2xl text-rose-200">No se pudo abrir la hoja</h1>
        <p className="text-sm text-rose-300">{error}</p>
        <a
          href="/personajes/"
          className="inline-block rounded-md border border-purple-500/50 bg-purple-900/30 px-3 py-2 text-sm font-semibold text-purple-200 transition hover:bg-purple-800/40"
        >
          Volver al registro
        </a>
      </section>
    );
  }

  if (!character) {
    return null;
  }

  return (
    <div className="space-y-4 animate-fadein">
      <a
        href="/personajes/"
        className="inline-block rounded-md border border-slate-600/60 bg-slate-900/40 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800/50"
      >
        ← Volver al registro
      </a>
      <FichaPersonaje initialCharacter={character} customRacesConfig={RAZAS} />
    </div>
  );
}
