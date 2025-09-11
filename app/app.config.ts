export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',    // couleur principale (doit exister dans Tailwind)
      secondary: 'zinc'   // couleur secondaire
    },
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
})
