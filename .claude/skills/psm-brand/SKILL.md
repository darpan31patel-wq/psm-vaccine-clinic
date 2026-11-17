---
name: psm-brand
description: PSM Pharmacy brand rules (colours, fonts, components, tone, shop details) for any PSM page, staff app screen, poster, leaflet or UI change. Use before designing or restyling anything for PSM.
---

# PSM Pharmacy brand

Family run NHS community pharmacy on the Tolworth Broadway. Tagline: **"In The Joy Of Others, Lies Our Own."**

## Colours

**Teal (logo colour): the default for staff apps and the website.**

| Token | Hex | Use |
|---|---|---|
| teal-50 | `#EEF7F6` | page tint, hover |
| teal-100 | `#D8EEEC` | soft fills, selected rows |
| teal-300 | `#8CC8C4` | borders, dividers on teal |
| teal-500 | `#3E8984` | **logo teal**: big headings, bands, blocks. Not behind small white text (only 4.1:1) |
| teal-600 | `#357D78` | **primary buttons** (white text 4.8:1) |
| teal-700 | `#2E6F6B` | links and small headings on white (5.8:1), button hover |
| teal-900 | `#123E3B` | dark bands, text on light teal |
| ink | `#18302E` | body text |
| ground | `#F3F7F6` | app background |
| line | `#DCE7E5` | card and table borders |

**Approved alternative palettes** (print and marketing, or a deliberate accent):

- **Indigo** (chosen for the 2026 window poster): gradient `#3B46C6` to `#6E78D0` to `#C9B8DA`, accent `#2E3AA8`, navy `#1C2470`, highlight `#FFD400`.
- **Green and gold**: gradient `#0F3D33` to `#16544A`, cream `#F6F1E4`, gold `#E2B84F`, dark `#0A2B24`.
- **Charcoal and gold**: charcoal `#2F3842` with gold `#E2B84F` and cream. Business card only; matches the shop fascia.
- **NHS blue** `#005EB8` with white, for NHS service panels only.

**Status colours** (text on soft background):

| Meaning | Text | Background |
|---|---|---|
| Done, in stock | `#135A39` | `#DFF3E7` |
| Due soon, warning | `#7A4800` | `#FFF3DC` |
| Overdue, problem | `#9A1C14` | `#FDE6E3` |
| Info, owing | `#4B2F8C` | `#EFE9FA` |
| Neutral | `#3F4D4B` | `#EDF1F0` |

## Typography

- **Outfit** for headings: 700 on screens, 800 to 900 on print.
- **Poppins** for body: 400 and 500 on screens, 600 and 700 on print. Never thin weights.
- Headings and labels in **Title Case**. No ALL CAPS body text.
- Screens: body at least 16px, 17 to 18px in staff apps. Staff are not all young.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800;900&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
```

## Starter CSS

```css
:root {
  --teal-50:#EEF7F6; --teal-100:#D8EEEC; --teal-300:#8CC8C4; --teal-500:#3E8984;
  --teal-600:#357D78; --teal-700:#2E6F6B; --teal-900:#123E3B;
  --ink:#18302E; --ink-soft:#4F6462; --ground:#F3F7F6; --surface:#FFFFFF; --line:#DCE7E5;
  --nhs-blue:#005EB8; --gold:#E2B84F; --cream:#F6F1E4;
  --ok-fg:#135A39; --ok-bg:#DFF3E7; --warn-fg:#7A4800; --warn-bg:#FFF3DC;
  --bad-fg:#9A1C14; --bad-bg:#FDE6E3; --info-fg:#4B2F8C; --info-bg:#EFE9FA;
  --display:'Outfit',system-ui,sans-serif; --body:'Poppins',system-ui,sans-serif;
  --radius:16px; --radius-lg:20px; --tap:48px;
}
body { font-family:var(--body); color:var(--ink); background:var(--ground); font-size:17px; line-height:1.5; }
h1,h2,h3 { font-family:var(--display); color:var(--teal-900); line-height:1.15; }
.card { background:var(--surface); border:2px solid var(--line); border-radius:var(--radius-lg); padding:20px; }
.btn { min-height:var(--tap); padding:0 22px; border-radius:999px; border:0; font:600 17px var(--body);
       background:var(--teal-600); color:#fff; }
.btn:hover { background:var(--teal-700); }
a { color:var(--teal-700); }
```

## Components and layout

- Text contrast at least 4.5:1 everywhere (all the status pairs above pass).

- White rounded cards (16 to 20px radius) with a coloured border; bold gradient or teal bands for headers.
- Buttons and tap targets at least 48px tall; the main action big and obvious.
- Colour emoji icons are approved and match the PSM look. No mixed icon styles.
- Fill the space with purpose. Darpan dislikes dead space.
- Tablet first for staff apps (10 inch tablet, 1280x800), then PC and phone.

## Logo and NHS logo

- The PSM logo is the teal spires mark (`public/logo.png` or `public/psm-logo.png` in the PSM repos). Use it on white, light or coloured grounds. Never stretch, recolour or add effects.
- The NHS logo is white NHS on NHS blue. Only on white or `#005EB8`. Never recolour or redraw it.

## Avoid

- Yellow and black hazard looks, pink, orange and purple rainbow palettes, charcoal dominant pages.
- Thin text, outer borders around the whole page, generic AI template layouts, dead space.

## Shop details

- **PSM Pharmacy**, 388 Ewell Road, Tolworth KT6 7BB. On the Tolworth Broadway.
- Phone, written exactly: **0208 399 3165**.
- Website: www.psmpharmacy.com (not live yet). QR codes point to go.psmpharmacy.com.
- Family run for **over 20 years** (always "over 20 years").
- Over 2,500 five star Google reviews (confirm the exact count before printing).
- Walk in, no appointment needed for most services. WhatsApp service for registered patients: never print the number.
- Hours used on the 2026 print set: Mon to Fri 9am to 6pm, Sat 9am to 1pm (confirm with Darpan before using).
