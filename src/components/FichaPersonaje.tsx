import { useEffect, useMemo, useState } from "react";
import {
  normalizeClassResources,
  syncClassResourcesForProgression,
  type ClassResource,
} from "../lib/classResources";
import { supabase } from "../lib/supabase";

type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

type Abilities = Record<AbilityKey, number>;

type RaceTrait = {
  name: string;
  description: string;
};

type RaceConfig = {
  name: string;
  statBonuses?: Partial<Abilities>;
  hpPerLevelBonus?: number;
  traits?: Array<string | RaceTrait>;
};

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

type SpellSlotsByLevel = Record<string, { max: number; used: number }>;
type SpellsByLevel = Record<string, SpellCard[]>;

type ActionFeatures = {
  actions: string[];
  bonusActions: string[];
  reactions: string[];
};

type SavingThrows = Record<AbilityKey, boolean>;
type ArmorProfile = {
  name: string;
  baseAc: number;
  maxDexMod: number | null;
  bonus: number;
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

type FichaPersonajeProps = {
  initialCharacter: CharacterSheet;
  customRacesConfig: Record<string, RaceConfig>;
};

type AdvancementChoice = "asi" | "feat";

type ClassConfig = {
  label: string;
  hitDie: number;
};

const CLASS_CONFIG: Record<string, ClassConfig> = {
  barbarian: { label: "Barbaro", hitDie: 12 },
  fighter: { label: "Guerrero", hitDie: 10 },
  paladin: { label: "Paladin", hitDie: 10 },
  ranger: { label: "Explorador", hitDie: 10 },
  rogue: { label: "Picaro", hitDie: 8 },
  bard: { label: "Bardo", hitDie: 8 },
  cleric: { label: "Clerigo", hitDie: 8 },
  druid: { label: "Druida", hitDie: 8 },
  monk: { label: "Monje", hitDie: 8 },
  warlock: { label: "Brujo", hitDie: 8 },
  sorcerer: { label: "Hechicero", hitDie: 6 },
  wizard: { label: "Mago", hitDie: 6 },
};

const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: "FUE",
  dex: "DES",
  con: "CON",
  int: "INT",
  wis: "SAB",
  cha: "CAR",
};

const SKILL_CONFIG: Array<{ key: SkillKey; label: string; ability: AbilityKey }> = [
  { key: "acrobatics", label: "Acrobacias", ability: "dex" },
  { key: "animal_handling", label: "Trato con animales", ability: "wis" },
  { key: "arcana", label: "Arcana", ability: "int" },
  { key: "athletics", label: "Atletismo", ability: "str" },
  { key: "deception", label: "Engano", ability: "cha" },
  { key: "history", label: "Historia", ability: "int" },
  { key: "insight", label: "Perspicacia", ability: "wis" },
  { key: "intimidation", label: "Intimidacion", ability: "cha" },
  { key: "investigation", label: "Investigacion", ability: "int" },
  { key: "medicine", label: "Medicina", ability: "wis" },
  { key: "nature", label: "Naturaleza", ability: "int" },
  { key: "perception", label: "Percepcion", ability: "wis" },
  { key: "performance", label: "Interpretacion", ability: "cha" },
  { key: "persuasion", label: "Persuasion", ability: "cha" },
  { key: "religion", label: "Religion", ability: "int" },
  { key: "sleight_of_hand", label: "Juego de manos", ability: "dex" },
  { key: "stealth", label: "Sigilo", ability: "dex" },
  { key: "survival", label: "Supervivencia", ability: "wis" },
];

const SPELL_LEVELS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

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

function getAbilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

function getProficiencyBonus(level: number): number {
  return 2 + Math.floor((level - 1) / 4);
}

function getAverageHitDieValue(hitDie: number): number {
  return Math.floor(hitDie / 2) + 1;
}

function canTakeAsi(level: number): boolean {
  return [4, 8, 12, 16, 19].includes(level);
}

function mapDbToCharacter(row: Record<string, unknown>): CharacterSheet {
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

  const rawSpellSlots =
    row.spell_slots && typeof row.spell_slots === "object"
      ? (row.spell_slots as Record<string, { max?: number; used?: number }>)
      : {};
  const spellSlots = getDefaultSpellSlots();
  for (const level of Object.keys(spellSlots)) {
    const source = rawSpellSlots[level];
    if (source) {
      spellSlots[level] = {
        max: Math.max(0, Number(source.max ?? 0)),
        used: Math.max(0, Number(source.used ?? 0)),
      };
    }
  }

  const rawSpells =
    row.spells_by_level && typeof row.spells_by_level === "object"
      ? (row.spells_by_level as Record<string, unknown>)
      : {};
  const spellsByLevel = getDefaultSpellsByLevel();
  for (const level of SPELL_LEVELS) {
    const value = rawSpells[level];
    if (Array.isArray(value)) {
      spellsByLevel[level] = value.map((spell) => {
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

  const rawFeatures =
    row.action_features && typeof row.action_features === "object"
      ? (row.action_features as Record<string, unknown>)
      : {};
  const actionFeatures: ActionFeatures = {
    actions: Array.isArray(rawFeatures.actions)
      ? rawFeatures.actions.map((feature) => String(feature))
      : [],
    bonusActions: Array.isArray(rawFeatures.bonusActions)
      ? rawFeatures.bonusActions.map((feature) => String(feature))
      : [],
    reactions: Array.isArray(rawFeatures.reactions)
      ? rawFeatures.reactions.map((feature) => String(feature))
      : [],
  };

  const clase = String(row.clase ?? "fighter");
  const level = Number(row.level ?? 1);
  const classResources = syncClassResourcesForProgression(
    normalizeClassResources(row.class_resources),
    clase,
    level,
  );

  // Siempre inicializa savingThrows con valores booleanos válidos
  const rawSavingThrows: Record<string, unknown> =
    row.saving_throws && typeof row.saving_throws === "object"
      ? (row.saving_throws as Record<string, unknown>)
      : {};
  const savingThrows: SavingThrows = {
    str: typeof rawSavingThrows.str === "boolean" ? rawSavingThrows.str : false,
    dex: typeof rawSavingThrows.dex === "boolean" ? rawSavingThrows.dex : false,
    con: typeof rawSavingThrows.con === "boolean" ? rawSavingThrows.con : false,
    int: typeof rawSavingThrows.int === "boolean" ? rawSavingThrows.int : false,
    wis: typeof rawSavingThrows.wis === "boolean" ? rawSavingThrows.wis : false,
    cha: typeof rawSavingThrows.cha === "boolean" ? rawSavingThrows.cha : false,
  };

  return {
    id: String(row.id ?? ""),
    campaignId: row.campaign_id ? String(row.campaign_id) : null,
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
    currentHp: Math.max(0, typeof row.current_hp === "number" ? row.current_hp : Number(row.current_hp ?? 0)),
    temporaryHp: Math.max(0, typeof row.temporary_hp === "number" ? row.temporary_hp : Number(row.temporary_hp ?? 0)),
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

function getDayKey(isoDate: string): string {
  return isoDate.slice(0, 10);
}

function formatDayLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const safeDate = new Date(year, (month ?? 1) - 1, day ?? 1);
  return safeDate.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
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

function formatEntryTime(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export default function FichaPersonaje({
  initialCharacter,
  customRacesConfig,
}: FichaPersonajeProps) {
  const [tab, setTab] = useState<
    "resumen" | "combate" | "habilidades" | "inventario" | "hechizos" | "acciones" | "diario" | "trasfondo"
  >("resumen");
  const [character, setCharacter] = useState<CharacterSheet>({
    ...initialCharacter,
    journalEntries: initialCharacter.journalEntries ?? [],
    skillProficiencies: initialCharacter.skillProficiencies ?? [],
    inventoryItems: initialCharacter.inventoryItems ?? [],
    gold: initialCharacter.gold ?? 0,
    spellSlots: initialCharacter.spellSlots ?? getDefaultSpellSlots(),
    spellsByLevel: initialCharacter.spellsByLevel ?? getDefaultSpellsByLevel(),
    actionFeatures: initialCharacter.actionFeatures ?? {
      actions: [],
      bonusActions: [],
      reactions: [],
    },
    classResources: syncClassResourcesForProgression(
      initialCharacter.classResources ?? [],
      initialCharacter.clase,
      initialCharacter.level,
    ),
    currentHp: initialCharacter.currentHp ?? 0,
    temporaryHp: initialCharacter.temporaryHp ?? 0,
    savingThrows: initialCharacter.savingThrows ?? {
      str: false,
      dex: false,
      con: false,
      int: false,
      wis: false,
      cha: false,
    },
    armor: initialCharacter.armor ?? {
      name: "Sin armadura",
      baseAc: 10,
      maxDexMod: null,
      bonus: 0,
    },
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [useAverage, setUseAverage] = useState(true);
  const [hitRollInput, setHitRollInput] = useState("");
  const [advancementChoice, setAdvancementChoice] =
    useState<AdvancementChoice>("asi");
  const [asiStat, setAsiStat] = useState<AbilityKey>("str");
  const [featName, setFeatName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [journalInput, setJournalInput] = useState("");
  const [inventoryName, setInventoryName] = useState("");
  const [inventoryQty, setInventoryQty] = useState("1");
  const [inventoryWeight, setInventoryWeight] = useState("0");
  const [inventoryNotes, setInventoryNotes] = useState("");
  const [actionDraft, setActionDraft] = useState(
    (initialCharacter.actionFeatures?.actions ?? []).join("\n"),
  );
  const [bonusActionDraft, setBonusActionDraft] = useState(
    (initialCharacter.actionFeatures?.bonusActions ?? []).join("\n"),
  );
  const [reactionDraft, setReactionDraft] = useState(
    (initialCharacter.actionFeatures?.reactions ?? []).join("\n"),
  );
  const [currentHpInput, setCurrentHpInput] = useState(
    String(initialCharacter.currentHp ?? 0),
  );
  const [temporaryHpInput, setTemporaryHpInput] = useState(
    String(initialCharacter.temporaryHp ?? 0),
  );
  const [spellModalOpen, setSpellModalOpen] = useState(false);
  const [spellModalLevel, setSpellModalLevel] = useState("1");
  const [spellModalData, setSpellModalData] = useState<SpellCard>({
    id: "",
    name: "",
    level: "1",
    school: "Evocation",
    castingTime: "1 action",
    range: "Self",
    components: [],
    duration: "Instantaneous",
    description: "",
    ritual: false,
  });
  const [spellModalEditingId, setSpellModalEditingId] = useState<string | null>(null);
  const [resourceNameInput, setResourceNameInput] = useState("");
  const [resourceMaxInput, setResourceMaxInput] = useState("1");

  const classConfig = CLASS_CONFIG[character.clase] ?? CLASS_CONFIG.fighter;
  const activeRace = customRacesConfig[character.raceKey] ?? {
    name: "Personalizada",
    statBonuses: {},
    hpPerLevelBonus: 0,
    traits: [],
  };

  const finalAbilities = useMemo(() => {
    const bonuses = activeRace.statBonuses ?? {};
    return {
      str: character.abilities.str + (bonuses.str ?? 0),
      dex: character.abilities.dex + (bonuses.dex ?? 0),
      con: character.abilities.con + (bonuses.con ?? 0),
      int: character.abilities.int + (bonuses.int ?? 0),
      wis: character.abilities.wis + (bonuses.wis ?? 0),
      cha: character.abilities.cha + (bonuses.cha ?? 0),
    };
  }, [activeRace.statBonuses, character.abilities]);

  const raceBonuses = useMemo(() => activeRace.statBonuses ?? {}, [activeRace.statBonuses]);

  const normalizedRaceTraits = useMemo<RaceTrait[]>(() => {
    return (activeRace.traits ?? []).map((trait) => {
      if (typeof trait === "string") {
        return {
          name: trait,
          description: "Rasgo racial sin descripción detallada todavía.",
        };
      }
      return trait;
    });
  }, [activeRace.traits]);

  const modifiers = useMemo(() => {
    return {
      str: getAbilityMod(finalAbilities.str),
      dex: getAbilityMod(finalAbilities.dex),
      con: getAbilityMod(finalAbilities.con),
      int: getAbilityMod(finalAbilities.int),
      wis: getAbilityMod(finalAbilities.wis),
      cha: getAbilityMod(finalAbilities.cha),
    };
  }, [finalAbilities]);

  const proficiencyBonus = useMemo(
    () => getProficiencyBonus(character.level),
    [character.level],
  );

  const armorClass = useMemo(() => {
    const dexContribution =
      character.armor.maxDexMod === null
        ? modifiers.dex
        : Math.min(modifiers.dex, character.armor.maxDexMod);

    return Math.max(1, character.armor.baseAc + dexContribution + character.armor.bonus);
  }, [character.armor.baseAc, character.armor.bonus, character.armor.maxDexMod, modifiers.dex]);

  const maxHp = useMemo(() => {
    const conMod = modifiers.con;
    const racialHpBonus = activeRace.hpPerLevelBonus ?? 0;

    let total = classConfig.hitDie + conMod + racialHpBonus;

    for (let i = 2; i <= character.level; i += 1) {
      const roll = character.hitRolls[i - 2];
      const baseGain =
        typeof roll === "number" ? roll : getAverageHitDieValue(classConfig.hitDie);
      total += Math.max(1, baseGain + conMod + racialHpBonus);
    }

    return Math.max(1, total);
  }, [
    activeRace.hpPerLevelBonus,
    character.hitRolls,
    character.level,
    classConfig.hitDie,
    modifiers.con,
  ]);

  const journalByDay = useMemo(() => {
    const grouped: Record<string, JournalEntry[]> = {};
    const sortedEntries = [...character.journalEntries].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );

    for (const entry of sortedEntries) {
      const dayKey = getDayKey(entry.createdAt);
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(entry);
    }

    return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
  }, [character.journalEntries]);

  const totalInventoryWeight = useMemo(() => {
    return character.inventoryItems.reduce((sum, item) => sum + item.qty * item.weight, 0);
  }, [character.inventoryItems]);

  async function persistCharacter(nextCharacter: CharacterSheet): Promise<void> {
    const basePayload: Record<string, unknown> = {
      id: nextCharacter.id,
      campaign_id: nextCharacter.campaignId ?? null,
      nombre: nextCharacter.nombre,
      clase: nextCharacter.clase,
      race_key: nextCharacter.raceKey,
      level: nextCharacter.level,
      abilities: nextCharacter.abilities,
      hit_rolls: nextCharacter.hitRolls,
      feats: nextCharacter.feats,
      history_blog: nextCharacter.historyBlog,
      journal_entries: nextCharacter.journalEntries,
      skill_proficiencies: nextCharacter.skillProficiencies,
      inventory_items: nextCharacter.inventoryItems,
      gold: nextCharacter.gold,
      spell_slots: nextCharacter.spellSlots,
      spells_by_level: nextCharacter.spellsByLevel,
      class_resources: nextCharacter.classResources,
      action_features: nextCharacter.actionFeatures,
      current_hp: nextCharacter.currentHp,
      temporary_hp: nextCharacter.temporaryHp,
      saving_throws: nextCharacter.savingThrows,
      armor_name: nextCharacter.armor.name,
      armor_base_ac: nextCharacter.armor.baseAc,
      armor_max_dex_mod: nextCharacter.armor.maxDexMod,
      armor_bonus: nextCharacter.armor.bonus,
    };

    let payload = { ...basePayload };

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { error: saveError } = await supabase
        .from("personajes")
        .upsert(payload, { onConflict: "id" });

      if (!saveError) {
        return;
      }

      const missingColumn = parseMissingColumn(saveError.message);
      if (missingColumn && missingColumn in payload) {
        const nextPayload = { ...payload };
        delete nextPayload[missingColumn];
        payload = nextPayload;
        continue;
      }

      throw saveError;
    }

    throw new Error("No se pudo guardar el personaje por incompatibilidad de esquema en Supabase.");
  }

  async function updateCharacterFields(
    fields: Record<string, unknown>,
    fallbackMessage: string,
  ): Promise<void> {
    let payload = { ...fields };
    if (character.campaignId) {
      payload = { ...payload, campaign_id: character.campaignId };
    }

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { error: updateError } = await supabase
        .from("personajes")
        .update(payload)
        .eq("id", character.id);

      if (!updateError) {
        return;
      }

      const missingColumn = parseMissingColumn(updateError.message);
      if (missingColumn && missingColumn in payload) {
        const nextPayload = { ...payload };
        delete nextPayload[missingColumn];
        payload = nextPayload;
        continue;
      }

      throw new Error(updateError.message || fallbackMessage);
    }

    throw new Error(fallbackMessage);
  }

  async function handleLevelUp() {
    setError(null);

    if (!useAverage && !hitRollInput.trim()) {
      setError("Debes introducir una tirada de vida o usar el promedio.");
      return;
    }

    const parsedRoll = Number(hitRollInput);
    const hasManualRoll = !useAverage;

    if (
      hasManualRoll &&
      (!Number.isFinite(parsedRoll) ||
        parsedRoll < 1 ||
        parsedRoll > classConfig.hitDie)
    ) {
      setError(`La tirada debe estar entre 1 y ${classConfig.hitDie}.`);
      return;
    }

    const nextLevel = character.level + 1;
    let nextAbilities = { ...character.abilities };
    let nextFeats = [...character.feats];

    if (canTakeAsi(nextLevel)) {
      if (advancementChoice === "asi") {
        nextAbilities[asiStat] = Math.min(20, nextAbilities[asiStat] + 2);
      } else if (featName.trim()) {
        nextFeats = [...nextFeats, featName.trim()];
      }
    }

    const nextCharacter: CharacterSheet = {
      ...character,
      level: nextLevel,
      abilities: nextAbilities,
      feats: nextFeats,
      classResources: syncClassResourcesForProgression(
        character.classResources,
        character.clase,
        nextLevel,
      ),
      hitRolls: hasManualRoll
        ? [...character.hitRolls, parsedRoll]
        : [...character.hitRolls],
    };

    setIsSaving(true);

    try {
      await persistCharacter(nextCharacter);
      setCharacter(nextCharacter);
      setIsModalOpen(false);
      setHitRollInput("");
      setFeatName("");
    } catch (saveErr) {
      const message =
        saveErr instanceof Error ? saveErr.message : "No se pudo guardar en Supabase.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveBlog() {
    setIsSaving(true);
    setError(null);

    try {
      await persistCharacter(character);
    } catch (saveErr) {
      const message =
        saveErr instanceof Error ? saveErr.message : "No se pudo guardar el blog.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddJournalEntry() {
    setError(null);

    if (!journalInput.trim()) {
      setError("La entrada del diario no puede estar vacia.");
      return;
    }

    const now = new Date().toISOString();
    const entry: JournalEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      content: journalInput.trim(),
      createdAt: now,
    };

    const nextCharacter: CharacterSheet = {
      ...character,
      journalEntries: [entry, ...character.journalEntries],
    };

    setIsSaving(true);
    try {
      await updateCharacterFields(
        { journal_entries: nextCharacter.journalEntries },
        "No se pudo guardar la entrada.",
      );
      setCharacter(nextCharacter);
      setJournalInput("");
    } catch (saveErr) {
      const message =
        saveErr instanceof Error ? saveErr.message : "No se pudo guardar la entrada.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleToggleSkill(skillKey: SkillKey) {
    setCharacter((prev) => {
      const next = prev.skillProficiencies.includes(skillKey)
        ? prev.skillProficiencies.filter((skill) => skill !== skillKey)
        : [...prev.skillProficiencies, skillKey];
      return { ...prev, skillProficiencies: next };
    });
  }

  function handleAbilityChange(key: AbilityKey, value: string) {
    const numeric = Number(value || 0);
    const clamped = Math.max(1, Math.min(30, Number.isFinite(numeric) ? numeric : 1));

    setCharacter((prev) => ({
      ...prev,
      abilities: {
        ...prev.abilities,
        [key]: clamped,
      },
    }));
  }

  async function handleSaveCharacterSection() {
    setIsSaving(true);
    setError(null);
    try {
      await persistCharacter(character);
    } catch (saveErr) {
      const message =
        saveErr instanceof Error ? saveErr.message : "No se pudo guardar esta seccion.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveAbilities() {
    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("personajes")
        .update({ abilities: character.abilities })
        .eq("id", character.id);

      if (updateError) {
        throw updateError;
      }
    } catch (saveErr) {
      const message =
        saveErr instanceof Error ? saveErr.message : "No se pudieron guardar los atributos.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveCombatSection() {
    setIsSaving(true);
    setError(null);

    try {
      await updateCharacterFields(
        {
          current_hp: character.currentHp,
          temporary_hp: character.temporaryHp,
          saving_throws: character.savingThrows,
          class_resources: character.classResources,
          armor_name: character.armor.name,
          armor_base_ac: character.armor.baseAc,
          armor_max_dex_mod: character.armor.maxDexMod,
          armor_bonus: character.armor.bonus,
        },
        "No se pudo guardar la sección de combate.",
      );
    } catch (saveErr) {
      const message =
        saveErr instanceof Error ? saveErr.message : "No se pudo guardar la sección de combate.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveSpellsSection() {
    setIsSaving(true);
    setError(null);

    try {
      await updateCharacterFields(
        {
          spell_slots: character.spellSlots,
          spells_by_level: character.spellsByLevel,
        },
        "No se pudo guardar la sección de hechizos.",
      );
    } catch (saveErr) {
      const message =
        saveErr instanceof Error ? saveErr.message : "No se pudo guardar la sección de hechizos.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleSpellLinesChange(level: string, value: string) {
    const spellNames = value
      .split("\n")
      .map((spell) => spell.trim())
      .filter(Boolean);

    const spells: SpellCard[] = spellNames.map((name) => ({
      id: `spell-${Date.now()}-${Math.random()}`,
      name,
      level,
      school: "Evocation",
      castingTime: "1 action",
      range: "Self",
      components: [],
      duration: "Instantaneous",
      description: "",
      ritual: false,
    }));

    setCharacter((prev) => ({
      ...prev,
      spellsByLevel: {
        ...prev.spellsByLevel,
        [level]: spells,
      },
    }));
  }

  function handleSpellSlotChange(level: string, field: "max" | "used", value: string) {
    const numeric = Math.max(0, Number(value || 0));
    setCharacter((prev) => {
      const current = prev.spellSlots[level] ?? { max: 0, used: 0 };
      const next = { ...current, [field]: numeric };
      if (field === "used" && next.used > next.max && next.max > 0) {
        next.used = next.max;
      }
      return {
        ...prev,
        spellSlots: {
          ...prev.spellSlots,
          [level]: next,
        },
      };
    });
  }

  function handleAddInventoryItem() {
    if (!inventoryName.trim()) {
      setError("Debes indicar el nombre del objeto.");
      return;
    }

    const nextItem: InventoryItem = {
      id: `itm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: inventoryName.trim(),
      qty: Math.max(1, Number(inventoryQty || 1)),
      weight: Math.max(0, Number(inventoryWeight || 0)),
      notes: inventoryNotes.trim(),
    };

    setCharacter((prev) => ({ ...prev, inventoryItems: [...prev.inventoryItems, nextItem] }));
    setInventoryName("");
    setInventoryQty("1");
    setInventoryWeight("0");
    setInventoryNotes("");
  }

  function handleRemoveInventoryItem(id: string) {
    setCharacter((prev) => ({
      ...prev,
      inventoryItems: prev.inventoryItems.filter((item) => item.id !== id),
    }));
  }

  function parseFeatureLines(value: string): string[] {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function handleApplyActionsDraft() {
    setCharacter((prev) => ({
      ...prev,
      actionFeatures: {
        actions: parseFeatureLines(actionDraft),
        bonusActions: parseFeatureLines(bonusActionDraft),
        reactions: parseFeatureLines(reactionDraft),
      },
    }));
  }

  async function handleUpdateHP() {
    const nextCurrent = Math.max(0, Number(currentHpInput || 0));
    const nextTemporary = Math.max(0, Number(temporaryHpInput || 0));

    const nextCharacter = {
      ...character,
      currentHp: nextCurrent,
      temporaryHp: nextTemporary,
    };

    setCharacter(nextCharacter);
    setCurrentHpInput(String(nextCurrent));
    setTemporaryHpInput(String(nextTemporary));
    setIsSaving(true);

    // Siempre guarda como número
    updateCharacterFields(
      {
        current_hp: Number(nextCurrent),
        temporary_hp: Number(nextTemporary),
      },
      "Error guardando HP.",
    )
      .catch((err) => {
        setError(`Error guardando HP: ${err.message}`);
        console.error(err);
      })
      .finally(() => setIsSaving(false));
  }

  function handleArmorFieldChange(
    field: "name" | "baseAc" | "maxDexMod" | "bonus",
    value: string,
  ) {
    setCharacter((prev) => {
      if (field === "name") {
        return {
          ...prev,
          armor: {
            ...prev.armor,
            name: value,
          },
        };
      }

      if (field === "maxDexMod") {
        return {
          ...prev,
          armor: {
            ...prev.armor,
            maxDexMod: value === "" || value === "none" ? null : Math.max(0, Number(value)),
          },
        };
      }

      const parsed = Math.max(0, Number(value || 0));
      return {
        ...prev,
        armor: {
          ...prev.armor,
          [field]: field === "baseAc" ? Math.max(1, parsed) : parsed,
        },
      };
    });
  }

  function handleSaveArmorSection() {
    setIsSaving(true);
    setError(null);

    updateCharacterFields(
      {
        armor_name: character.armor.name,
        armor_base_ac: character.armor.baseAc,
        armor_max_dex_mod: character.armor.maxDexMod,
        armor_bonus: character.armor.bonus,
      },
      "Error guardando armadura.",
    )
      .catch((err) => {
        setError(`Error guardando armadura: ${err.message}`);
        console.error(err);
      })
      .finally(() => setIsSaving(false));
  }

  function updateClassResource(
    resourceId: string,
    updater: (resource: ClassResource) => ClassResource,
  ) {
    setCharacter((prev) => ({
      ...prev,
      classResources: prev.classResources.map((resource) =>
        resource.id === resourceId ? updater(resource) : resource,
      ),
    }));
  }

  function handleClassResourceUsedDelta(resourceId: string, delta: number) {
    updateClassResource(resourceId, (resource) => ({
      ...resource,
      used: Math.min(resource.max, Math.max(0, resource.used + delta)),
    }));
  }

  function handleClassResourceUsedInput(resourceId: string, value: string) {
    const parsed = Math.max(0, Math.floor(Number(value || 0)));
    updateClassResource(resourceId, (resource) => ({
      ...resource,
      used: Math.min(resource.max, parsed),
    }));
  }

  function handleClassResourceMaxInput(resourceId: string, value: string) {
    const parsed = Math.max(0, Math.floor(Number(value || 0)));
    updateClassResource(resourceId, (resource) => ({
      ...resource,
      max: parsed,
      used: Math.min(resource.used, parsed),
    }));
  }

  function handleClassResourceResetMode(resourceId: string, resetOn: string) {
    const nextReset =
      resetOn === "short_rest" || resetOn === "long_rest" ? resetOn : "manual";
    updateClassResource(resourceId, (resource) => ({
      ...resource,
      resetOn: nextReset,
    }));
  }

  function handleAddCustomClassResource() {
    if (!resourceNameInput.trim()) {
      setError("Debes indicar un nombre para el recurso de clase.");
      return;
    }

    const max = Math.max(0, Math.floor(Number(resourceMaxInput || 0)));
    const customId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    setCharacter((prev) => ({
      ...prev,
      classResources: [
        ...prev.classResources,
        {
          id: customId,
          name: resourceNameInput.trim(),
          max,
          used: 0,
          resetOn: "manual",
        },
      ],
    }));

    setResourceNameInput("");
    setResourceMaxInput("1");
    setError(null);
  }

  function handleRemoveCustomClassResource(resourceId: string) {
    if (!resourceId.startsWith("custom-")) {
      return;
    }

    setCharacter((prev) => ({
      ...prev,
      classResources: prev.classResources.filter((resource) => resource.id !== resourceId),
    }));
  }

  function handleResetClassResources() {
    setCharacter((prev) => ({
      ...prev,
      classResources: prev.classResources.map((resource) => ({ ...resource, used: 0 })),
    }));
  }

  async function handleSaveClassResources() {
    setIsSaving(true);
    setError(null);

    try {
      await updateCharacterFields(
        { class_resources: character.classResources },
        "No se pudieron guardar los recursos de clase.",
      );
    } catch (saveErr) {
      const message =
        saveErr instanceof Error ? saveErr.message : "No se pudieron guardar los recursos de clase.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleToggleSavingThrow(ability: AbilityKey) {
    const nextSavingThrows: SavingThrows = {
      ...character.savingThrows,
      [ability]: !character.savingThrows[ability],
    };
    const nextCharacter = {
      ...character,
      savingThrows: nextSavingThrows,
    };

    setCharacter(nextCharacter);
    setIsSaving(true);

    // Siempre guarda el objeto completo y con booleanos
    updateCharacterFields(
      { saving_throws: {
          str: !!nextSavingThrows.str,
          dex: !!nextSavingThrows.dex,
          con: !!nextSavingThrows.con,
          int: !!nextSavingThrows.int,
          wis: !!nextSavingThrows.wis,
          cha: !!nextSavingThrows.cha,
        }
      },
      "Error guardando tirada de salvación.",
    )
      .catch((err) => {
        setError(`Error guardando tirada de salvación: ${err.message}`);
        console.error(err);
      })
      .finally(() => setIsSaving(false));
  }

  function openSpellModal(level: string, spell?: SpellCard) {
    setSpellModalLevel(level);
    if (spell) {
      setSpellModalData(spell);
      setSpellModalEditingId(spell.id);
    } else {
      setSpellModalData({
        id: `spell-${Date.now()}-${Math.random()}`,
        name: "",
        level,
        school: "Evocation",
        castingTime: "1 action",
        range: "Self",
        components: [],
        duration: "Instantaneous",
        description: "",
        ritual: false,
      });
      setSpellModalEditingId(null);
    }
    setSpellModalOpen(true);
  }

  function handleSaveSpell() {
    if (!spellModalData.name.trim()) {
      setError("El nombre del hechizo es obligatorio.");
      return;
    }

    const nextCharacter = { ...character };
    const spells = [...(nextCharacter.spellsByLevel[spellModalLevel] ?? [])];

    if (spellModalEditingId) {
      const idx = spells.findIndex((s) => s.id === spellModalEditingId);
      if (idx >= 0) {
        spells[idx] = spellModalData;
      }
    } else {
      spells.push(spellModalData);
    }

    nextCharacter.spellsByLevel = {
      ...nextCharacter.spellsByLevel,
      [spellModalLevel]: spells,
    };

    setCharacter(nextCharacter);
    setSpellModalOpen(false);
    setError(null);

    setIsSaving(true);
    updateCharacterFields(
      { spells_by_level: nextCharacter.spellsByLevel },
      "Error guardando hechizo.",
    )
      .catch((err) => {
        setError(`Error guardando hechizo: ${err.message}`);
        console.error(err);
      })
      .finally(() => setIsSaving(false));
  }

  function handleDeleteSpell(level: string, spellId: string) {
    const nextCharacter = { ...character };
    nextCharacter.spellsByLevel = {
      ...nextCharacter.spellsByLevel,
      [level]: (nextCharacter.spellsByLevel[level] ?? []).filter((s) => s.id !== spellId),
    };

    setCharacter(nextCharacter);

    setIsSaving(true);
    updateCharacterFields(
      { spells_by_level: nextCharacter.spellsByLevel },
      "Error eliminando hechizo.",
    )
      .catch((err) => {
        setError(`Error eliminando hechizo: ${err.message}`);
        console.error(err);
      })
      .finally(() => setIsSaving(false));
  }

  useEffect(() => {
    const channel = supabase
      .channel(`personaje-${character.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "personajes",
          filter: `id=eq.${character.id}`,
        },
        (payload) => {
          const next = mapDbToCharacter(payload.new as Record<string, unknown>);
          setCharacter(next);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [character.id]);

  useEffect(() => {
    setActionDraft(character.actionFeatures.actions.join("\n"));
    setBonusActionDraft(character.actionFeatures.bonusActions.join("\n"));
    setReactionDraft(character.actionFeatures.reactions.join("\n"));
  }, [
    character.actionFeatures.actions,
    character.actionFeatures.bonusActions,
    character.actionFeatures.reactions,
  ]);

  return (
    <section className="parchment-panel p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-900/40 pb-4">
        <div>
          <h2 className="font-serif text-2xl text-teal-100">{character.nombre}</h2>
          <p className="text-sm text-teal-200/80">
            {classConfig.label} nivel {character.level} · Raza {activeRace.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-purple-500/60 bg-purple-700/40 px-3 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-700/70"
            onClick={() => setIsModalOpen(true)}
            type="button"
          >
            Subir Nivel
          </button>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className={`rounded-md px-3 py-2 text-sm ${
            tab === "resumen"
              ? "bg-teal-700/50 text-teal-100"
              : "bg-slate-900/40 text-slate-300"
          }`}
          onClick={() => setTab("resumen")}
          type="button"
        >
          Resumen
        </button>
        <button
          className={`rounded-md px-3 py-2 text-sm ${
            tab === "combate"
              ? "bg-teal-700/50 text-teal-100"
              : "bg-slate-900/40 text-slate-300"
          }`}
          onClick={() => setTab("combate")}
          type="button"
        >
          Combate
        </button>
        <button
          className={`rounded-md px-3 py-2 text-sm ${
            tab === "habilidades"
              ? "bg-teal-700/50 text-teal-100"
              : "bg-slate-900/40 text-slate-300"
          }`}
          onClick={() => setTab("habilidades")}
          type="button"
        >
          Habilidades
        </button>
        <button
          className={`rounded-md px-3 py-2 text-sm ${
            tab === "inventario"
              ? "bg-teal-700/50 text-teal-100"
              : "bg-slate-900/40 text-slate-300"
          }`}
          onClick={() => setTab("inventario")}
          type="button"
        >
          Inventario
        </button>
        <button
          className={`rounded-md px-3 py-2 text-sm ${
            tab === "hechizos"
              ? "bg-teal-700/50 text-teal-100"
              : "bg-slate-900/40 text-slate-300"
          }`}
          onClick={() => setTab("hechizos")}
          type="button"
        >
          Hechizos
        </button>
        <button
          className={`rounded-md px-3 py-2 text-sm ${
            tab === "acciones"
              ? "bg-teal-700/50 text-teal-100"
              : "bg-slate-900/40 text-slate-300"
          }`}
          onClick={() => setTab("acciones")}
          type="button"
        >
          Acciones y Rasgos
        </button>
        <button
          className={`rounded-md px-3 py-2 text-sm ${
            tab === "diario"
              ? "bg-teal-700/50 text-teal-100"
              : "bg-slate-900/40 text-slate-300"
          }`}
          onClick={() => setTab("diario")}
          type="button"
        >
          Diario
        </button>
        <button
          className={`rounded-md px-3 py-2 text-sm ${
            tab === "trasfondo"
              ? "bg-teal-700/50 text-teal-100"
              : "bg-slate-900/40 text-slate-300"
          }`}
          onClick={() => setTab("trasfondo")}
          type="button"
        >
          Trasfondo
        </button>
      </div>

      {tab === "resumen" && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {(Object.keys(finalAbilities) as AbilityKey[]).map((key) => (
                <article
                  key={key}
                  className="rounded-md border border-slate-700/60 bg-slate-900/40 p-3"
                >
                  <p className="text-xs tracking-wide text-teal-200/70">{ABILITY_LABELS[key]}</p>
                  <div className="mt-2">
                    <label className="text-[11px] uppercase tracking-wide text-slate-400">Base</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={character.abilities[key]}
                      onChange={(event) => handleAbilityChange(key, event.target.value)}
                      className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Total racial: <span className="font-semibold text-teal-200">{finalAbilities[key]}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Bono racial: {(raceBonuses[key] ?? 0) >= 0 ? "+" : ""}{raceBonuses[key] ?? 0}
                  </p>
                  <p className="text-sm text-purple-200/90">
                    Mod {modifiers[key] >= 0 ? `+${modifiers[key]}` : modifiers[key]}
                  </p>
                </article>
              ))}
            </div>

            <button
              className="mt-4 rounded-md border border-teal-500/60 bg-teal-700/30 px-4 py-2 text-sm font-semibold text-teal-100 transition hover:bg-teal-700/60 disabled:opacity-60"
              disabled={isSaving}
              onClick={handleSaveAbilities}
              type="button"
            >
              {isSaving ? "Guardando..." : "Guardar Atributos"}
            </button>
          </div>

          <aside className="space-y-3 rounded-md border border-slate-700/60 bg-slate-900/40 p-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">Clase</p>
              <p className="text-lg font-semibold text-teal-100">{classConfig.label}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">Raza</p>
              <p className="text-lg font-semibold text-purple-100">{activeRace.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">Rasgos raciales</p>
              {normalizedRaceTraits.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {normalizedRaceTraits.map((trait, index) => (
                    <button
                      key={`${trait.name}-${index}`}
                      type="button"
                      className="group relative rounded-full border border-purple-500/40 bg-purple-900/30 px-3 py-1 text-xs font-semibold text-purple-100 transition hover:bg-purple-800/40"
                    >
                      {trait.name}
                      <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-teal-700/50 text-[10px] text-teal-100">
                        ?
                      </span>

                      <span className="pointer-events-none absolute left-1/2 top-[calc(100%+12px)] z-20 w-60 -translate-x-1/2 rounded-2xl border-2 border-teal-400/70 bg-slate-950/95 p-3 text-left text-xs font-medium leading-relaxed text-teal-100 opacity-0 shadow-[0_10px_30px_rgba(20,184,166,0.25)] transition duration-150 group-hover:opacity-100 group-focus:opacity-100">
                        {trait.description}
                        <span className="absolute -top-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l-2 border-t-2 border-teal-400/70 bg-slate-950/95" />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-400">Sin rasgos definidos</p>
              )}
            </div>
          </aside>
        </div>
      )}

      {tab === "combate" && (
        <div className="mt-4 grid gap-4">
          <section className="rounded-md border border-slate-700/60 bg-slate-900/40 p-4">
            <h3 className="text-lg font-semibold text-teal-100 mb-3">Puntos de Vida</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm text-slate-300">HP Actual</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    min="0"
                    value={currentHpInput}
                    onChange={(e) => setCurrentHpInput(e.target.value)}
                    className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={handleUpdateHP}
                    className="rounded bg-teal-700/60 px-3 py-1 text-sm font-semibold text-teal-100 hover:bg-teal-700/80"
                  >
                    Guardar
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Máximo: {maxHp}</p>
              </div>

              <div>
                <label className="text-sm text-slate-300">HP Temporal</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    min="0"
                    value={temporaryHpInput}
                    onChange={(e) => setTemporaryHpInput(e.target.value)}
                    className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={handleUpdateHP}
                    className="rounded bg-purple-700/60 px-3 py-1 text-sm font-semibold text-purple-100 hover:bg-purple-700/80"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <p className="text-sm text-slate-300">HP Máximo</p>
                <p className="text-2xl font-bold text-teal-100">{maxHp}</p>
              </div>
              <div>
                <p className="text-sm text-slate-300">HP Actual</p>
                <p className="text-2xl font-bold text-cyan-100">{character.currentHp}</p>
              </div>
              <div>
                <p className="text-sm text-slate-300">HP Temporal</p>
                <p className="text-2xl font-bold text-purple-100">{character.temporaryHp}</p>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-slate-700/60 bg-slate-900/40 p-4">
            <h3 className="text-lg font-semibold text-teal-100 mb-3">Armadura</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm text-slate-300">Armadura equipada</label>
                <input
                  type="text"
                  value={character.armor.name}
                  onChange={(event) => handleArmorFieldChange("name", event.target.value)}
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
                  placeholder="Ej: Cota de malla"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300">CA base de armadura</label>
                <input
                  type="number"
                  min="1"
                  value={character.armor.baseAc}
                  onChange={(event) => handleArmorFieldChange("baseAc", event.target.value)}
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300">Tope modificador DES</label>
                <select
                  value={character.armor.maxDexMod === null ? "none" : String(character.armor.maxDexMod)}
                  onChange={(event) => handleArmorFieldChange("maxDexMod", event.target.value)}
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
                >
                  <option value="none">Sin límite</option>
                  <option value="0">+0</option>
                  <option value="1">+1</option>
                  <option value="2">+2</option>
                  <option value="3">+3</option>
                  <option value="4">+4</option>
                  <option value="5">+5</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-300">Bono adicional CA</label>
                <input
                  type="number"
                  min="0"
                  value={character.armor.bonus}
                  onChange={(event) => handleArmorFieldChange("bonus", event.target.value)}
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
                />
              </div>
            </div>

            <div className="mt-4 rounded border border-slate-700 bg-slate-800/30 p-3">
              <p className="text-sm text-slate-300">
                CA final: <span className="text-xl font-bold text-teal-100">{armorClass}</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Formula: {character.armor.baseAc} + {character.armor.maxDexMod === null ? "DES" : `min(DES, ${character.armor.maxDexMod})`} + {character.armor.bonus}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveArmorSection}
              disabled={isSaving}
              className="mt-4 rounded-md border border-teal-500/60 bg-teal-700/30 px-4 py-2 text-sm font-semibold text-teal-100 transition hover:bg-teal-700/60 disabled:opacity-60"
            >
              {isSaving ? "Guardando..." : "Guardar Armadura"}
            </button>
          </section>

          <section className="rounded-md border border-slate-700/60 bg-slate-900/40 p-4">
            <h3 className="text-lg font-semibold text-teal-100 mb-3">Tiradas de Salvación</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {(["str", "dex", "con", "int", "wis", "cha"] as AbilityKey[]).map((ability) => {
                const modifier = modifiers[ability];
                const isProficient = character.savingThrows[ability];
                const total = modifier + (isProficient ? proficiencyBonus : 0);

                return (
                  <label
                    key={ability}
                    className="flex items-center gap-2 rounded border border-slate-600 bg-slate-800/50 px-3 py-2 cursor-pointer hover:bg-slate-800/80"
                  >
                    <input
                      type="checkbox"
                      checked={isProficient}
                      onChange={() => handleToggleSavingThrow(ability)}
                      className="rounded border-slate-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-slate-300">
                        {ABILITY_LABELS[ability]}
                      </span>
                      <span
                        className={`ml-2 text-lg font-bold ${
                          total >= 0
                            ? "text-teal-100"
                            : "text-red-400"
                        }`}
                      >
                        {total >= 0 ? "+" : ""}{total}
                      </span>
                    </div>
                    {isProficient && (
                      <span className="text-xs font-semibold text-yellow-300">Prof.</span>
                    )}
                  </label>
                );
              })}
            </div>

            <div className="mt-4 p-3 rounded bg-slate-800/30 border border-slate-700">
              <p className="text-xs text-slate-400">
                Tiradas de salvación: Marca competencia en la habilidad para añadir tu bono.
              </p>
            </div>
          </section>

          <section className="rounded-md border border-slate-700/60 bg-slate-900/40 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-teal-100">Recursos de clase</h3>
              <button
                type="button"
                onClick={handleResetClassResources}
                className="rounded-md border border-purple-500/50 bg-purple-900/30 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-800/45"
              >
                Resetear usos
              </button>
            </div>

            {character.classResources.length === 0 ? (
              <p className="text-sm text-slate-400">Esta clase no tiene recursos configurados por defecto.</p>
            ) : (
              <div className="space-y-2">
                {character.classResources.map((resource) => {
                  const remaining = Math.max(0, resource.max - resource.used);
                  return (
                    <article key={resource.id} className="rounded-md border border-slate-700/60 bg-slate-950/45 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-100">{resource.name}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          {resource.resetOn === "short_rest"
                            ? "Recarga: descanso corto"
                            : resource.resetOn === "long_rest"
                              ? "Recarga: descanso largo"
                              : "Recarga: manual"}
                        </p>
                      </div>

                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[auto_auto_1fr_auto] sm:items-center">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleClassResourceUsedDelta(resource.id, -1)}
                            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => handleClassResourceUsedDelta(resource.id, 1)}
                            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                          >
                            +
                          </button>
                        </div>

                        <label className="text-xs text-slate-400">
                          Usados
                          <input
                            type="number"
                            min={0}
                            max={resource.max}
                            value={resource.used}
                            onChange={(event) =>
                              handleClassResourceUsedInput(resource.id, event.target.value)
                            }
                            className="mt-1 w-20 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                          />
                        </label>

                        <label className="text-xs text-slate-400">
                          Máximo
                          <input
                            type="number"
                            min={0}
                            value={resource.max}
                            onChange={(event) =>
                              handleClassResourceMaxInput(resource.id, event.target.value)
                            }
                            className="mt-1 w-20 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                          />
                        </label>

                        <p className="text-sm text-teal-100">Restantes: {remaining}</p>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label className="text-xs text-slate-400">Recarga</label>
                        <select
                          value={resource.resetOn}
                          onChange={(event) =>
                            handleClassResourceResetMode(resource.id, event.target.value)
                          }
                          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                        >
                          <option value="short_rest">Descanso corto</option>
                          <option value="long_rest">Descanso largo</option>
                          <option value="manual">Manual</option>
                        </select>

                        {resource.id.startsWith("custom-") && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomClassResource(resource.id)}
                            className="rounded border border-rose-500/50 bg-rose-900/30 px-2 py-1 text-xs text-rose-100"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="mt-4 rounded-md border border-slate-700/60 bg-slate-950/45 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Añadir recurso personalizado</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_110px_auto]">
                <input
                  type="text"
                  value={resourceNameInput}
                  onChange={(event) => setResourceNameInput(event.target.value)}
                  className="rounded border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
                  placeholder="Ej: Inspiración bárdica"
                />
                <input
                  type="number"
                  min={0}
                  value={resourceMaxInput}
                  onChange={(event) => setResourceMaxInput(event.target.value)}
                  className="rounded border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
                  placeholder="Máx"
                />
                <button
                  type="button"
                  onClick={handleAddCustomClassResource}
                  className="rounded-md border border-teal-500/60 bg-teal-700/30 px-3 py-2 text-sm font-semibold text-teal-100 transition hover:bg-teal-700/60"
                >
                  Añadir
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveClassResources}
              disabled={isSaving}
              className="mt-4 rounded-md border border-teal-500/60 bg-teal-700/30 px-4 py-2 text-sm font-semibold text-teal-100 transition hover:bg-teal-700/60 disabled:opacity-60"
            >
              {isSaving ? "Guardando..." : "Guardar Recursos"}
            </button>
          </section>

          <section className="rounded-md border border-slate-700/60 bg-slate-900/40 p-4">
            <p className="text-sm text-slate-300">Bono de Competencia</p>
            <p className="text-xl font-semibold text-purple-100">+{proficiencyBonus}</p>

            <p className="mt-4 text-sm text-slate-300">Dado de vida</p>
            <p className="text-slate-200">d{classConfig.hitDie}</p>

            <p className="mt-4 text-sm text-slate-300">Dotes</p>
            <ul className="mt-1 space-y-1 text-sm text-slate-200">
              {character.feats.length > 0 ? (
                character.feats.map((feat) => <li key={feat}>• {feat}</li>)
              ) : (
                <li>Sin dotes aun</li>
              )}
            </ul>

            <p className="mt-4 text-sm text-slate-300">Tiradas de vida guardadas</p>
            <p className="text-sm text-slate-200">
              {character.hitRolls.length > 0 ? character.hitRolls.join(", ") : "Ninguna tirada manual."}
            </p>

            <button
              className="mt-4 rounded-md border border-teal-500/60 bg-teal-700/30 px-4 py-2 text-sm font-semibold text-teal-100 transition hover:bg-teal-700/60 disabled:opacity-60"
              disabled={isSaving}
              onClick={handleSaveCombatSection}
              type="button"
            >
              {isSaving ? "Guardando..." : "Guardar Combate"}
            </button>
          </section>
        </div>
      )}

      {tab === "habilidades" && (
        <div className="mt-4 rounded-md border border-slate-700/60 bg-slate-900/40 p-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {SKILL_CONFIG.map((skill) => {
              const isProficient = character.skillProficiencies.includes(skill.key);
              const skillValue =
                modifiers[skill.ability] + (isProficient ? proficiencyBonus : 0);

              return (
                <label
                  key={skill.key}
                  className="flex items-center justify-between rounded-md border border-slate-700/50 bg-slate-950/40 px-3 py-2"
                >
                  <span className="text-sm text-slate-200">
                    {skill.label}
                    <span className="ml-2 text-xs text-slate-400">({ABILITY_LABELS[skill.ability]})</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-teal-100">
                      {skillValue >= 0 ? `+${skillValue}` : skillValue}
                    </span>
                    <input
                      checked={isProficient}
                      onChange={() => handleToggleSkill(skill.key)}
                      type="checkbox"
                    />
                  </span>
                </label>
              );
            })}
          </div>
          <button
            className="mt-4 rounded-md border border-teal-500/60 bg-teal-700/30 px-4 py-2 text-sm font-semibold text-teal-100 transition hover:bg-teal-700/60 disabled:opacity-60"
            disabled={isSaving}
            onClick={handleSaveCharacterSection}
            type="button"
          >
            {isSaving ? "Guardando..." : "Guardar Habilidades"}
          </button>
        </div>
      )}

      {tab === "inventario" && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
          <section className="rounded-md border border-slate-700/60 bg-slate-900/40 p-4">
            <h3 className="text-lg font-semibold text-amber-100">Monedas</h3>
            <div className="mt-2">
              <label className="text-sm text-slate-300">Oro del personaje (PO)</label>
              <input
                className="mt-1 w-full rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-slate-100"
                min={0}
                onChange={(event) =>
                  setCharacter((prev) => ({
                    ...prev,
                    gold: Math.max(0, Number(event.target.value || 0)),
                  }))
                }
                type="number"
                value={character.gold}
              />
              <p className="mt-1 text-xs text-slate-500">Se guarda al pulsar "Guardar Inventario".</p>
            </div>

            <h3 className="text-lg font-semibold text-teal-100">Nuevo objeto</h3>
            <div className="mt-3 space-y-2">
              <input
                className="w-full rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-slate-100"
                onChange={(event) => setInventoryName(event.target.value)}
                placeholder="Nombre del objeto"
                value={inventoryName}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="w-full rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-slate-100"
                  min={1}
                  onChange={(event) => setInventoryQty(event.target.value)}
                  placeholder="Cantidad"
                  type="number"
                  value={inventoryQty}
                />
                <input
                  className="w-full rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-slate-100"
                  min={0}
                  onChange={(event) => setInventoryWeight(event.target.value)}
                  placeholder="Peso"
                  step="0.1"
                  type="number"
                  value={inventoryWeight}
                />
              </div>
              <input
                className="w-full rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-slate-100"
                onChange={(event) => setInventoryNotes(event.target.value)}
                placeholder="Notas"
                value={inventoryNotes}
              />
              <button
                className="w-full rounded-md border border-purple-500/60 bg-purple-700/30 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-700/60"
                onClick={handleAddInventoryItem}
                type="button"
              >
                Anadir al inventario
              </button>
            </div>
          </section>

          <section className="rounded-md border border-slate-700/60 bg-slate-900/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-teal-100">Equipo cargado</h3>
              <p className="text-sm text-slate-300">Peso total: {totalInventoryWeight.toFixed(1)}</p>
            </div>
            <p className="mb-3 text-sm text-amber-100">Oro actual: {character.gold} PO</p>
            <div className="space-y-2">
              {character.inventoryItems.length === 0 && (
                <p className="text-sm text-slate-400">Sin objetos cargados.</p>
              )}
              {character.inventoryItems.map((item) => (
                <article
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-slate-700/50 bg-slate-950/40 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{item.name}</p>
                    <p className="text-xs text-slate-400">
                      x{item.qty} · {item.weight} peso · {item.notes || "Sin notas"}
                    </p>
                  </div>
                  <button
                    className="rounded-md border border-rose-500/50 bg-rose-900/30 px-2 py-1 text-xs text-rose-200"
                    onClick={() => handleRemoveInventoryItem(item.id)}
                    type="button"
                  >
                    Quitar
                  </button>
                </article>
              ))}
            </div>

            <button
              className="mt-4 rounded-md border border-teal-500/60 bg-teal-700/30 px-4 py-2 text-sm font-semibold text-teal-100 transition hover:bg-teal-700/60 disabled:opacity-60"
              disabled={isSaving}
              onClick={handleSaveCharacterSection}
              type="button"
            >
              {isSaving ? "Guardando..." : "Guardar Inventario"}
            </button>
          </section>
        </div>
      )}

      {tab === "hechizos" && (
        <div className="mt-4 space-y-4">
          {SPELL_LEVELS.map((level) => (
            <section key={level} className="rounded-md border border-slate-700/60 bg-slate-900/40 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-purple-100">
                  {level === "0" ? "Trucos (Nivel 0)" : `Hechizos de nivel ${level}`}
                </h3>
                <div className="flex items-center gap-3">
                  {level !== "0" && (
                    <div className="flex items-center gap-2 text-sm">
                      <label className="text-slate-300">Espacios:</label>
                      <input
                        className="w-12 rounded-md border border-slate-700/60 bg-slate-950/60 px-2 py-1 text-slate-100"
                        min={0}
                        onChange={(event) => handleSpellSlotChange(level, "max", event.target.value)}
                        type="number"
                        value={character.spellSlots[level]?.max ?? 0}
                      />
                      <span className="text-slate-400">/</span>
                      <input
                        className="w-12 rounded-md border border-slate-700/60 bg-slate-950/60 px-2 py-1 text-slate-100"
                        min={0}
                        onChange={(event) => handleSpellSlotChange(level, "used", event.target.value)}
                        type="number"
                        value={character.spellSlots[level]?.used ?? 0}
                      />
                    </div>
                  )}
                  <button
                    className="rounded bg-teal-700/60 px-3 py-1 text-sm font-semibold text-teal-100 hover:bg-teal-700/80"
                    onClick={() => openSpellModal(level)}
                    type="button"
                  >
                    + Hechizo
                  </button>
                </div>
              </div>

              {(character.spellsByLevel[level] ?? []).length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3\">
                  {(character.spellsByLevel[level] ?? []).map((spell) => (
                    <div
                      key={spell.id}
                      className="rounded-md border border-purple-700/40 bg-purple-950/30 p-3 hover:bg-purple-950/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-purple-100">{spell.name}</h4>
                          <p className="text-xs text-purple-300">
                            {spell.school} • {spell.castingTime}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            <span className="font-semibold text-slate-300">Rango:</span> {spell.range}
                          </p>
                          {spell.components.length > 0 && (
                            <p className="text-xs text-slate-400">
                              <span className="font-semibold text-slate-300">Componentes:</span> {spell.components.join(", ")}
                            </p>
                          )}
                          <p className="text-xs text-slate-400">
                            <span className="font-semibold text-slate-300">Duración:</span> {spell.duration}
                          </p>
                          {spell.ritual && (
                            <p className="mt-1 text-xs font-semibold text-yellow-400">⭐ Ritual</p>
                          )}
                          {spell.description && (
                            <p className="mt-2 text-xs text-slate-300 line-clamp-2">{spell.description}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            className="rounded bg-blue-700/60 px-2 py-1 text-xs font-semibold text-blue-100 hover:bg-blue-700/80"
                            onClick={() => openSpellModal(level, spell)}
                            type="button"
                          >
                            Editar
                          </button>
                          <button
                            className="rounded bg-red-700/60 px-2 py-1 text-xs font-semibold text-red-100 hover:bg-red-700/80"
                            onClick={() => handleDeleteSpell(level, spell.id)}
                            type="button"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Sin hechizos en este nivel.</p>
              )}
            </section>
          ))}

          <button
            className="rounded-md border border-teal-500/60 bg-teal-700/30 px-4 py-2 text-sm font-semibold text-teal-100 transition hover:bg-teal-700/60 disabled:opacity-60"
            disabled={isSaving}
            onClick={handleSaveSpellsSection}
            type="button"
          >
            {isSaving ? "Guardando..." : "Guardar Hechizos"}
          </button>
        </div>
      )}

      {spellModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-purple-700/60 bg-slate-950 p-6">
            <h2 className="mb-4 text-2xl font-bold text-purple-100">
              {spellModalEditingId ? "Editar Hechizo" : "Nuevo Hechizo"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={spellModalData.name}
                  onChange={(e) => setSpellModalData({ ...spellModalData, name: e.target.value })}
                  className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
                  placeholder="Nombre del hechizo"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Escuela</label>
                  <select
                    value={spellModalData.school}
                    onChange={(e) => setSpellModalData({ ...spellModalData, school: e.target.value })}
                    className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
                  >
                    {["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Tiempo de lanzamiento</label>
                  <input
                    type="text"
                    value={spellModalData.castingTime}
                    onChange={(e) => setSpellModalData({ ...spellModalData, castingTime: e.target.value })}
                    className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
                    placeholder="1 action"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Rango</label>
                  <input
                    type="text"
                    value={spellModalData.range}
                    onChange={(e) => setSpellModalData({ ...spellModalData, range: e.target.value })}
                    className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
                    placeholder="Self, 30 feet..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Duración</label>
                  <input
                    type="text"
                    value={spellModalData.duration}
                    onChange={(e) => setSpellModalData({ ...spellModalData, duration: e.target.value })}
                    className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
                    placeholder="Instantaneous, 1 minute..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Componentes</label>
                <div className="flex gap-4">
                  {["V", "S", "M"].map((comp) => (
                    <label key={comp} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={spellModalData.components.includes(comp)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...spellModalData.components, comp]
                            : spellModalData.components.filter((c) => c !== comp);
                          setSpellModalData({ ...spellModalData, components: next });
                        }}
                      />
                      <span className="text-slate-300">{comp === "V" ? "Verbal" : comp === "S" ? "Somatic" : "Material"}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={spellModalData.ritual}
                    onChange={(e) => setSpellModalData({ ...spellModalData, ritual: e.target.checked })}
                  />
                  <span className="text-slate-300">Ritual</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">Descripción</label>
                <textarea
                  value={spellModalData.description}
                  onChange={(e) => setSpellModalData({ ...spellModalData, description: e.target.value })}
                  className="min-h-[100px] w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
                  placeholder="Describe el efecto del hechizo..."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                className="rounded border border-slate-600 bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700"
                onClick={() => setSpellModalOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded bg-purple-700/60 px-4 py-2 font-semibold text-purple-100 hover:bg-purple-700/80 disabled:opacity-60"
                onClick={handleSaveSpell}
                type="button"
                disabled={isSaving}
              >
                {isSaving ? "Guardando..." : "Guardar Hechizo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "acciones" && (
        <div className="mt-4 space-y-4 rounded-md border border-slate-700/60 bg-slate-900/40 p-4">
          <p className="text-sm text-slate-400">Una linea por rasgo/accion.</p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-slate-300">Acciones</label>
              <textarea
                className="min-h-[180px] w-full rounded-md border border-slate-700/60 bg-slate-950/60 p-3 text-sm text-slate-100"
                onChange={(event) => setActionDraft(event.target.value)}
                value={actionDraft}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Acciones bonus</label>
              <textarea
                className="min-h-[180px] w-full rounded-md border border-slate-700/60 bg-slate-950/60 p-3 text-sm text-slate-100"
                onChange={(event) => setBonusActionDraft(event.target.value)}
                value={bonusActionDraft}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Reacciones</label>
              <textarea
                className="min-h-[180px] w-full rounded-md border border-slate-700/60 bg-slate-950/60 p-3 text-sm text-slate-100"
                onChange={(event) => setReactionDraft(event.target.value)}
                value={reactionDraft}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md border border-purple-500/60 bg-purple-700/30 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-700/60"
              onClick={handleApplyActionsDraft}
              type="button"
            >
              Aplicar cambios
            </button>
            <button
              className="rounded-md border border-teal-500/60 bg-teal-700/30 px-4 py-2 text-sm font-semibold text-teal-100 transition hover:bg-teal-700/60 disabled:opacity-60"
              disabled={isSaving}
              onClick={handleSaveCharacterSection}
              type="button"
            >
              {isSaving ? "Guardando..." : "Guardar Acciones"}
            </button>
          </div>
        </div>
      )}

      {tab === "diario" && (
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-slate-700/60 bg-slate-900/40 p-4">
            <h3 className="text-lg font-semibold text-teal-100">Diario de Campana</h3>
            <p className="mt-1 text-sm text-slate-400">
              Cada entrada se agrupa automaticamente por dia.
            </p>

            <textarea
              className="mt-3 min-h-[120px] w-full rounded-md border border-slate-700/60 bg-slate-950/60 p-3 text-slate-100 outline-none ring-teal-500/60 placeholder:text-slate-500 focus:ring"
              onChange={(event) => setJournalInput(event.target.value)}
              placeholder="Escribe una nueva entrada del diario..."
              value={journalInput}
            />
            <button
              className="mt-3 rounded-md border border-teal-500/60 bg-teal-700/30 px-4 py-2 text-sm font-semibold text-teal-100 transition hover:bg-teal-700/60 disabled:opacity-60"
              disabled={isSaving}
              onClick={handleAddJournalEntry}
              type="button"
            >
              {isSaving ? "Guardando..." : "Anadir Entrada"}
            </button>

            <div className="mt-5 space-y-3">
              {journalByDay.length === 0 && (
                <p className="text-sm text-slate-400">Aun no hay entradas de diario.</p>
              )}

              {journalByDay.map(([dayKey, entries], dayIndex) => (
                <details
                  key={dayKey}
                  className="rounded-md border border-slate-700/60 bg-slate-950/40"
                  open={dayIndex === 0}
                >
                  <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-purple-200">
                    {formatDayLabel(dayKey)} ({entries.length})
                  </summary>
                  <ul className="space-y-2 border-t border-slate-700/50 px-3 py-3">
                    {entries.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-md border border-slate-700/40 bg-slate-900/40 p-3"
                      >
                        <p className="mb-1 text-xs text-slate-400">{formatEntryTime(entry.createdAt)}</p>
                        <p className="whitespace-pre-wrap text-sm text-slate-200">{entry.content}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "trasfondo" && (
        <div className="mt-4 rounded-md border border-slate-700/60 bg-slate-900/40 p-4">
          <label className="block text-sm text-slate-300" htmlFor="blog-historia">
            Trasfondo y notas generales
          </label>
          <textarea
            id="blog-historia"
            className="mt-2 min-h-[240px] w-full rounded-md border border-slate-700/60 bg-slate-950/60 p-3 text-slate-100 outline-none ring-teal-500/60 placeholder:text-slate-500 focus:ring"
            onChange={(event) =>
              setCharacter((prev) => ({ ...prev, historyBlog: event.target.value }))
            }
            placeholder="Historia personal, vinculos, ideales, defectos, objetivos..."
            value={character.historyBlog}
          />
          <button
            className="mt-3 rounded-md border border-teal-500/60 bg-teal-700/30 px-4 py-2 text-sm font-semibold text-teal-100 transition hover:bg-teal-700/60 disabled:opacity-60"
            disabled={isSaving}
            onClick={handleSaveBlog}
            type="button"
          >
            {isSaving ? "Guardando..." : "Guardar Trasfondo"}
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-lg font-semibold text-teal-100">Subir de Nivel</h3>

            <div className="mt-4 grid gap-4">
              <label className="text-sm text-slate-300">
                Tirada de vida
                <input
                  className="mt-1 w-full rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-slate-100"
                  disabled={useAverage}
                  max={classConfig.hitDie}
                  min={1}
                  onChange={(event) => setHitRollInput(event.target.value)}
                  placeholder={`1 - ${classConfig.hitDie}`}
                  type="number"
                  value={hitRollInput}
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                <input
                  checked={useAverage}
                  onChange={(event) => setUseAverage(event.target.checked)}
                  type="checkbox"
                />
                Usar promedio del dado de vida
              </label>

              <fieldset className="space-y-2">
                <legend className="text-sm text-slate-300">
                  ASI o Dote (si aplica al nivel)
                </legend>

                <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                  <input
                    checked={advancementChoice === "asi"}
                    name="advancement-choice"
                    onChange={() => setAdvancementChoice("asi")}
                    type="radio"
                  />
                  Aumentar Caracteristica (ASI)
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                  <input
                    checked={advancementChoice === "feat"}
                    name="advancement-choice"
                    onChange={() => setAdvancementChoice("feat")}
                    type="radio"
                  />
                  Elegir Dote
                </label>

                {advancementChoice === "asi" && (
                  <select
                    className="mt-1 w-full rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-slate-100"
                    onChange={(event) => setAsiStat(event.target.value as AbilityKey)}
                    value={asiStat}
                  >
                    {(Object.keys(ABILITY_LABELS) as AbilityKey[]).map((key) => (
                      <option key={key} value={key}>
                        {ABILITY_LABELS[key]}
                      </option>
                    ))}
                  </select>
                )}

                {advancementChoice === "feat" && (
                  <input
                    className="mt-1 w-full rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-slate-100"
                    onChange={(event) => setFeatName(event.target.value)}
                    placeholder="Nombre de la dote"
                    type="text"
                    value={featName}
                  />
                )}
              </fieldset>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200"
                onClick={() => setIsModalOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-md border border-teal-500/60 bg-teal-700/40 px-4 py-2 text-sm font-semibold text-teal-100 disabled:opacity-60"
                disabled={isSaving}
                onClick={handleLevelUp}
                type="button"
              >
                {isSaving ? "Guardando..." : "Confirmar Nivel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
