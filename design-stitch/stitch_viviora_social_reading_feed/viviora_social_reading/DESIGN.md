---
name: Viviora Social Reading
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1b1b1b'
  on-surface-variant: '#434656'
  inverse-surface: '#303030'
  inverse-on-surface: '#f1f1f1'
  outline: '#747688'
  outline-variant: '#c4c5d9'
  surface-tint: '#104af0'
  primary: '#0040df'
  on-primary: '#ffffff'
  primary-container: '#2d5bff'
  on-primary-container: '#efefff'
  inverse-primary: '#b8c3ff'
  secondary: '#626200'
  on-secondary: '#ffffff'
  secondary-container: '#e7e700'
  on-secondary-container: '#666600'
  tertiary: '#a32400'
  on-tertiary: '#ffffff'
  tertiary-container: '#ce3000'
  on-tertiary-container: '#ffece8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c3ff'
  on-primary-fixed: '#001355'
  on-primary-fixed-variant: '#0035bd'
  secondary-fixed: '#eaea00'
  secondary-fixed-dim: '#cdcd00'
  on-secondary-fixed: '#1d1d00'
  on-secondary-fixed-variant: '#494900'
  tertiary-fixed: '#ffdad2'
  tertiary-fixed-dim: '#ffb4a2'
  on-tertiary-fixed: '#3c0700'
  on-tertiary-fixed-variant: '#8a1d00'
  background: '#f9f9f9'
  on-background: '#1b1b1b'
  surface-variant: '#e2e2e2'
typography:
  display-xl:
    fontFamily: Anton
    fontSize: 80px
    fontWeight: '400'
    lineHeight: 80px
  headline-lg:
    fontFamily: Anton
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 48px
  headline-lg-mobile:
    fontFamily: Anton
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 32px
  headline-md:
    fontFamily: Anton
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 28px
  body-lg:
    fontFamily: Archivo Narrow
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 30px
  body-md:
    fontFamily: Archivo Narrow
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-mono:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  metadata:
    fontFamily: Archivo Narrow
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 40px
  border-width: 3px
  shadow-offset: 4px
---

## Brand & Style

This design system is built on a **Neo-Brutalist + Y2K Retro-Tech** aesthetic. It targets a youthful, intellectually curious audience that values both the high-speed energy of digital culture and the slow-burn depth of reading. The visual language rejects the "softness" of modern corporate SaaS in favor of raw, high-contrast, and structurally honest interfaces.

The personality is energetic, editorial, and unapologetically digital. Key characteristics include:
- **Honest Layouts:** Grid lines are often visible or implied through heavy borders.
- **High Energy:** Use of vibrant, clashing accent colors against a sterile white background.
- **Physicality:** Elements feel "stamped" onto the page with hard shadows and thick strokes, mimicking physical print and early web interfaces.
- **Anti-Minimalist Details:** Inclusion of geometric motifs (crosses, dots, grid patterns) to fill "dead" whitespace.

## Colors

The palette is anchored by a high-contrast foundation of **Pure Black (#000000)** and **White (#FFFFFF)**. This provides an editorial, "ink-on-paper" feel that ensures maximum legibility for long-form reading.

**Functional Color Application:**
- **Primary (Electric Blue):** Used for primary actions, hyperlinks, and active states.
- **Secondary (Vivid Yellow):** Used for highlights, "save" actions, and high-attention callouts.
- **Accents (Red, Lime, Purple):** Used for category tagging, mood indicators, and community-driven data visualization.
- **Borders/Shadows:** Exclusively use the neutral black (#000000). Avoid grey scales for structural elements.

## Typography

The typographic system utilizes a "Hard & Fast" pairing strategy.

- **Display & Headings:** **Anton** provides a commanding, condensed presence. It should be used primarily in uppercase to emphasize the brutalist tone.
- **Body Content:** **Archivo Narrow** is chosen for its high information density and legibility. Its slightly condensed nature mirrors the display type while remaining comfortable for reading articles or book snippets.
- **Technical UI/Metadata:** **Space Mono** is used for labels, timestamps, and page numbers to lean into the Y2K "retro-tech" aesthetic.

**Note:** Always maintain tight line-heights for headings and generous line-heights for body text to ensure a professional editorial balance.

## Layout & Spacing

This design system uses a **Rigid Grid** model. Layouts should feel constructed rather than organic.

- **Grid:** A 12-column grid for desktop with 0px gutters between borders (elements share border walls) or 16px gutters when elements are "floating" with shadows.
- **Rhythm:** All spacing must be multiples of 4px. 
- **Borders:** All primary containers must have a 3px solid black border.
- **Geometric Backgrounds:** Large empty areas should be filled with a subtle dot-grid pattern (1px dots spaced 20px apart) to maintain the technical blueprint feel.
- **Mobile:** Elements reflow into a single column. Horizontal padding is reduced, but the 3px border remains constant to preserve the brand's visual weight.

## Elevation & Depth

Depth is achieved through **Hard Offset Shadows**, not blurs or gradients. This simulates a "sticker" or "cut-out" effect common in Y2K-era print zines.

- **Level 1 (Static):** 3px border, no shadow. Used for inputs and inactive cards.
- **Level 2 (Interactive):** 3px border + 4px black shadow offset to the bottom-right (45 degrees). Used for buttons and hover states.
- **Level 3 (Pop-up/Modal):** 3px border + 8px black shadow offset.

**Movement:** On "active" or "pressed" states, the element should shift 4px down and to the right, effectively "covering" its shadow to simulate a physical button press.

## Shapes

The design system prioritizes **Geometric Rectilinearity**. 

- **Corners:** Use a maximum of 4px (`soft`) border-radius for components like buttons and cards. This prevents the UI from looking "sharp" like a wireframe while avoiding the "bubble" look of modern mobile apps.
- **Icons:** Should be stroke-based, using a 2px minimum weight. Icons must be enclosed in a square box with a border when used as primary navigation triggers.
- **Selection:** Use rectangular boxes with "vivid yellow" backgrounds for text selection or active navigation items.

## Components

### Buttons
- **Primary:** Electric Blue background, 3px Black border, 4px Black offset shadow. Text in Anton (Uppercase).
- **Secondary:** White background, 3px Black border, 4px Black offset shadow.
- **Hover State:** Background changes to Lime Green (#CCFF00) or Purple (#9D00FF); shadow remains.

### Cards (Book/Article Cards)
- Background: #FFFFFF.
- Border: 3px Black.
- Header: Use a solid color bar (e.g., Purple) at the top of the card with the category label in Space Mono.
- Content: Headline-md for titles; Archive Narrow for the excerpt.

### Input Fields
- Solid 3px black border.
- No shadow in default state; 4px Electric Blue shadow when focused.
- Placeholder text in Archive Narrow, 60% opacity black.

### Chips/Tags
- Rectangular with 0px radius.
- Black background with white Space Mono text for "Active."
- White background with black border for "Inactive."

### Progress Bars (Reading Status)
- Container: 3px black border, white background.
- Fill: Solid Lime Green (#CCFF00).
- No rounded corners; progress is represented as a hard-edged block.