import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: 'src/background.ts',
        'content/index': 'src/content/index.ts',
        options: 'src/options.tsx'
      },
      output: {
        entryFileNames: (chunk) => `${chunk.name}.js`
      }
    }
  }
})
