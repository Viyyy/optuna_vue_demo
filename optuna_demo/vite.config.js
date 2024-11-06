import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import WindCSS from 'vite-plugin-windicss'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), WindCSS()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src")
    }
  },
})