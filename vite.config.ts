import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins: any[] = [react()];
  
  // Only include lovable-tagger in development mode
  // Skip in production to avoid build failures
  if (mode === "development") {
    try {
      // Use dynamic require to avoid issues if package is missing
      const { componentTagger } = require("lovable-tagger");
      if (componentTagger) {
        plugins.push(componentTagger());
      }
    } catch (e) {
      // Silently ignore if lovable-tagger is not available (common in CI/production)
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: plugins.filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
      minify: "esbuild",
    },
  };
});
