import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // NEW: Add this section to fix the dependency optimization error.
  optimizeDeps: {
    exclude: [
        '@radix-ui/react-slot', 
        'class-variance-authority', 
        '@radix-ui/react-label',
        '@monaco-editor/react'
    ],
  },
  // This server block is crucial for fixing the WebSocket error.
  server: {
    port: 5173, // The default Vite port
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
})
