# PSM Vaccine Clinic: full project handover

Written 21 October 2026 (late evening, UK time), so that any AI assistant or developer can pick this project up with no other context and carry on helping Darpan. It covers the whole project, not just the latest work.

> **For the next assistant.** Read this whole page first. Then read the repository (`README.md`, `app/SETUP.md`, `app/Code.gs`, `app/Index.html`, `app/app.js`, `ravs-helper/`), then ask Darpan the questions in section 14. Never ask Darpan for passwords, and never put patient data, staff names, staff emails or account email addresses into chat, files, commits or memory.

---

## Contents

1. What this project is
2. Who Darpan is and how Darpan likes to work
3. The clinic and the NHS rules the app follows
4. Where everything lives
5. Architecture: how the pieces fit together
6. The data sheet: every tab and column
7. Every screen and feature
8. The RAVS Helper Chrome add-on
9. How a change goes live (the update flow)
10. Setting up a computer
11. The Google account move (in progress tonight)
12. What is pending, parked and planned
13. Darpan to provide / grant access (checklist)
14. First questions to ask Darpan
15. If Claude access is lost: export everything
16. Conventions and hard rules
17. Glossary
18. History of changes (PR #1 to #29)

---

## 1. What this project is

PSM Pharmacy is an NHS community pharmacy run by Darpan Patel. Every autumn/winter the NHS runs a flu and COVID vaccination programme (and a smaller spring COVID-only programme from about April). The pharmacy is very busy during clinics: up to about 200 vaccinations a day.

Before this project, staff used one big Google Sheet per season: the front desk typed patient details into "cards" on a daily tab, and later someone copied each patient into **RAVS** (the NHS "Record a vaccination" website) by hand. That was slow, error-prone, and claims are lost if a vaccination isn't on RAVS within 15 days.

This project replaced that sheet with an **all-in-one clinic web app** plus a **Chrome add-on (the "RAVS Helper")** that fills in RAVS pages automatically. The goal was to ship fast and iterate during the live season. Long-term goals Darpan has stated: make it "bulletproof", less reliant on the internet, and more secure.

What exists today (all live and in daily use):

- A Google Apps Script web app, bound to a Google Sheet that holds all the data.
- The code is in the GitHub repository `darpan31patel-wq/psm-vaccine-clinic`. The live app loads its screen and code from the `main` branch, so a merged pull request goes live within about 5 to 10 minutes.
- The RAVS Helper Chrome extension (Manifest V3), currently version **0.6.1** on `main`. Version 0.5.8 is waiting for Chrome Web Store review.
- Nightly backups, a change log, a save queue for when the internet drops, and a copy of the app in Google Drive in case GitHub is down.

---

## 2. Who Darpan is and how Darpan likes to work

- Owner of PSM Pharmacy, an NHS community pharmacy in England. Not a programmer, but technically confident: can follow click-by-click steps in Google Apps Script, GitHub and Chrome.
- Uses Claude in a "project" with several parallel conversations ("threads"). If that goes away, Darpan will paste this document into a new assistant.

**Preferences (follow these):**

- **Previews first.** Show a preview (screenshot or demo page with made-up data) before asking Darpan to do setup work.
- **Plain step-by-step instructions** with exact clicks, exact button names and links. Short plain labels. No jargon.
- **Design:** colourful, lively, uncluttered. The whole workflow on one screen; long lists scroll inside their own boxes. Patient rows are one line each with fields clearly separated.
- **Batch your questions.** Darpan likes a short list of questions at once, plus ideas for new features, and regularly asks for an updated "questions and to-do" list.
- **Never blame Darpan for a bug.** Take every report at face value and fix it.
- **"go live"** from Darpan means: merge the open pull request(s).
- **Ship fast, iterate.** Darpan prefers a working version now and improvements later.
- Darpan wants nothing lost, ever (for example, the season rollover deletes nothing).

---

## 3. The clinic and the NHS rules the app follows

### Programmes

- **Autumn/winter programme:** flu + COVID, starts about early October (setup September). The app's season rollover button is for this one.
- **Spring programme:** COVID only, starts about April. A "Start spring COVID programme" button was deliberately **deferred** ("save spring for later"). Offer it again before April 2027.

### Eligibility (built into the app)

- **NHS flu:** 65+ by the date in Settings (currently 65 by 31/03/2027). Under 65 but 18+ needs a stated reason.
- **NHS COVID:** 75+ by the date in Settings (currently 75 by 31/01/2027). Under 75 but 18+ needs a stated reason (COVID reasons: clinical risk group, care home).
- **Private flu (£25) and private COVID (£98):** 18+. Recorded only in the app, **never on RAVS**. Prices and batches are in Settings. No payment method needed.
- **Nasal flu (LAIV / Fluenz):** children in a date-of-birth window set in Settings.
- If someone is under the age line, the app shows a red box with **"NOT ELIGIBLE BY AGE"**, and still allows the vaccination with a written reason.
- Flu reasons (the RAVS list): Based on age, Healthcare worker, Pregnant, In a clinical risk group, Resident in a care home, Carer, Social care worker, Household contact of someone immunosuppressed, Homeless. For **Healthcare worker**, the helper always picks RAVS's "non-clinical" follow-up option.

### RAVS (Record a vaccination)

- Website: `https://www.ravs.england.nhs.uk/` (note the **www**; the address without www doesn't exist). NHS Okta login. It is the **only** recording system. PharmOutcomes was used in the past and is not used now.
- There is **no RAVS API**. RAVS can't be put in an iframe. So the app talks to RAVS only through the Chrome add-on, in a normal Chrome tab where staff are logged in.
- Darpan has read RAVS's terms of use. RAVS support: `ravs.support@england.nhs.uk`.
- RAVS record flow (what the helper automates): NHS number yes/no → search (NHS number, or name + date of birth + postcode) → patient details and vaccination history (must show the full profile: NHS number, address, GP) → Continue → is it today? → who is the vaccinator (the logged-in user is not necessarily the vaccinator) → vaccine (COVID-19 / Flu: aTIV, TIVc, Fluenz LAIV / MenB / MMR) → batch → eligibility reason → consent → injection site (left/right upper arm) → **Check and confirm** (optional note = the app's note) → staff press **Confirm and save** → green **"Vaccination saved"** panel.
- **The helper never presses Confirm and save.** A person always checks and saves.
- Record on RAVS the same day where possible. More than 15 days late can't be claimed.
- RAVS postcodes need a space ("KT3 5NL", not "KT35NL").
- RAVS Reports (used by "Get RAVS export"): Create report → timeframe (max 90 days) → vaccines → site → data → Check and confirm → Confirm and create report → Download report (a CSV named `RAVs-Vaccination-Report.csv`).
- The RAVS report also lists RSV, Pertussis and Pneumococcal.

### Darpan's rules for RAVS

- Search by NHS number, or name + date of birth. Only proceed when the full profile shows.
- Keep RAVS logged in: the helper refreshes it after 10 quiet minutes, between 7am and 8pm, never mid-patient.
- **No automatic or bulk background RAVS lookups** (for example, checking thousands of old patients) unless RAVS support agrees **in writing**. Darpan wants this (about one lookup every 4 to 5 minutes) and emailed RAVS support on 21 Oct 2026 at 15:22. Wait for their reply. A staff-clicked "Check on RAVS" button (one patient at a time) exists instead.

### Bookings

Bookings come from the NHS **"Manage your appointments"** site (NHSmail single sign-on with Authenticator). The app can't log in there, so staff copy the day view table and paste it into **Bookings → Paste bookings**.

### Hardware

- 3 Macs (2 at the front desk, 1 for RAVS entries), a Windows laptop and a Windows PC. All use Chrome signed into the pharmacy Google account.
- Darpan also tests on a personal computer.
- Screen locks are on all 5 computers. Google and GitHub both have 2-step sign-in.
- No off-site clinics for now (the old "Kingston" off-site location still exists in Settings).

---

## 4. Where everything lives

| What | Where | Notes |
|---|---|---|
| Code (source of truth) | GitHub: `https://github.com/darpan31patel-wq/psm-vaccine-clinic` | Public repo, code only. Default branch `main`. Never commit patient data, logins or exports. |
| Live app | A Google Apps Script web app link `https://script.google.com/macros/s/<id>/exec` | Bookmarked as **PSM Clinic** on every computer. Only opens for the pharmacy Google account. The link changes when the account move happens. |
| Data | Google Sheet **"Vaccine Clinic 2026-27 (app data)"** in the pharmacy Google account | The Apps Script project is bound to this sheet (Extensions → Apps Script). |
| Backups | Google Drive folder **"PSM Clinic backups"** | Nightly full copies (newest 30), "App copy - Index.html", "App copy - app.js", and "PSM RAVS Helper <version>.zip". |
| Old season sheets | Darpan's Google Drive ("2023 FLU COVID - RECORD KEEPING", etc.) | Already loaded into the app's Recall tab. Contain real patient data. |
| Helper zip for the Web Store | Claude project files: `clinic-tool/chrome-web-store/psm-ravs-helper-0.5.8.zip` | Rebuild from `main` before any new upload. |
| Chrome Web Store listing | `https://chrome.google.com/webstore/devconsole` (pharmacy account) | Unlisted. 0.5.8 submitted 21 Oct 15:08, waiting for review. |
| Plans, guides, previews | Claude project files folder `clinic-tool/` | See section 15 for how to download. |
| This handover | `docs/HANDOVER.md` in the repo, and `clinic-tool/handover/HANDOVER.md` in project files | |

Useful published pages (Claude artifacts; may stop working if Claude access is lost):

- Demo of the app with made-up data: https://claude.ai/artifact/SdFNg7JUhUQzHR1KiKHwJS
- Possible opportunity (recall) preview: https://claude.ai/artifact/VJk5L8bSxqCLEPCioACM6i
- Reliability and security review: https://claude.ai/artifact/VL7cYdfX1FVT37Gq9K7VZB
- Google account move plan: https://claude.ai/artifact/Vsxz6CMzbJxiN54gA9vFPT

---

## 5. Architecture: how the pieces fit together

```
 Each computer (Chrome, signed into the pharmacy Google account)
 ┌──────────────────────────────────────────────┐        ┌─────────────────────────────┐
 │ Tab 1: PSM Clinic app                        │        │ Tab/window 2: RAVS          │
 │  script.google.com/.../exec                  │        │  www.ravs.england.nhs.uk    │
 │   └ iframe *.googleusercontent.com           │        │   └ helper's ravs.js fills  │
 │      ├ Index.html (layout + CSS + loader)    │        │     each page, reads        │
 │      ├ app.js (all the app code)             │        │     results, makes reports  │
 │      └ helper's app-bridge.js  ◄─postMessage─┤        │                             │
 └───────────────┬──────────────────────────────┘        └──────────────▲──────────────┘
                 │ google.script.run (apiBoard, apiRegister…)           │
                 ▼                                   helper background.js + chrome.storage
 ┌──────────────────────────────┐                   (job queue, results, tab/window control)
 │ Apps Script (Code.gs)        │
 │  bound to the data sheet     │──► Google Sheet: Records, Settings, Changes, Recall
 │  runs as the pharmacy account│──► Drive "PSM Clinic backups" (nightly, app copy, helper zip)
 └──────────────┬───────────────┘
                │ UrlFetchApp: raw.githubusercontent.com/…/main/app/Index.html (+ app.js, helper manifest, repo zip)
                ▼
         GitHub repo (main branch)
```

### 5.1 The web app (Apps Script)

- `app/Code.gs` is the server. It's pasted into the Apps Script editor of the data sheet. `app/appsscript.json` sets time zone `Europe/London`, V8, and the web app to **Execute as: Me (USER_DEPLOYING)**, **Who has access: Only myself (MYSELF)**. So only the pharmacy Google account can open the app, and all data access runs as that account.
- `doGet()` runs `setup_()` (creates missing tabs) and serves the screen.
- **Where the screen comes from (`screenHtml_`):** it fetches `app/Index.html` from GitHub raw `main`. It caches it 5 minutes if under 90 KB. If GitHub fails, it uses the Drive copy "App copy - Index.html", then the `Index` file pasted into the Apps Script project. Every ~10 minutes (on a page open) it also refreshes the Drive copies of the app and the helper zip.
- **Where the code comes from:** `Index.html` is deliberately small (layout + CSS + a loader). Google's page loader broke on a ~150 KB page, so all the JavaScript lives in `app/app.js`. The loader at the bottom of `Index.html` fetches `app.js` from GitHub raw (cache-busted each minute). If that fails, it asks the server for the Drive copy (`apiAppCode`), then tries jsDelivr (`cdn.jsdelivr.net/gh/darpan31patel-wq/psm-vaccine-clinic@main/app/app.js`).
- **Consequence:** almost every change is just a GitHub merge. A **Code.gs paste + new deployment version is only needed when `Code.gs` (or `appsscript.json`) changes.** The last time that was needed was PR #22/#23 (Recall + reliability) on 21 Oct.
- `app.js` has a built-in **demo backend** (`Demo`, kept in `localStorage`) used when `google.script` is missing. That's how previews with made-up data are published as plain HTML pages.
- Look for `BUILD = '…'` in `app.js`; it shows at the bottom of Settings with the helper version and last backup time.

### 5.2 Server API (all in Code.gs, called with `google.script.run`)

| Function | What it does |
|---|---|
| `apiBoard(clientVersion, today)` | Returns today's rows plus all rows with status `given` (not on RAVS yet), per-day counts, settings, backup/copy times, helper version. Returns `{unchanged:true}` if nothing changed (a version counter in Script Properties is bumped on every write). The app polls this every ~12 seconds. |
| `apiRegister(visit, meta)` | Adds a visit's rows (one row per vaccine dose). Skips ids already present, so re-sent saves are never doubled. Marks a matching booking as `checkedin`. |
| `apiUpdate(ids, patch, meta)` / `apiUpdateEach(changes, meta)` | Changes fields on rows. Delete = `status: 'deleted'` (rows are never removed from the sheet). |
| `apiImportBookings(rows, meta)` | Adds pasted bookings as `booked` rows (deduplicated by date + NHS + DOB). |
| `apiSearch(q, seasonStart)` | Searches this season's rows by name, NHS number or date of birth. |
| `apiSaveSettings(s, meta)` | Saves the whole settings object to Settings!A2 and logs each changed key. |
| `apiExport(from, to)` | All rows in a date range (used by Excel export, RAVS check, rollover). |
| `apiRecallGet()` / `apiRecallSave(people, meta)` / `apiRecallContact(key, patch, meta)` | Read/merge/save the Recall tab, and record a contact outcome. |
| `apiAppCode()` | Returns the Drive copy of `app.js` (fallback). |
| `turnOnBackups()` | **Run once by hand** from the editor. Creates the 2am nightly trigger and runs a backup. |
| `nightlyBackup()` | Copies every tab to a new sheet "Vaccine Clinic backup yyyy-MM-dd HH.mm" in the backups folder, keeps 30, refreshes the app copy and helper zip. |

Every write goes through `lock_()` (a script lock, 20 s wait), bumps the version, and flushes the change log. `meta.who` is the Operator's name, written into the Changes tab.

### 5.3 Sync and the save queue

- Every computer polls `apiBoard` about every 12 seconds. The header shows a status light: green **Live**, red **Not saving, retrying**, or red **N waiting to save**. It's a status light only, not a button.
- **Save queue (`psm.outbox` in localStorage):** if a save can't reach Google, it's kept in that computer's Chrome and retried every 15 seconds and when the browser comes back online, in order. Queued rows still show on screen. Don't clear Chrome browsing data while "waiting to save" shows. Unsent saves exist only on that one computer.

### 5.4 Per-computer settings (localStorage, not shared)

- `psm.me` + `psm.meDay`: the **Operator** (top-right box). Required before any entry. Flashes red if empty. Clears every day. Settings is never blocked by it.
- `psm.offline`: Offline mode on/off for that computer.
- `psm.tab`: last open tab. `psm.loc`: location. `psm.vax`: an old per-computer vaccinator, now cleared and ignored.
- `psm.outbox`: the save queue.

Everything else is shared through the sheet (see Settings!A2).

### 5.5 Security model (as built)

- App runs as the pharmacy account and only that account can open it.
- The helper only trusts the **first** `/exec` app link it sees on that computer (trust on first use, stored in chrome.storage). It only passes patient details to that app. A new deployment link means removing and reloading the helper.
- The helper's bridge only acts on a page carrying the `#psm-clinic-app` marker element.
- Weak points still open (from the security review): the GitHub repo is a supply-chain risk (whoever can push to `main` changes the live app, which can read all patient data); one shared Google account for all staff; ExcelJS/SheetJS loaded from cdnjs without integrity hashes. Suggested to Darpan: GitHub branch protection on `main`, Google Workspace with per-staff logins (Darpan chose a free Gmail for now), DSPT/IG check.

---

## 6. The data sheet: every tab and column

Sheet name: **Vaccine Clinic 2026-27 (app data)**. Don't rename or reorder columns. All columns are stored as plain text (`@` format) so NHS numbers, dates and batches don't get mangled.

### Records (one row per vaccine dose)

Columns, in order: `id, visitId, date, time, source, nhs, surname, given, dob, postcode, phone, vaccine, product, batch, eligibility, eligNote, consent, site, vaccinator, deskBy, location, status, givenAt, enteredAt, enteredBy, note, updatedAt, address, gp`

- `visitId` groups doses given to the same patient in one visit.
- Dates are `yyyy-mm-dd`.
- `status`: `booked` (from pasted bookings), `checkedin` (booking turned into a visit; hidden), `waiting` (old, no longer used on screen), `given` (vaccinated, **not on RAVS yet**), `entered` (**on RAVS**), `notgiven`, `deleted`.
- `source`: e.g. `Walk-in`, booking, `Offline` (RAVS was down; gender/email packed into the note), `From RAVS` (copied in by RAVS check).
- `vaccine`: `Flu`, `COVID-19`, `Nasal flu`, `MMR`, `MenB`, `Pneumococcal`, `Private flu`, `Private COVID`.
- `deskBy` = Operator. `vaccinator` = name exactly as RAVS shows it.

### Settings (cell A2 = one JSON object)

A1 says "Settings are edited from the app. Do not change cell A2 by hand." Keys:

- `products`: list of `{vaccine, product, batch, expiry, active}`. Batch must match RAVS's batch list exactly. COVID product name must match RAVS (e.g. "Spikevax XFG").
- `prices`: `{ 'Private flu': 25, 'Private COVID': 98 }`
- `vaccinators`: names that vaccinate here. `ravsVaccinators`, `ravsVaccinatorsAt`, `ravsVaccinatorEmails`: the list the helper read from RAVS, when, and the email RAVS shows next to each name (helper 0.6.1+).
- `vaccinator`: **the one vaccinator on duty, shared by every computer.** Darpan: "it will only ever be one vaccinator, just different operators per machine".
- `staff`: the Operators list.
- `site`, `consent`: defaults (Left upper arm, Patient).
- `locations`: `['Pharmacy', 'Off-site: Kingston Council']`.
- Age rules: `fluAge` 65, `fluDate` 2027-03-31, `covAge` 75, `covDate` 2027-01-31, `seasonStart` 2026-09-01, `nasalFrom` 2022-09-01, `nasalTo` 2024-08-31.
- `stockDays` (default 3; 0 = off), `stockTake` `{date, time, by}`.

### Changes (change log)

Columns: `When, Operator, Action, Entry id, Patient, Vaccine, Field, Was, Now`. Every add, change, delete, settings change, bookings paste, recall update and stock-take "Done" is logged.

### Recall (shown on screen as "Possible opportunity")

One row per person from past seasons. About **8,100 people** loaded from the old season sheets (2021 to 2026). Columns: `key, nhs, surname, given, dob, gender, postcode, address, phone, history, reason, source, contact, contactAt, contactBy, contactNote, updatedAt`.

- `key` = NHS number, or `SURNAME|dob` when there's no NHS number.
- `history` text like `2025-26 Flu, COVID; 2024-25 Flu`. Seasons run August to July (`seasonOf`).
- `contact`: `called`, `texted`, `declined` (Not interested), `elsewhere` (Had it elsewhere).
- The internal names (sheet tab, code) are still "Recall"; only the on-screen label changed.

Any copy or move of the spreadsheet **must** keep Records, Settings (A2), Changes and Recall.

---

## 7. Every screen and feature

### Header (always visible)

- PSM logo, tabs, the **Live sync** light, the **Operator** box (top right; "+ Add a name…" adds to the shared list), the **RAVS** button (shows ready / log in / reload status; opens RAVS side by side, app on the left half, RAVS on the right) and a **Check RAVS** connection button.
- **Today bar** (on Register patient): today's counts, the vaccinator on duty (click to open the RAVS-style "Who is the vaccinator?" picker), and the amber **"Stock take due"** reminder with **Done** (shared; comes back every `stockDays` days).

### Register patient (front desk)

- **Find patient** box: NHS number, or first name + last name + date of birth (+ postcode). **Search RAVS** asks the helper to look the patient up in the RAVS tab in the background; it stops on the patient details page and returns name, DOB, NHS number, address, GP and past vaccinations. Staff check with the patient and press **Confirm patient**. Fallback: **Continue without checking RAVS**. Duplicate warning if already registered.
- **Offline mode** button: for when RAVS is down; takes full details by hand (gender, full address, contact, vaccine date).
- **Select vaccine**: four big choices **Flu, COVID, Private, Other**. Private and Other open their own view with a Back button. Other = MMR, MenB, Nasal flu, Pneumococcal (PPV). Eligibility shows per vaccine; reason picker if under age.
- **Vaccinated** button: greyed until patient, reason (if needed), vaccinator and operator are all set. Batch, arm and consent come from Settings.
- **Previous entries** (full width below): this season's audit list, newest first, with "N days ago", one line per patient. Labels: green **"✓ On RAVS"**, amber **"Not on RAVS yet"**, pink **"Private"**. No "Waiting" status any more.
- Every entry has **Edit**: change details or vaccine; **Fill in RAVS again**; **Entered on RAVS** (mark by hand); **Delete** (with confirmation; soft delete).

### To enter onto RAVS

- Everything with status `given` (not private), grouped by date, with entries already done listed under each day.
- **Fill in RAVS** per card, or **Fill all in RAVS** (queues them in the helper).
- Earlier days turn amber; 10+ days late turns red (15 days is the claim limit).
- The helper marks an entry "On RAVS" **only** after RAVS shows "Vaccination saved". It also saves the address, GP and NHS number RAVS showed.
- Copy buttons for each field remain for manual entry.

### Bookings

- **Paste bookings**: paste the day view table copied from Manage your appointments (the date heading is detected automatically). Bookings show as **Booked**, turning **Registered** when the patient is registered (matched by NHS number or surname + DOB). Nothing disappears. **Check in** fills Find patient and searches.

### Private

- Private flu and private COVID by date, with prices. Never sent to RAVS. Excluded from the RAVS check.

### Possible opportunity (Recall)

- People from past seasons who haven't come in this season, so staff can contact them.
- **Add old season files**: drop in old season Google Sheets downloaded as Excel (.xlsx). Parsed in the browser with SheetJS (cards with labels "Family Name:", "Given Name(s):", "Date of Birth:", "NHS Number:", etc.; daily tabs named MMDD; skips AUDIT, TEMPLATE, PPV, NASAL and similar tabs).
- **"Seasons loaded"** line (Darpan still to check that 2021-22 and 2022-23 show).
- Filters: Flu 65+, COVID 75+, Under 65; contact status Called / Texted / Not interested / Had it elsewhere; search.
- **Download list** (Excel). **Check on RAVS** per row (one staff-clicked lookup at a time).

### Records

- Season-by-day numbers, search, **Export to Excel** (all fields, Summary sheet with lots of counts, a tab per day, a Private tab; whole season or a date range; uses ExcelJS from cdnjs).
- **RAVS check**: drop in a RAVS export CSV, or press **Get RAVS export** (helper walks the RAVS Reports pages, max 90 days, report only; file is never saved). Groups: **In app not on RAVS** (red; over 15 days flagged), **On RAVS not in app**, **In your old sheet** (grey; found in Recall history), **Different date**. **Add all to the app** copies RAVS-only entries in as `entered` with source "From RAVS", so the app holds the whole season. Private is excluded.

### Settings

- **On duty**: Vaccinator (shared, RAVS-style radios "Name (email)") and this computer's Operator.
- **Staff**: Vaccinators (RAVS's list with "Vaccinates here" switches, or a typed list before the helper has read RAVS) and Operators. Saves instantly for every computer.
- **Clinic settings**: Today's vaccine stock (product, batch, expiry, active; "Add a product"), Defaults (site, consent, stock-take days), Places, Private prices, Age rules, **Start next autumn/winter season** (rollover: adds this season's vaccinated patients to Possible opportunity, moves dates on a year, optional batch clear; nothing deleted; not for spring), **Save settings**.
- Bottom line: app build, helper version (warns if a computer's helper is older), **Last backup** time.

---

## 8. The RAVS Helper Chrome add-on

Folder: `ravs-helper/` (Manifest V3). Version on `main`: **0.6.1**.

| File | Role |
|---|---|
| `manifest.json` | Permissions: `storage`. Hosts: `ravs.england.nhs.uk`, `www.ravs.england.nhs.uk`, `script.google.com`. Content scripts: `ravs.js` on RAVS; `app-bridge.js` on `*.googleusercontent.com` (all frames, about:blank). |
| `background.js` | Service worker. Opens/reuses the RAVS tab, puts app and RAVS side by side, checks and remembers the linked app's `/exec` id (trust on first use), relays jobs. |
| `app-bridge.js` | Runs inside the app's iframe. Only activates if the page has `#psm-clinic-app` and background confirms it's the linked app. Talks to the app with `window.postMessage`. Re-adds its listener because Apps Script rewrites the iframe with `document.write`. |
| `ravs.js` | Runs on RAVS. Detects the step by URL path then the page heading, fills fields by their **label text**, checks the patient matches (NHS number + DOB, full profile), stops on any mismatch with a red message, stops at Check and confirm, detects "Vaccination saved". Also does patient lookups, keep-alive, reading the vaccinator list (with emails), and the Reports export. Shows a panel bottom right with Pause/Resume, Skip, Fill this page again, Clear queue. |
| `PRIVACY.md` | The Web Store privacy policy (linked from the listing; must stay on `main`). |
| `INSTALL.md` | Staff install/use guide. |

**Messages between app and helper** (`postMessage`, field `psm`):

- App → helper: `app-hello`, `app-queue` (record jobs), `app-ack`, `app-lookup`, `app-lookup-ack`, `app-lookup-cancel`, `app-export`, `app-export-ack`, `app-export-cancel`, `app-ravs-status`, `app-show-ravs`, `app-side-by-side`.
- Helper → app: `ext-ready` (with version), `ext-queued`, `ext-done` (results incl. "Vaccination saved"), `ext-error`, `ext-lookup`, `ext-lookup-started`, `ext-lookup-status`, `ext-export`, `ext-export-status`, `ext-ravs-status`, `ext-vaccinators`, `ext-side-by-side-failed`.

Jobs and results are kept in `chrome.storage.local` until the app acknowledges them, then removed.

**How the helper is installed today:** by hand ("Load unpacked"). The latest zip is **"PSM RAVS Helper <version>.zip"** in the Drive folder "PSM Clinic backups" (Code.gs keeps it in step with `main`). Fallback: GitHub `main.zip` → the `ravs-helper` folder. Updating = remove + Load unpacked the new folder (or unzip over and press reload in chrome://extensions), then reload the RAVS tab and the app.

**Chrome Web Store (for automatic updates):**

- Unlisted listing, published under the **old** pharmacy Google account's developer account (US$5 paid, contact email verified). Keep it on that account even after the move; the helper works whoever publishes it.
- **0.5.8 submitted 21 Oct 2026 15:08, waiting for Google's review.** Don't upload anything new until it's approved (a new upload restarts the review).
- After approval: rebuild the zip from `main` (now 0.6.1): `manifest.json`, `background.js`, `ravs.js`, `app-bridge.js`, `PRIVACY.md`, `icons/` (no INSTALL.md), manifest at the zip root. Add a store-description line about Get RAVS export (already in `chrome-web-store/README.md`). Darpan uploads via Package → Upload new package → Submit for review.
- Switch computers to the store version only once the latest is approved there: install from the store link, then **Remove** the "Unpacked" copy. Never run both.
- Full listing text and steps: `chrome-web-store/README.md`.

**Testing:** there's no access to real RAVS from development. Earlier work tested the helper against mock RAVS pages (built from Darpan's screenshots) with Playwright/Chromium, including a mock `script.google.com/macros/s/<id>/exec` wrapper page, because the helper only trusts a linked `/exec` app. Those test scripts lived in temporary storage and are not in the repo; recreate them if needed. Real-RAVS behaviour is confirmed by Darpan's screenshots.

---

## 9. How a change goes live (the update flow)

1. Make the change on a branch and open a **pull request** on `darpan31patel-wq/psm-vaccine-clinic`. Never push straight to `main`. Keep `Index.html` small; new JavaScript goes in `app.js`.
2. Show Darpan a preview (screenshot or demo page with made-up data) and explain in plain words.
3. Darpan says **"go live"** → merge the PR (or Darpan presses Merge).
4. Within about 5 to 10 minutes every computer gets it on reload. Ask staff to reload the app (Cmd+R / Ctrl+R).
5. **Only if `Code.gs` or `appsscript.json` changed:** Darpan opens the data sheet → Extensions → Apps Script → pastes the new `Code.gs` → Save → Deploy → **Manage deployments** → pencil → Version: **New version** → Deploy. The link stays the same. (Not "New deployment", which makes a new link and breaks helper links and bookmarks.) If new Google permissions are needed, Google asks to authorise: Advanced → Go to … (unsafe) → Allow.
6. **Only if the helper changed:** bump `version` in `ravs-helper/manifest.json`. The Drive zip updates itself within about 10 minutes of someone opening the app. Each computer reinstalls by hand until the Web Store version is approved; after that, upload the new zip to the Web Store (only when no review is pending).
7. Update `BUILD` in `app.js` when useful, so Settings shows which build is running.

---

## 10. Setting up a computer

Full guide: `clinic-tool/multi-computer-setup.md` (project files). Summary:

1. **Chrome profile with only the pharmacy account** (a second signed-in Google account often causes "Sorry, unable to open the file at this time"). Turn on sync so bookmarks spread.
2. **Bookmark** the `/exec` link as **PSM Clinic** on the bookmarks bar.
3. **Install the RAVS Helper** (only on computers that use RAVS): download the latest helper zip from Drive "PSM Clinic backups", unzip, move the `ravs-helper` folder somewhere safe (Documents), chrome://extensions → Developer mode → Load unpacked → pick the folder → pin it. Open the app link around the install so the helper links to it.
4. **Log in to RAVS** via the app's RAVS button with the NHS login of the person using that computer. The app's RAVS check should turn green.
5. **Per computer:** set the **Operator** (top right). Offline mode is per computer.
6. **Shared, done once:** names in Settings → Staff; the one vaccinator in Settings → On duty; batches and products in Settings.
7. **Test:** register a test patient on one computer, see it on another within ~12 seconds, then Edit → Delete it.

Day to day: open the app, set Operator, press RAVS and log in, check the stock-take reminder, paste bookings, then run the clinic. Enter onto RAVS the same day.

---

## 11. The Google account move (in progress tonight)

**Why:** the current pharmacy Gmail is years old; Darpan wants a fresh account for better security. **Decided:** a new **free** pharmacy Gmail, not Google Workspace. (Darpan was told the Workspace benefits: Google's data processing terms suit patient data and DSPT, per-staff logins and sign-in logs, about £6/month plus a domain; a Gmail can't be converted later, so switching to Workspace would be a second move.)

**Status at the time of writing:** planned for the night of 21 Oct 2026, after clinic, about 1.5 hours. Not started as of 21:23 UTC; Darpan was to say "go" in the "Moving to a new Google account" thread. **Ask Darpan whether it was completed.** If so, the app link, sheet owner and Drive backups folder are all in the new account.

**The plan** (no code changes needed; nothing in the code names the account):

1. Before starting: every computer shows green **Live** (no "waiting to save"), because unsent saves live only in that computer's Chrome.
2. New account: unique password, 2-Step Verification with passkey or authenticator, clinic use only.
3. Share the old data sheet with the new account. In the new account: open it → File → **Make a copy**. This copies all tabs (Records, Settings, Changes, Recall) and the bound Apps Script.
4. Check the copy has the **Recall** tab (~8,100 people) and **Settings!A2** (staff, vaccinators with emails, stock-take date).
5. In the copy: Extensions → Apps Script → choose **turnOnBackups** → Run → Allow. This creates a new "PSM Clinic backups" folder in the new account.
6. Deploy → **New deployment** → Web app, Execute as Me, Only myself → copy the new `/exec` link.
7. Open the new link once and wait a minute. Check the new Drive folder has "PSM RAVS Helper 0.6.1.zip" (fallback: GitHub main.zip).
8. Rename the old sheet "OLD do not use". Later (Darpan's call, after about a week): remove the old account from the new sheet's sharing; delete the old sheet and old backups (irreversible).
9. **Per computer:** new Chrome profile for the new account (sync on), bookmark the new link, remove the helper and Load unpacked the 0.6.1 zip from the new Drive folder (so it relinks to the new app), set Operator, Offline mode if needed.
10. **Once:** check Settings → Staff shows names (add if not), pick the vaccinator in Settings → On duty.

Not copied by "Make a copy": script properties (version counter, backup times, linked folder id), triggers (hence step 5), and browser-side settings.

Keep the Chrome Web Store developer account and listing on the **old** account.

---

## 12. What is pending, parked and planned

### Waiting on Darpan

- Finish the Google account move (section 11).
- Check the "Seasons loaded" line on Possible opportunity shows 2021-22 and 2022-23.
- Try **Paste bookings** with a real day's bookings.
- Run Records → RAVS check → **Get RAVS export**, then **Add all to the app**.
- Send the **ProScript** PMR export (column headings are enough to start). Decision already made: save the **full** list (~8,000 patients) in the app, adding phone, address and medicine-based "possibly eligible, please check" risk flags. Don't re-argue this.
- Forward Google's **Chrome Web Store** review email.
- Forward **RAVS support's** reply about automatic background checks.

### Rules for pending work

- Don't upload 0.6.x to the Web Store until 0.5.8 is approved.
- Automatic background RAVS checks: only with RAVS's written permission.

### Parked (don't start until Darpan says)

- **Installable Mac/Windows app** that works without internet.
- **"Start spring COVID programme" button.** Offer it again before April 2027.

### Ideas offered, not picked yet

- Same-day alarm for anyone still "Not on RAVS yet".
- Batch stock and expiry tracking.
- Monthly counts ready for the MYS (Manage Your Service) claim.
- AccuRx bulk-text export of Possible opportunity.
- Patient self check-in tablet.
- Busy-hours chart.
- Daily clinic checklist (fridge temperatures, anaphylaxis kit, batch checks).
- RSV, pneumococcal and pertussis under Other.

### Known gaps and risks worth raising

- GitHub `main` is effectively production; turn on branch protection and keep 2FA.
- One shared Google account for all staff (Workspace would give per-staff logins).
- The helper depends on RAVS page labels; if NHS England changes RAVS, the helper says "Your turn on this page" and needs an update from screenshots.
- External libraries (ExcelJS, SheetJS) load from cdnjs without integrity hashes.
- The Records tab grows all season; Apps Script reads it all on each change. Fine at this size (thousands of rows), but watch speed. A new data sheet per season is an option.

---

## 13. Darpan to provide / grant access (checklist)

A new assistant can't log into Google, RAVS or the NHS for Darpan. Here's what to give it, from most to least important. **Never paste passwords, codes or patient data into any AI chat.**

| # | What | Why | How |
|---|---|---|---|
| 1 | **This document** | Full context | Paste it, or attach `HANDOVER.md`. |
| 2 | **GitHub repository access** to `darpan31patel-wq/psm-vaccine-clinic` | To read code and open pull requests | Best: install that assistant's GitHub app on just this repo. Or invite its GitHub account as a collaborator (Settings → Collaborators). Or create a fine-grained personal access token for this repo only (Contents and Pull requests: read and write) and put it in the tool's secret settings, never in chat. Keep the ability to merge to `main` yourself. |
| 3 | **Your decision on who merges** | `main` is the live app | Recommended: you press Merge after saying "go live". Turn on branch protection on `main` (Settings → Branches → require a pull request). |
| 4 | **The live app link** (`…/exec`) | So it knows which deployment is live | Copy from the address bar. It isn't secret, but only your Google account can open it. |
| 5 | **Google Sheet + Apps Script editor** | Only for Code.gs changes, checking the sheet, or debugging | Assistants can't log into Google. You paste Code.gs and press Deploy yourself, following its steps. For deeper debugging, screenshot the Apps Script **Executions** page (errors). Don't share the sheet with an AI service: it holds patient data. |
| 6 | **Drive folder "PSM Clinic backups"** | Backups, helper zip | Stays with you. Tell the assistant if a backup or zip looks wrong. |
| 7 | **Chrome Web Store developer console** | Helper updates | You log in and upload; the assistant gives you the zip and the text. Forward Google's review emails (remove any personal details). |
| 8 | **RAVS login** | Never shared | Nobody but staff ever logs into RAVS. Send screenshots of RAVS pages (with patient details covered) when the helper needs updating. |
| 9 | **Manage your appointments** login | Never shared | Staff copy and paste the day view. A screenshot of the table layout (dummy or covered) helps if pasting breaks. |
| 10 | **ProScript PMR export** | The planned full patient import | First send only the column headings row. The file itself is loaded into the app in the browser, not given to the assistant. |
| 11 | **Old season sheets** | Already loaded | Only needed again if the Recall tab is lost; then use Possible opportunity → Add old season files. |
| 12 | **RAVS support's reply** | Decides automatic background checks | Forward the text. |
| 13 | **Screenshots** | Debugging and new features | Cover patient names, NHS numbers and dates of birth first. |
| 14 | **Which Google account is current** | After the move | Just say "old" or "new". Never paste the address. |

**What the assistant should never be given:** passwords, 2-step codes, NHS smartcard or Okta details, patient spreadsheets, staff email addresses, or raw RAVS exports.

---

## 14. First questions to ask Darpan

1. Did the Google account move finish? Are all computers on the new link, showing green **Live**, with helper 0.6.1?
2. Has the Chrome Web Store approved 0.5.8? (If yes, prepare the 0.6.1 zip for upload.)
3. Has RAVS support replied about automatic checks?
4. Is the ProScript export ready (headings first)?
5. Did Get RAVS export + Add all to the app work, and does "Seasons loaded" show every season?
6. Anything broken or annoying at the desk this week?
7. What's the next priority from the ideas list?

---

## 15. If Claude access is lost: export everything

**Nothing important lives only in Claude.** The code is on GitHub, the data is in Google. Still, do this now, while access works:

1. **Code:** https://github.com/darpan31patel-wq/psm-vaccine-clinic → green **Code** button → **Download ZIP**. (GitHub keeps everything anyway.)
2. **This handover:** it's in the repo at `docs/HANDOVER.md` once the pull request is merged, and in the project files at `clinic-tool/handover/HANDOVER.md`. Save a copy to your computer or Drive too.
3. **Claude project files:** in the Claude project, open the files panel and download the `clinic-tool` folder: `multi-computer-setup.md`, `questions-master.md`, `chrome-web-store/` (the 0.5.8 zip, screenshots, promo tile, listing text), `preview/` (screenshots with made-up data), `ravs-helper/`. Don't download anything from `uploads/`; those are your old patient sheets, which you already have in Google Drive.
4. **Data:** already in your Google account (the data sheet plus 30 nightly backups). For an extra offline copy: Records → **Export to Excel** (whole season), and in the sheet File → Download → Microsoft Excel. Store it encrypted; it's patient data.
5. **Published pages** (the demo and plan links in section 4) live on claude.ai and will stop working. They're nice to have, not needed: the repo contains the real app.
6. **Memory:** this document already contains everything the Claude project remembered (decisions, preferences, status). Nothing else needs exporting.

**To carry on with a different AI:** give it this document and repo access (section 13). It should read the repo, ask the section 14 questions, and follow the update flow in section 9. A coding assistant with GitHub access can do everything except the Google, RAVS and Web Store clicks, which you do from its instructions.

**If no AI is available at all:** the app keeps running as it is. It needs nothing from Claude. Keep pressing "Fill in RAVS", keep the nightly backups on, and use `app/SETUP.md` and `multi-computer-setup.md` for any new computer.

---

## 16. Conventions and hard rules

- **Privacy:** keep logins, patient data, staff names and emails, and Darpan's account addresses out of chat, memory, files and the repo. Previews and screenshots use made-up data only.
- **Repo is code only.** Never commit exports, uploads or real data.
- **PRs, not direct pushes to `main`.** Merge only on Darpan's "go live".
- **Never press Confirm and save on RAVS automatically.** No bulk/automatic RAVS lookups without RAVS's written OK.
- **Nothing is ever deleted** by the app's own tools: deletes are soft (`status: deleted`), rollover only adds.
- **Code style:** plain modern JavaScript, no build step, no framework. Short functions, terse comments that explain why. Labels and messages in plain UK English. `Index.html` stays small (Google's loader breaks above ~100 KB); code goes in `app.js`.
- **Several workstreams give setup steps** (helper source, Web Store uploads, Code.gs pastes). If two sets of instructions differ, post one combined list.
- **Replies to Darpan:** short, plain, step by step, with exact clicks and links. Batch questions. Offer feature ideas.

---

## 17. Glossary

- **RAVS:** NHS England "Record a vaccination" service, where every NHS vaccination must be recorded.
- **MYA / Manage your appointments:** the NHS booking site the bookings are copied from.
- **MYS:** Manage Your Service, the NHS claims portal (claim figures come from the RAVS export).
- **PMR / ProScript:** the pharmacy's patient medication record system.
- **AccuRx:** the messaging tool used to text patients.
- **DSPT:** Data Security and Protection Toolkit (NHS information governance).
- **Operator:** the staff member doing the admin on a computer (for the app's audit only).
- **Vaccinator:** the clinician giving the jab, chosen from RAVS's list.
- **aTIV / TIVc / LAIV:** adjuvanted trivalent, cell-based trivalent, and live attenuated (nasal) flu vaccines.
- **/exec link:** the address of the deployed Apps Script web app.
- **Helper:** the PSM RAVS Helper Chrome extension.

---

## 18. History of changes (PR #1 to #29)

All merged and live as of 21 Oct 2026 21:23 UTC. No open pull requests.

- **Start (16-17 Oct):** discovery of the old sheets and RAVS screenshots. Chosen design: Apps Script web app bound to a new sheet + a Chrome add-on for RAVS. First version, then a calmer redesign after Darpan found v1 "very congested".
- **20 Oct:** code moved to GitHub; the app loads from `main`.
  - #1 Find patient / Record vaccination split, Search RAVS via the helper. #2-#3 clear search messages, live step status, login detection.
  - #4 RAVS button with status. #5 it always opens RAVS. #6 side by side + www address + connection check. #7 bridge survives Apps Script's `document.write`.
  - #8 clinic layout, Bookings tab, To record by date, vaccinator names from RAVS. #9 private flu/COVID. #10 Excel export, more numbers, required Operator box, helper waits for "Vaccination saved". #11 Offline mode. #12 keep RAVS logged in. #13 Vaccinated locked until complete, Settings always open.
  - #14 **app.js split** (fixed "app dead": Google's loader failed on the ~150 KB page). #15 separate operator and vaccinator lists.
- **21 Oct:**
  - #16 helper presses Continue on the patient details page. #17 Healthcare worker → non-clinical option.
  - #18 livelier design, real logo, Select vaccine (Flu, COVID, Private, Other), one-line rows.
  - #22 **reliability:** save queue, Changes tab, nightly backups, Drive app copy, helper trusts only the linked app (0.5.7). Needed a Code.gs paste + turnOnBackups.
  - #23 Recall tab (old seasons, ~8,100 people; Code.gs change). #24 Check on RAVS per patient.
  - #19 vaccinator per computer (later replaced by #29). #21 helper 0.5.8 + Web Store listing files. #25 latest helper zip kept in Drive.
  - #20 **RAVS check** + Get RAVS export (helper 0.6.0). #26 Recall renamed "Possible opportunity" on screen.
  - #27 Seasons loaded line + Start next season. #28 wording: autumn/winter (flu + COVID).
  - #29 shared Staff lists, one shared vaccinator with a RAVS-style picker (names + emails, helper 0.6.1), "+ Add a name…" in the Operator box, stock-take reminder every 3 days.
