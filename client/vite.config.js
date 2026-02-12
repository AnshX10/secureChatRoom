import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import basicSsl from '@vitejs/plugin-basic-ssl' // Install this: npm i @vitejs/plugin-basic-ssl

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()], // Removed basicSsl() to use HTTP instead of HTTPS
  server: {
    https: false // Changed to false to use HTTP
  }
})