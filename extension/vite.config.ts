import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: "src/content.js",
      },
      output: {
        entryFileNames: (chunk) => `${chunk.name}.js`,
        format: "iife", // Use IIFE format for content scripts
      },
    },
  },
});
