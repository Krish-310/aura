import { defineConfig } from "vite";
import { resolve } from "path";
import { copyFileSync } from "fs";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: "src/content.js",
        background: "src/background.ts",
        content_index: "src/content/index.ts",
        popup: "src/popup.ts",
      },
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`,
      },
    },
  },
  plugins: [
    {
      name: "copy-content-css",
      generateBundle() {
        const src = resolve(__dirname, "src/content.css");
        const dest = resolve(__dirname, "dist/content.css");
        copyFileSync(src, dest);
      },
    },
  ],
});
