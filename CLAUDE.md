# PSM Vaccine Clinic

The flu and COVID clinic app for PSM Pharmacy (Google Apps Script web app in `app/`) plus the RAVS Helper Chrome add-on in `ravs-helper/`. Read `README.md`, `app/SETUP.md` and `ravs-helper/INSTALL.md`.

## Deploying

The live app loads `app/Index.html` from `main`, so a merged change is live within about 5 minutes. Never commit patient details, logins or exports.

## How Darpan likes to work

- Darpan owns PSM Pharmacy and builds these projects with Claude. He has no tech background: explain in plain, warm, short steps.
- Concise replies, no filler. No dashes in replies. Emoji are welcome.
- Ask one question at a time, and only when you truly need to. Otherwise make the sensible call and say what you chose.
- Always look for ways to make things better (tools, design, speed, workflow). Tell him, and when it is clearly worth it, set it up and do it.
- Pull before you start. He works on these repos from several sessions at once. Never force push.

## Design and visual checks

- For any page, screen or UI change, use the **frontend-design** skill before writing code (it is on Darpan's claude.ai account; in a local session on his Mac it is the `frontend-design` plugin). Choose a deliberate look. No generic AI template styling.
- Never call UI work done without looking at it:
  1. Serve the page locally, for example `python3 -m http.server 8080` in the folder that holds it (the browser blocks `file://`).
  2. Open it with the **Playwright MCP** (set up in `.mcp.json`; tools named `browser_*`) or a short Playwright script.
  3. Screenshot it at the sizes listed under "Screens to check" below, plus phone 390x844.
  4. Look at every screenshot. Fix overflow, clipping, overlaps, weak contrast, tiny text and empty space. Check the console for errors.
- Playwright screenshots land in `.playwright-mcp/`, which is git ignored. Never commit them.

### Screens to check

Clinic PC 1440x900 and tablet 1280x800.

## PSM brand

New screens, pages and redesigns follow the **psm-brand** skill in `.claude/skills/psm-brand/SKILL.md` (colours, fonts, tone, shop details). Do not restyle existing screens unless asked; if one clashes with the brand, suggest it.
