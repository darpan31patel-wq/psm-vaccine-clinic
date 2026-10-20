# RAVS Helper: install and use

The RAVS Helper is a small Chrome add-on. It fills in each Record a vaccination (RAVS) page from the clinic app, one vaccination at a time. It never presses **Confirm and save**. A person always checks the summary page and presses it.

Install it on the front-desk Mac (for **Search RAVS**) and on the Mac used for RAVS entries. It takes about 2 minutes per Mac. Each of those Macs also needs RAVS logged in, in a Chrome tab.

## Install

1. Download `ravs-helper.zip` from the project files and double-click it to unzip. You'll get a folder called `psm-ravs-helper`.
   - Move that folder somewhere it won't be deleted, such as Documents.
2. In Chrome, go to `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and choose the `psm-ravs-helper` folder.
5. Pin it: click the puzzle icon in the toolbar, then the pin next to **PSM RAVS Helper**.
6. Reload the clinic app tab.
   - On the **To record** tab you should see "RAVS Helper is connected" and a **Fill in RAVS** button on each card.

Chrome may show a "developer mode extensions" notice when it starts. That's normal for an add-on you installed yourself. Close it.

## Use

1. Log in to RAVS in a Chrome tab as usual. The helper never sees or stores your login.
2. In the clinic app, open **To record**. Press **Fill in RAVS** on one card, or **Fill all in RAVS** to queue every vaccination still waiting.
3. The RAVS tab comes to the front, and the helper works through the pages:
   - It enters the NHS number. If there isn't one, it searches by name, date of birth and postcode.
   - It checks that RAVS found the same patient, comparing the NHS number and date of birth, and that the full profile (NHS number, address and GP) is showing. If not, it stops and shows a red message.
   - It picks the date, vaccinator, vaccine, product, batch, eligibility reason, consent and injection site.
4. On **Check and confirm** it compares everything with the app.
   - If it all matches, it says so in an amber box. Check the page and press **Confirm and save** yourself.
   - If something doesn't match, it lists what to check.
5. Once RAVS has saved, the app marks the vaccination as recorded. It also saves the patient's address and GP, plus the NHS number if the desk didn't have one. Then the helper starts the next one in the queue.

The panel in the bottom-right corner of RAVS has these buttons:
- **Pause / Resume:** stop filling while you do something by hand.
- **Skip this one:** leave it for later. It stays on the app's To record list.
- **Fill this page again:** use this if a page didn't fill.
- **Clear queue:** empty the helper's list.

## Searching for a patient from the Clinic screen

When the desk presses **Search RAVS**, the helper uses the RAVS tab in the background. It enters the NHS number (or name, date of birth and postcode), stops on the patient's details page and sends those details back to the app. Nothing is recorded in RAVS. If RAVS can't find the patient, or isn't logged in, the app says so.

## When it stops and asks you

- **"Check this patient":** RAVS found a different NHS number or date of birth, or the record is missing its NHS number, address or GP (so it may not be the full profile). Check with the patient, then carry on by hand.
- **"Batch … isn't listed in RAVS":** add the batch under Vaccines in RAVS, or fix the batch in the app's Settings.
- **"Couldn't find … in the vaccinator list":** the vaccinator's name in the app's Settings must match how RAVS shows it, for example `adelaid Cela`.
- **Any page it doesn't recognise:** it says "Your turn on this page". Fill it in yourself and it carries on from the next page it knows.

## Good to know

- **Batches:** for the batch step to work, each batch number must be in the app's Settings exactly as RAVS lists it.
- **COVID product:** set the COVID product name in Settings to exactly what RAVS shows (for example "Spikevax XFG").
- **Patient details in Chrome:** the queue is kept only in that Mac's Chrome. Each record is removed as soon as it's saved, and **Clear queue** removes everything.
- **RAVS changes:** RAVS is still in beta, and if NHS England changes a page the helper may stop filling it. It will say "Your turn on this page" instead of guessing. Send me a screenshot and I'll update it.
- **Terms of use:** please read RAVS's Terms of use (link at the bottom of every RAVS page). Make sure you're happy that a helper that fills forms, with a person confirming every record, fits them.

## Updating

When I send a new version, unzip it over the same folder. Then press the reload arrow on **PSM RAVS Helper** in `chrome://extensions`.
