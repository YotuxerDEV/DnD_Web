import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  server: {
    port: 4322,
  },
  preview: {
    port: 4322,
  },
  devToolbar: {
    enabled: false,
  },
  integrations: [react(), tailwind()],
});
