# Design System: SplitPay UI v2

This document defines the semantic design system and visual guidelines for the **SplitPay** application. It serves as the source of truth for maintaining visual consistency across screens.

---

## 1. Visual Theme & Atmosphere

* **Mood**: Immersive, premium, futuristic, and focused.
* **Density**: Moderate. Features generous whitespace around text and high-contrast indicators, ensuring the interface remains legible and lightweight.
* **Aesthetic Philosophy**: **Modern Dark Glassmorphism**. The UI mimics frosted glass panes floating over a deep dark cosmic void, separated by thin glowing lines and illuminated by vibrant electric violet and cyber turquoise neon accents.

---

## 2. Color Palette & Roles

Every color has a strict semantic purpose:

* **Cosmic Void Black (`#090611`)**: The global application background. Deep, absorbing dark purple-black that hides device bezels and makes colors pop.
* **Electric Violet (`#8B5CF6`)**: The primary brand color. Used for key interactive actions, primary buttons, and selected states.
* **Cyber Turquoise / Cyan (`#06B6D4`)**: The secondary accent color. Used for payments, "Settle Up" actions, success metrics, and secondary progress indicators.
* **Neon Pink / Accent (`#EC4899`)**: The tertiary highlight. Used sparingly for special icons or secondary warnings to add high-energy visual interest.
* **Neon Emerald (`#10B981`)**: The positive balance color. Represents money you are owed.
* **Neon Rose Red (`#EF4444`)**: The negative balance color. Represents money you owe.
* **Frosted Glass Dark (`rgba(24, 18, 43, 0.6)`)**: The glass card base color. Semi-transparent deep purple-grey that blends with the background.
* **Glass Edge Line (`rgba(255, 255, 255, 0.08)`)**: The subtle border color. Emulates the light catch on a cut piece of glass.
* **High-Contrast Ice White (`#F3F4F6`)**: The primary text color. Clean, cold white for optimal readability against dark cards.
* **Muted Cool Grey (`#9CA3AF`)**: The secondary text color. Used for labels, details, dates, and metadata.

---

## 3. Typography Rules

* **Display/Headers**: Set with heavy weights (`800` or `700`) and slight letter-spacing (`0.5px`) to establish a bold, geometric, premium tone.
* **Body/Details**: Clean sans-serif system fonts set in `500` or `600` for excellent readability at small sizes on mobile devices.
* **Muted Meta**: Small `12px` font with `600` weight in cool grey to ensure low-hierarchy text remains readable and structured.

---

## 4. Component Stylings

### Buttons
* **Gradient Actions**: Rounded rectangular shapes (`borderRadius: 16`) filled with vibrant gradients (`#8B5CF6` to `#6D28D9` for primary; `#06B6D4` to `#0891B2` for settle flows).
* **Frosted Actions**: Floating circular or rounded buttons with semi-transparent backgrounds and thin glowing borders that highlight on tap.

### Cards/Containers
* **Frosted Glass Panels**: Styled with a corner radius of `16` or `18` pixels (`borderRadius: 16`), thin borders (`borderColor: Colors.border`, `borderWidth: 1`), and semi-transparent backdrops (`Colors.backgroundCard`).
* **Active Status Borders**: Balance cards and group cards feature dynamic left borders (`borderLeftWidth: 4`) colored by state (emerald green for credit, rose red for debt) to act as visual cues.

### Inputs/Forms
* **Frosted Input Fields**: Outlined containers with a corner radius of `16` pixels, a translucent background (`Colors.backgroundCard`), and an active highlight state.

---

## 5. Layout Principles

* **Whitespace Strategy**: Generous vertical margins (`16px` to `24px`) separate sections. Cards use `14px` to `16px` inner padding to let lists breathe.
* **Rounded Corners Consistency**: Consistency is enforced through soft geometry—almost all container elements utilize a `16px` or `18px` corner radius.
* **Floating Elevation**: Depth is suggested visually using thin glass border lines and color-coded translucent background fills rather than heavy black drop shadows.
