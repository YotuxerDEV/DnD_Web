export type ClassResourceReset = "short_rest" | "long_rest" | "manual";

export type ClassResource = {
  id: string;
  name: string;
  max: number;
  used: number;
  resetOn: ClassResourceReset;
};

function createResource(
  id: string,
  name: string,
  max: number,
  resetOn: ClassResourceReset,
): ClassResource {
  return {
    id,
    name,
    max: Math.max(0, Math.floor(max)),
    used: 0,
    resetOn,
  };
}

export function normalizeClassResources(value: unknown): ClassResource[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry): ClassResource | null => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const data = entry as Record<string, unknown>;
      const id = String(data.id ?? "").trim();
      const name = String(data.name ?? "").trim();
      if (!id || !name) {
        return null;
      }

      const max = Math.max(0, Math.floor(Number(data.max ?? 0)));
      const used = Math.max(0, Math.floor(Number(data.used ?? 0)));
      const resetRaw = String(data.resetOn ?? "manual");
      const resetOn: ClassResourceReset =
        resetRaw === "short_rest" || resetRaw === "long_rest" ? resetRaw : "manual";

      return {
        id,
        name,
        max,
        used: Math.min(used, max),
        resetOn,
      };
    })
    .filter((entry): entry is ClassResource => Boolean(entry));
}

export function getDefaultClassResources(clase: string, level: number): ClassResource[] {
  const lvl = Math.max(1, Math.floor(level));

  switch (clase) {
    case "barbarian":
      return [
        createResource(
          "barbarian-rage",
          "Furia",
          lvl >= 17 ? 6 : lvl >= 12 ? 5 : lvl >= 6 ? 4 : lvl >= 3 ? 3 : 2,
          "long_rest",
        ),
      ];

    case "fighter":
      return [
        createResource("fighter-second-wind", "Second Wind", 1, "short_rest"),
        ...(lvl >= 2
          ? [createResource("fighter-action-surge", "Action Surge", lvl >= 17 ? 2 : 1, "short_rest")]
          : []),
      ];

    case "paladin":
      return [
        createResource("paladin-lay-on-hands", "Lay on Hands (pool)", lvl * 5, "long_rest"),
        ...(lvl >= 3
          ? [createResource("paladin-channel-divinity", "Channel Divinity", 1, "short_rest")]
          : []),
      ];

    case "cleric":
      return lvl >= 2
        ? [
            createResource(
              "cleric-channel-divinity",
              "Channel Divinity",
              lvl >= 18 ? 3 : lvl >= 6 ? 2 : 1,
              "short_rest",
            ),
          ]
        : [];

    case "druid":
      return lvl >= 2
        ? [createResource("druid-wild-shape", "Wild Shape", 2, "short_rest")]
        : [];

    case "monk":
      return lvl >= 2
        ? [createResource("monk-ki", "Ki", lvl, "short_rest")]
        : [];

    case "sorcerer":
      return lvl >= 2
        ? [createResource("sorcerer-sorcery-points", "Sorcery Points", lvl, "long_rest")]
        : [];

    case "wizard":
      return [createResource("wizard-arcane-recovery", "Arcane Recovery", 1, "long_rest")];

    default:
      return [];
  }
}

export function syncClassResourcesForProgression(
  currentResources: ClassResource[],
  clase: string,
  level: number,
): ClassResource[] {
  const defaults = getDefaultClassResources(clase, level);
  const defaultIds = new Set(defaults.map((resource) => resource.id));

  const mergedDefaults = defaults.map((resource) => {
    const existing = currentResources.find((item) => item.id === resource.id);
    if (!existing) {
      return resource;
    }

    return {
      ...resource,
      used: Math.min(Math.max(0, existing.used), resource.max),
    };
  });

  const custom = currentResources.filter((resource) => !defaultIds.has(resource.id));
  return [...mergedDefaults, ...custom];
}
