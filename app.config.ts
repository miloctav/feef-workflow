import { defineAppConfig } from "nuxt/app";

export default defineAppConfig({
  ui: {
    prose: {
      h2: {
        slots: { base: 'font-source-sans text-4xl font-bold' }
      },
      h1: {
        slots: { base: 'font-source-sans text-3xl font-semibold' }
      },
      p: {
        slots: { base: 'font-source-sans text-base leading-7' }
      },
      strong: {
        slots: { base: 'font-source-sans font-bold' }
      },
      code: {
        slots: { base: 'font-source-sans text-sm bg-gray-100 p-1 rounded' }
      }
    },
    
  },
  colors: {
      primary: 'blue',    // couleur principale (doit exister dans Tailwind)
      secondary: 'pink'   // couleur secondaire
    }
})
