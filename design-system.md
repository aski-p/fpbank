# DailyWon Design System

## Purpose
DailyWon should feel like a premium consumer application.
Every screen prioritizes clarity, simplicity, warmth, and consistency.

**Target quality:** Apple-level polish · Linear consistency · Notion readability · Arc Browser cleanliness
**Avoid:** Bootstrap look, Material Dashboard, heavy borders, bright gradients, excessive shadows

---

## Core Principles
1. **Simplicity First** — Fewer UI elements = better
2. **Content Before Decoration** — No visual effects unless they improve usability
3. **Consistency** — Spacing, Typography, Colors, Radius, Animation must remain consistent

---

## Color System
- **Neutral palette**, maximum 3 dominant colors per screen
- Primary: Blue | Accent: one accent color per screen only
- Background: Pure white (dark: Near black)
- States: Success(Green), Warning(Orange), Error(Red)

---

## Typography
| Element | Size | Weight |
|---------|------|--------|
| H1 | 32px | Semibold |
| H2 | 24px | Semibold |
| H3 | 20px | Medium |
| Body | 16px | Regular |
| Caption | 14px | Regular |
| Small | 12px | Regular |

- Font: **Inter** / Fallback: System UI
- Max 2 font weights per screen
- Comfortable line height, large readable headings

---

## Grid & Spacing (8px system)
Allowed values: **4 · 8 · 12 · 16 · 24 · 32 · 40 · 48 · 64**
Never use random spacing values.

---

## Border Radius
| Element   | Radius |
|-----------|--------|
| Cards     | 16px   |
| Buttons   | 14px   |
| Dialogs   | 20px   |
| Inputs    | 14px   |
| Sheets    | 24px   |

---

## Shadow & Elevation
- Soft only. Never strong shadows.
- Elevation only when necessary.

---

## Layout
- Max content width: **1200px**
- Always center content, generous whitespace, never crowded

---

## Components
- Use [shadcn/ui](https://ui.shadcn.com/) whenever possible
- Icons: **Lucide Icons only** (sizes: 16, 18, 20, 24)
- Max one primary button per section
- Forms: labels above inputs, min height 44px, clear validation
