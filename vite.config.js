import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

// Custom plugin to ensure static edge directories for survey paths
function generateStaticSurveyRoutes() {
  return {
    name: 'generate-static-survey-routes',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      const surveyHtml = resolve(distDir, 'about-your-little-one-survey.html');
      
      if (fs.existsSync(surveyHtml)) {
        const content = fs.readFileSync(surveyHtml, 'utf-8');

        // 1. Create dist/about-your-little-one-survey/index.html
        const surveyDir = resolve(distDir, 'about-your-little-one-survey');
        if (!fs.existsSync(surveyDir)) fs.mkdirSync(surveyDir, { recursive: true });
        fs.writeFileSync(resolve(surveyDir, 'index.html'), content);

        // 2. Create dist/profile-generator/index.html
        const profileDir = resolve(distDir, 'profile-generator');
        if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
        fs.writeFileSync(resolve(profileDir, 'index.html'), content);
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), generateStaticSurveyRoutes()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        survey: resolve(__dirname, 'about-your-little-one-survey.html'),
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  }
})
