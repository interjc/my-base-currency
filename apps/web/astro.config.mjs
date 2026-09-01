import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

export default defineConfig({
  adapter: cloudflare({ imageService: "passthrough" }),
  devToolbar: { enabled: false },
  output: "server",
  session: false,
  vite: {
    optimizeDeps: {
      include: ["astro/assets/services/noop", "astro/logger/json"],
    },
  },
});
