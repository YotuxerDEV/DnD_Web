type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

type Abilities = Record<AbilityKey, number>;

export type RaceTrait = {
  name: string;
  description: string;
};

export type RacialSpell = {
  name: string;
  level: string;
  school: string;
  castingTime: string;
  range: string;
  components: string[];
  duration: string;
  description: string;
  ritual?: boolean;
};

export type AppRace = {
  name: string;
  statBonuses?: Partial<Abilities>;
  hpPerLevelBonus?: number;
  traits: RaceTrait[];
  startingSpells?: RacialSpell[];
  innateArmorNote?: string;
};

export const RACES_CONFIG: Record<string, AppRace> = {
  humano: {
    name: "Humano",
    statBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    traits: [{ name: "Versatilidad", description: "+1 a todas las caracteristicas." }],
  },
  tiefling_abisal: {
    name: "Tiefling Abisal",
    statBonuses: { cha: 2, int: 1 },
    traits: [
      { name: "Resistencia infernal", description: "Resistencia al dano de fuego." },
      { name: "Taumaturgia", description: "Conoces el truco Taumaturgia." },
    ],
    startingSpells: [
      {
        name: "Taumaturgia",
        level: "0",
        school: "Transmutation",
        castingTime: "1 action",
        range: "30 feet",
        components: ["V"],
        duration: "Up to 1 minute",
        description: "Efectos menores sobrenaturales.",
      },
    ],
  },
  enano_runico: {
    name: "Enano Runico",
    statBonuses: { con: 2, wis: 1 },
    hpPerLevelBonus: 1,
    traits: [
      { name: "Memoria de piedra", description: "Gran memoria de ruinas y artesania." },
      { name: "Armadura natural ligera", description: "Defensa base superior sin armadura pesada." },
    ],
    innateArmorNote: "Defensa racial: armadura natural ligera.",
  },

  elfo_alto: {
    name: "Elfo Alto",
    statBonuses: { dex: 2, int: 1 },
    traits: [
      { name: "Vision en la oscuridad", description: "Vision en penumbra/oscuridad hasta 60 pies." },
      { name: "Linaje feerico", description: "Ventaja contra hechizado." },
      { name: "Truco arcano", description: "Conoces un truco de mago." },
    ],
  },
  elfo_bosque: {
    name: "Elfo de Bosque",
    statBonuses: { dex: 2, wis: 1 },
    traits: [
      { name: "Vision en la oscuridad", description: "Vision en penumbra/oscuridad hasta 60 pies." },
      { name: "Mascara de lo salvaje", description: "Mejor ocultacion en entornos naturales." },
      { name: "Pies ligeros", description: "Velocidad base elevada." },
    ],
  },
  enano_colina: {
    name: "Enano de Colina",
    statBonuses: { con: 2, wis: 1 },
    hpPerLevelBonus: 1,
    traits: [
      { name: "Resistencia enana", description: "Ventaja contra veneno y resistencia al dano de veneno." },
      { name: "Dureza enana", description: "+1 PV maximo por nivel." },
    ],
  },
  enano_montana: {
    name: "Enano de Montana",
    statBonuses: { con: 2, str: 2 },
    traits: [
      { name: "Entrenamiento en armaduras", description: "Competencia en armadura ligera/media." },
      { name: "Resistencia enana", description: "Ventaja contra veneno y resistencia al dano de veneno." },
    ],
  },
  halfling_ligero: {
    name: "Halfling Ligero",
    statBonuses: { dex: 2, cha: 1 },
    traits: [
      { name: "Afortunado", description: "Puedes repetir 1s en d20." },
      { name: "Sigiloso natural", description: "Ocultacion mas facil." },
    ],
  },
  halfling_fornido: {
    name: "Halfling Fornido",
    statBonuses: { dex: 2, con: 1 },
    traits: [
      { name: "Afortunado", description: "Puedes repetir 1s en d20." },
      { name: "Resistencia robusta", description: "Ventaja contra veneno y resistencia al dano de veneno." },
    ],
  },
  gnomo_bosque: {
    name: "Gnomo de Bosque",
    statBonuses: { int: 2, dex: 1 },
    traits: [
      { name: "Astucia gnomica", description: "Ventaja en salvaciones mentales contra magia." },
      { name: "Ilusion menor", description: "Conoces el truco Ilusion menor." },
    ],
  },
  gnomo_roca: {
    name: "Gnomo de Roca",
    statBonuses: { int: 2, con: 1 },
    traits: [
      { name: "Astucia gnomica", description: "Ventaja en salvaciones mentales contra magia." },
      { name: "Conocimiento del artifice", description: "Mejoras en objetos y artilugios." },
    ],
  },
  semielfo: {
    name: "Semielfo",
    statBonuses: { cha: 2 },
    traits: [
      { name: "Versatilidad", description: "Dos bonificadores adicionales de +1 a elegir." },
      { name: "Linaje feerico", description: "Ventaja contra hechizado." },
    ],
  },
  semiorco: {
    name: "Semiorco",
    statBonuses: { str: 2, con: 1 },
    traits: [
      { name: "Aguante incansable", description: "Evitas caer una vez al dia." },
      { name: "Ataques salvajes", description: "Criticos mas duros en melé." },
    ],
  },
  draconido: {
    name: "Draconido",
    statBonuses: { str: 2, cha: 1 },
    traits: [
      { name: "Arma de aliento", description: "Exhalacion elemental segun linaje." },
      { name: "Resistencia draconica", description: "Resistencia al elemento del linaje." },
    ],
  },

  bjorn: {
    name: "Bjorn",
    statBonuses: { str: 2, con: 1 },
    traits: [
      { name: "Descanso mejorado", description: "Ganas PV temporales extra tras descansar." },
      { name: "Conocimiento natural", description: "Doble competencia en Supervivencia/Naturaleza en bosque." },
      { name: "Maestro herrero", description: "Competencia con herramientas de herrero." },
      { name: "Mordisco", description: "Arma natural 1d6 perforante." },
      { name: "Olfato agudizado", description: "Ventaja en Percepcion basada en olfato." },
    ],
  },
  brynja: {
    name: "Brynja",
    statBonuses: { con: 2, cha: 1 },
    traits: [
      { name: "Negado a las armaduras", description: "No puede usar armadura." },
      { name: "Escamas duras", description: "CA base 12 + modificador de Constitucion." },
      { name: "Golpe demoledor", description: "Ataque desarmado muy fuerte contra objetos/estructuras." },
      { name: "Modo bola", description: "Modo defensivo con resistencia a dano no magico." },
      { name: "Actor nato", description: "Competencia en Interpretacion." },
    ],
    innateArmorNote: "Defensa racial: CA base 12 + modificador de Constitucion. No usa armadura.",
  },
  escualo_martillo: {
    name: "Escualo (Tiburon Martillo)",
    statBonuses: { con: 2, cha: 1 },
    traits: [
      { name: "Habitante del mar", description: "Respiracion y descanso adaptados al mar." },
      { name: "Sed de sangre", description: "+2 al atacar objetivos sangrando en melé." },
      { name: "Mordisco", description: "Arma natural 1d6 perforante con curacion al rematar." },
      { name: "Control de la magia", description: "Conoce Toque helado y Rayo de escarcha." },
    ],
    startingSpells: [
      {
        name: "Toque helado",
        level: "0",
        school: "Necromancy",
        castingTime: "1 action",
        range: "120 feet",
        components: ["V", "S"],
        duration: "1 round",
        description: "Truco racial de escualo martillo.",
      },
      {
        name: "Rayo de escarcha",
        level: "0",
        school: "Evocation",
        castingTime: "1 action",
        range: "60 feet",
        components: ["V", "S"],
        duration: "Instantaneous",
        description: "Truco racial de escualo martillo.",
      },
    ],
  },
  escualo_tigre: {
    name: "Escualo (Tiburon Tigre)",
    statBonuses: { con: 2, dex: 1 },
    traits: [
      { name: "Habitante del mar", description: "Respiracion y descanso adaptados al mar." },
      { name: "Mordisco", description: "Arma natural 1d6 perforante con curacion al rematar." },
      { name: "Sentir el peligro", description: "+1 CA al usar Esquivar hasta tu siguiente turno." },
    ],
  },
  escualo_toro: {
    name: "Escualo (Tiburon Toro)",
    statBonuses: { con: 2, str: 1 },
    traits: [
      { name: "Habitante del mar", description: "Respiracion y descanso adaptados al mar." },
      { name: "Mordisco", description: "Arma natural 1d6 perforante con curacion al rematar." },
      { name: "Fuerza interior", description: "Resistencia a dano no magico durante 1 turno." },
    ],
  },
  ettin: {
    name: "Ettin (Raza dual)",
    statBonuses: { con: 2, cha: 1 },
    traits: [
      { name: "Dos cabezas", description: "Ventaja contra cegado, asustado y hechizado." },
      { name: "Doble sentido", description: "Competencia en Percepcion y ventaja con ambas cabezas despiertas." },
      { name: "Raza dual", description: "Disenado para dos jugadores compartiendo cuerpo." },
    ],
  },
  fiskanir_ballenido: {
    name: "Fiskanir (Ballenido)",
    statBonuses: { con: 2, int: 1 },
    hpPerLevelBonus: 1,
    traits: [
      { name: "Habitante del mar", description: "Respiracion acuaticas mejoradas." },
      { name: "Mensaje telepatico", description: "Conoce Cuchichear mensaje con alcance aumentado." },
      { name: "Engullir", description: "Puede guardar aliado/objeto pequeno en la boca." },
    ],
    startingSpells: [
      {
        name: "Cuchichear mensaje",
        level: "0",
        school: "Transmutation",
        castingTime: "1 action",
        range: "240 feet",
        components: ["V", "S", "M"],
        duration: "1 round",
        description: "Truco racial fiskanir.",
      },
    ],
  },
  fiskanir_orka: {
    name: "Fiskanir (Orka)",
    statBonuses: { con: 2, str: 1 },
    traits: [
      { name: "Habitante del mar", description: "Respiracion acuaticas mejoradas." },
      { name: "Mensaje telepatico", description: "Conoce Cuchichear mensaje con alcance aumentado." },
      { name: "Instinto asesino", description: "Competencia y ventajas de deteccion sobre objetivos sangrando." },
      { name: "Brazos brutales", description: "+1 a ataques/daño contundente en melé y mejor desarmado." },
    ],
    startingSpells: [
      {
        name: "Cuchichear mensaje",
        level: "0",
        school: "Transmutation",
        castingTime: "1 action",
        range: "240 feet",
        components: ["V", "S", "M"],
        duration: "1 round",
        description: "Truco racial fiskanir.",
      },
    ],
  },
  garoos: {
    name: "Garoos",
    statBonuses: { dex: 2, str: 1 },
    traits: [
      { name: "Piernas desarrolladas", description: "Grandes saltos horizontales y verticales." },
      { name: "Saltador nato", description: "Doble competencia al saltar con Atletismo/Acrobacia." },
      { name: "Patada", description: "Arma natural 1d6 contundente." },
      { name: "Golpes contundentes", description: "+1 en ataques desarmados." },
    ],
  },
  gronns: {
    name: "Gronns",
    statBonuses: { int: 2, wis: 1 },
    traits: [
      { name: "Doble filo", description: "Vulnerable a contundente, resistente a cortante." },
      { name: "Cuerpo cristalino", description: "No necesita comer, beber ni respirar. Luz a voluntad sobre si mismo." },
      { name: "Prisma interior", description: "Lanza Rociada de color, Pauta hipnotica y Rociada prismatica por niveles." },
    ],
    startingSpells: [
      {
        name: "Luz",
        level: "0",
        school: "Evocation",
        castingTime: "1 action",
        range: "Touch",
        components: ["V", "M"],
        duration: "1 hour",
        description: "Solo sobre si mismo por rasgo racial.",
      },
      {
        name: "Rociada de color",
        level: "1",
        school: "Illusion",
        castingTime: "1 action",
        range: "Self (15-foot cone)",
        components: ["V", "S", "M"],
        duration: "1 round",
        description: "Conjuro racial de gronns.",
      },
    ],
  },
  ikorni: {
    name: "Ikorni",
    statBonuses: { dex: 2, int: 1 },
    traits: [
      { name: "Reduccion", description: "Puede lanzarse Reduccion Ikorni varias veces por descanso." },
      { name: "Pelaje abundante", description: "Resistencia al frio y ventaja para escapar de presas." },
      { name: "Subestimado", description: "Los enemigos tienden a ignorarlo al inicio." },
    ],
    startingSpells: [
      {
        name: "Reduccion Ikorni",
        level: "1",
        school: "Transmutation",
        castingTime: "1 action",
        range: "Self",
        components: ["S"],
        duration: "Concentration, up to 10 minutes",
        description: "Version racial de Agrandar/Reducir.",
      },
    ],
  },
  kamale_tribal: {
    name: "Kamale Tribal",
    statBonuses: { dex: 2, wis: 1 },
    traits: [
      { name: "Lengua", description: "Interactua a distancia con objetos pequenos." },
      { name: "Vision ampliada", description: "Vision de 360 grados y +2 percepcion pasiva." },
      { name: "Piel adaptable", description: "Ventaja en Sigilo al camuflarse." },
      { name: "Lengua mejorada", description: "Alcance de lengua aumentado." },
    ],
  },
  kamale_social: {
    name: "Kamale Social",
    statBonuses: { dex: 2, int: 1 },
    traits: [
      { name: "Lengua", description: "Interactua a distancia con objetos pequenos." },
      { name: "Vision ampliada", description: "Vision de 360 grados y +2 percepcion pasiva." },
      { name: "Piel adaptable", description: "Ventaja en Sigilo al camuflarse." },
      { name: "Mente pensante", description: "Predice acciones y potencia Perspicacia." },
    ],
  },
  karnik: {
    name: "Karnik",
    statBonuses: { wis: 2, dex: 1 },
    traits: [
      { name: "Percepcion sonora", description: "Ventaja en Percepcion basada en oido." },
      { name: "Patada propulsada", description: "Arma natural y desplazamiento tactico." },
      { name: "Legado de la naturaleza", description: "Conocimiento druidico y conjuros por nivel." },
    ],
    startingSpells: [
      {
        name: "Conocimiento druidico",
        level: "0",
        school: "Transmutation",
        castingTime: "1 action",
        range: "30 feet",
        components: ["V", "S"],
        duration: "Instantaneous",
        description: "Truco racial karnik.",
      },
      {
        name: "Pasar sin dejar rastro",
        level: "2",
        school: "Abjuration",
        castingTime: "1 action",
        range: "Self",
        components: ["V", "S", "M"],
        duration: "Concentration, up to 1 hour",
        description: "Disponible por rasgo al nivel 3.",
      },
      {
        name: "Crecimiento vegetal",
        level: "3",
        school: "Transmutation",
        castingTime: "1 action",
        range: "150 feet",
        components: ["V", "S"],
        duration: "Instantaneous",
        description: "Disponible por rasgo al nivel 5.",
      },
    ],
  },
  landak: {
    name: "Landak",
    statBonuses: { dex: 2, cha: 1 },
    traits: [
      { name: "Defensa natural", description: "Contraataque perforante en melé al ser golpeado." },
      { name: "Bola de pinchos", description: "Modo defensivo con +CA y mas dano de pinchos." },
      { name: "Furia desatada", description: "Transformacion temporal con bonificadores ofensivos/defensivos." },
    ],
  },
  lundhi: {
    name: "Lundhi",
    statBonuses: { cha: 2, int: 1 },
    traits: [
      { name: "Habitante de la tundra", description: "Resistencia al frio y movilidad mejorada." },
      { name: "Vida marina", description: "Mayor capacidad de respiracion bajo el agua." },
      { name: "Vinculo", description: "Imita temporalmente rasgos de la clase de su pareja." },
    ],
  },
  morthun: {
    name: "Morthun",
    statBonuses: { wis: 2, dex: 1 },
    traits: [
      { name: "Miedo a la oscuridad", description: "Penalizadores en penumbra/oscuridad." },
      { name: "Capa alada", description: "Puede planear desde zonas elevadas." },
      { name: "Antenas receptoras", description: "Fogonazo cegador tras cargar luz solar." },
      { name: "Cazador silencioso", description: "Competencia en Sigilo." },
    ],
  },
  polniet: {
    name: "Polniet",
    statBonuses: { cha: 2, int: 1 },
    traits: [
      { name: "Sensibilidad solar", description: "Desventaja al sol en ataque y percepcion." },
      { name: "Mordisco", description: "Arma natural con succion de sangre." },
      { name: "Afinidad necrotica", description: "Danio necrotico magico te cura y la curacion magica te dana." },
      { name: "Forma de murcielago", description: "Transformacion limitada en murcielago." },
    ],
  },
  rinotido: {
    name: "Rinotido",
    statBonuses: { con: 2, wis: 1 },
    traits: [
      { name: "Cornamenta", description: "Arma natural 1d6 perforante." },
      { name: "Cargar", description: "Empuja objetivos en linea recta." },
      { name: "Piel gruesa", description: "CA sin armadura 12 + CON (sin DEX)." },
      { name: "Resistencia innata", description: "Resistencia al dano contundente." },
    ],
    innateArmorNote: "Defensa racial: CA 12 + CON (no suma DEX).",
  },
  satiro: {
    name: "Satiro",
    statBonuses: { cha: 2, dex: 1 },
    traits: [
      { name: "Cabezazo", description: "Arma natural 1d6 perforante como accion adicional tras atacar." },
      { name: "Persuasivo por naturaleza", description: "Competencia en Persuasion." },
      { name: "Piernas de acero", description: "Resistencia al dano por caida." },
    ],
  },
  sporr_espus: {
    name: "Sporr (Espus)",
    statBonuses: { wis: 2, dex: 1 },
    traits: [
      { name: "Adaptable", description: "Competencia en Supervivencia y Naturaleza." },
      { name: "Vision por esporas", description: "Vista ciega de 15 pies." },
      { name: "Esporum", description: "Nube de esporas mensajeras." },
      { name: "Parasito", description: "Control temporal de bestias pequenas." },
    ],
  },
  sporr_bagus: {
    name: "Sporr (Bagus)",
    statBonuses: { wis: 2, cha: 1 },
    traits: [
      { name: "Adaptable", description: "Competencia en Supervivencia y Naturaleza." },
      { name: "Vision por esporas", description: "Vista ciega de 15 pies." },
      { name: "Aficionado a la muerte", description: "Conoces Toque helado." },
      { name: "Necromania", description: "Ventaja en pruebas sobre no muertos." },
    ],
    startingSpells: [
      {
        name: "Toque helado",
        level: "0",
        school: "Necromancy",
        castingTime: "1 action",
        range: "120 feet",
        components: ["V", "S"],
        duration: "1 round",
        description: "Truco racial sporr bagus.",
      },
    ],
  },
  sporr_colosus: {
    name: "Sporr (Colosus)",
    statBonuses: { wis: 2, con: 1 },
    traits: [
      { name: "Adaptable", description: "Competencia en Supervivencia y Naturaleza." },
      { name: "Vision por esporas", description: "Vista ciega de 15 pies." },
      { name: "Coraza de musgo", description: "Obtiene PV temporales regenerables." },
      { name: "Fuerza en la debilidad", description: "Bono de CA al bajar de vida." },
    ],
  },
  sporr_mugus: {
    name: "Sporr (Mugus)",
    statBonuses: { wis: 2, int: 1 },
    traits: [
      { name: "Adaptable", description: "Competencia en Supervivencia y Naturaleza." },
      { name: "Vision por esporas", description: "Vista ciega de 15 pies." },
      { name: "Apariencia de hongo", description: "Se entierra para sigilo avanzado." },
      { name: "Espiar la mente", description: "Pregunta de si/no a criatura dormida." },
    ],
  },
  taidana: {
    name: "Taidana",
    statBonuses: { str: 2, wis: 1 },
    traits: [
      { name: "Grandes brazos", description: "Aumenta alcance de ataque/interaccion con penalizacion." },
      { name: "Resistencia natural", description: "Ventaja en salvaciones contra estados magicos." },
      { name: "Apariencia afable", description: "Ventaja social en primer contacto." },
      { name: "Sonar despierto", description: "Penalizador de iniciativa fuera de primera hora tras descanso." },
    ],
  },
  ulfus: {
    name: "Ulfus",
    statBonuses: { wis: 2, dex: 1 },
    traits: [
      { name: "Vision y olfato agudizados", description: "Ventaja en Percepcion por vision/olfato." },
      { name: "Lider de la manada", description: "Ataque de reaccion cuando aliado ataca cerca." },
      { name: "Absorcion elemental", description: "Absorbe frio/fuego/relampago y lo devuelve." },
    ],
  },
  veorus: {
    name: "Veorus",
    statBonuses: { dex: 2, int: 1 },
    traits: [
      { name: "Percepcion mejorada", description: "Doble competencia en Percepcion." },
      { name: "Propiedades unicas", description: "Elige parte de escarabajo con rasgos especiales." },
      { name: "Cuerpo regenerativo", description: "Recupera partes perdidas con el tiempo." },
    ],
  },
  versie_fonido: {
    name: "Versie (Fonido)",
    statBonuses: { con: 2, dex: 1 },
    traits: [
      { name: "Piel resbaladiza", description: "Desventaja para ataques melé no magicos bajo agua." },
      { name: "Grasa corporal", description: "Resistencia al frio." },
      { name: "Escapista", description: "Ventaja contra agarrado/apresado." },
      { name: "Sexto sentido", description: "Percepcion pasiva muy alta frente a peligro." },
    ],
  },
  versie_monido: {
    name: "Versie (Monido)",
    statBonuses: { con: 2, str: 1 },
    traits: [
      { name: "Piel resbaladiza", description: "Desventaja para ataques melé no magicos bajo agua." },
      { name: "Grasa corporal", description: "Resistencia al frio." },
      { name: "Piel gruesa", description: "Resistencia al dano perforante." },
    ],
  },
  versie_elenido: {
    name: "Versie (Elenido)",
    statBonuses: { con: 2, wis: 1 },
    traits: [
      { name: "Piel resbaladiza", description: "Desventaja para ataques melé no magicos bajo agua." },
      { name: "Grasa corporal", description: "Resistencia al frio." },
      { name: "Memoria marina", description: "Recuerda con facilidad y puede mostrar recuerdos breves." },
    ],
  },
};
