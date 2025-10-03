# 🎨 Quartz Theme Palette Previewer

[![Preview Site](https://img.shields.io/badge/Live%20Preview-Click%20Here-brightgreen?style=for-the-badge&logo=github)](https://rishav-dhungel.github.io/quartz4-theme/)


This single-file web application acts as your **visual theme editor** for the [Quartz static site generator](https://quartz.jzhao.xyz).

It allows you to instantly preview **30 professionally curated color themes** (like Nord, Dracula, MonokaiPro, etc.) against a realistic content layout, ensuring you select the perfect color scheme for your digital garden before modifying your project files.

This eliminates the guesswork and tedious rebuild process usually required for theme iteration.

---

## 🚀 Quick Start: Applying a New Theme

The goal of this tool is to generate the exact **JavaScript object structure** needed to update the `quartz.config.ts` file in your Quartz project.

1. **Select Your Theme**
   Use the **"Select Theme"** dropdown and the **Light/Dark mode buttons** to find the perfect combination.

2. **Generate Config Object**
   Click the **"Show Palette"** button on the main article card.

3. **Copy to Clipboard**
   Inside the pop-up modal, click the **"Show & Copy JS Object"** button.
   This automatically copies the full `colors` object structure to your clipboard, ready for pasting.

The output ensures keys are **unquoted** for direct use in a `.ts` file:

```ts
colors: {
  lightMode: {
    light: '#FFFFFF',
    lightgray: '#F0F0F0',
    gray: '#A0A0A0',
    darkgray: '#202020',
    // ... (remaining colors)
  },
  darkMode: {
    light: '#000000',
    lightgray: '#1A1A1A',
    gray: '#444444',
    // ... (remaining colors)
  }
}
```

## 🔧 Quartz Integration

Once you’ve copied the new palette object, apply it directly to your Quartz project:

Open the quartz.config.ts file located in the root of your Quartz project.

Locate the main configuration object and the nested theme property.

Overwrite the existing colors key’s value with your copied palette.

Here’s an example of the target section:
```ts
import { QuartzConfig } from "./quartz/cfg"
// ... (other imports)

const config: QuartzConfig = {
  configuration: {
    // ...
    theme: {
      // ...
      colors: {
        // PASTE YOUR NEW PALETTE OBJECT HERE
        lightMode: { /* ... */ },
        darkMode: { /* ... */ }
      },
    },
  },
  // ...
}
export default config
```