import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

const isMisconfigured =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes("placeholder") ||
  supabaseAnonKey.includes("placeholder");

if (isMisconfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] Variables PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY no configuradas. " +
      "Las operaciones de base de datos no funcionarán hasta que edites .env con tus credenciales reales.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
