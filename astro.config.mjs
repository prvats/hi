import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "astro/config"
import cloudflare from "@astrojs/cloudflare"
import vue from "@astrojs/vue"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  output: "server",
  // Sessions are unused; disabling them drops the adapter's default SESSION KV
  // binding instead of provisioning a namespace we never read or write.
  session: false,
  adapter: cloudflare({ imageService: "passthrough" }),
  integrations: [vue()],
  // Astro emits a `<meta>` CSP with hashes for its own inline scripts/styles.
  // Header-only directives (frame-ancestors) live in src/middleware.ts.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "img-src 'self' data:",
        "connect-src 'self'",
        "font-src 'self' https://fonts.gstatic.com",
      ],
      styleDirective: {
        // reka-ui positions menus/tooltips with inline styles, so style-src
        // needs 'unsafe-inline'. script-src stays hash-locked.
        resources: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
      },
    },
  },
})
