# Putting the RAVS Helper on the Chrome Web Store (unlisted)

Once the helper is on the Web Store, every computer updates it automatically. No more zip files or "Load unpacked".

"Unlisted" means nobody can find it by searching. Only people with the link can install it.

## What you need

- The pharmacy Google account, with 2-Step Verification turned on: https://myaccount.google.com/signinoptions/twosv
- A bank card for Google's one-off US$5 developer fee.
- The files in this folder:
  - **psm-ravs-helper-0.5.8.zip**: the helper itself. Upload it as it is, don't unzip it.
  - **screenshot-1-app.png** and **screenshot-2-ravs.png**: 1280×800, dummy data only.
  - **promo-tile-440x280.png**
  - The text to paste, further down this page.

## Step 1. Register as a Chrome Web Store developer (once)

1. In Chrome, signed in as the pharmacy account, open https://chrome.google.com/webstore/devconsole
2. Accept the developer agreement, then pay the US$5 registration fee.
3. Go to **Settings** on the left (it may say **Account**). You must add and verify the contact email before you can publish:
   - **Publisher name:** PSM Pharmacy
   - **Contact email:** the pharmacy Gmail. Press **Verify** and click the link Google emails you.
   - **Trader / non-trader:** if Google asks, Non-trader is the usual choice for an in-house tool that isn't sold.
4. Press **Save changes**.

## Step 2. Upload the helper

1. Click **Items** on the left, then **+ New item** at the top right.
2. Choose **psm-ravs-helper-0.5.8.zip** and press **Upload**.

## Step 3. Store listing tab

Copy and paste these:

- **Description:**

  > PSM RAVS Helper is an in-house tool for PSM Pharmacy staff. It works with the PSM Vaccine Clinic app.
  >
  > When staff press "Fill in RAVS" in the clinic app, the helper opens Record a vaccination (RAVS) and fills in each page: the patient search, vaccination date, vaccinator, vaccine and batch, reason, consent and injection site. It stops on the final "Check and confirm" page. Staff check the details and press Confirm and save themselves. The helper never saves a record on its own.
  >
  > Once RAVS shows "Vaccination saved", the clinic app marks the patient as entered on RAVS. During clinic hours it also keeps the RAVS login active.
  >
  > When staff press "Get RAVS export" in the clinic app, the helper makes the pharmacy's own vaccination report on RAVS's Reports pages and passes it to the clinic app, which checks that nothing has been missed. Making the report changes no records.
  >
  > It is only useful to PSM Pharmacy staff who use the PSM Vaccine Clinic app.

- **Category:** Productivity → Workflow & Planning (or Tools)
- **Language:** English (United Kingdom)
- **Store icon:** already inside the zip. If it asks for one, upload `icon128.png` from the `icons` folder inside the zip.
- **Screenshots:** upload screenshot-1-app.png and screenshot-2-ravs.png.
- **Small promo tile:** upload promo-tile-440x280.png.
- **Official URL / Homepage:** leave blank.
- **Support URL:** leave blank.

Press **Save draft**.

## Step 4. Privacy tab

- **Single purpose:**

  > Fills in NHS RAVS (Record a vaccination) pages with vaccination details from the pharmacy's own clinic app, so staff don't retype them. Staff check and save each record themselves.

- **Permission justification, storage:**

  > Keeps the list of records waiting to be filled in on this computer until the clinic app confirms they are done, then removes them.

- **Host permission justification:**

  > ravs.england.nhs.uk: to fill in the Record a vaccination pages and read the "Vaccination saved" result. googleusercontent.com: the pharmacy's clinic app is a Google Apps Script web app, which Google serves from script.googleusercontent.com. script.google.com: to read the address of the clinic app's tab, so the helper links itself to the pharmacy's own copy of the app and never passes patient details to any other page. The helper only acts on the page that carries the clinic app's marker, and does nothing on any other Google page.

- **Are you using remote code?** No, I am not using remote code.
- **Data usage.** Tick these:
  - Personally identifiable information
  - Health information
  - Website content

  Then tick all three certifications: not sold to third parties, not used for unrelated purposes, not used for credit.
- **Privacy policy URL:** https://github.com/darpan31patel-wq/psm-vaccine-clinic/blob/main/ravs-helper/PRIVACY.md

Press **Save draft**.

## Step 5. Distribution tab

- **Payments:** Free of charge.
- **Visibility:** **Unlisted**.
- **Regions:** All regions (or just United Kingdom).

Press **Save draft**, then **Submit for review** at the top right. Leave **"Publish automatically after approval"** ticked.

## Step 6. Wait for review

Google reviews it, even though it's unlisted. That usually takes a few days, and can be longer. You get an email when it's approved, or if they want changes. Forward me anything they say.

## Step 7. Install it on each computer (after approval)

1. In the developer dashboard, open the item and copy its **Store link**. It looks like `https://chromewebstore.google.com/detail/psm-ravs-helper/…`
2. On each computer, signed in to the pharmacy Chrome profile, open the link and press **Add to Chrome**. The helper links itself to the first clinic app it sees, so open the app from the usual **PSM Clinic** bookmark.
3. Go to **chrome://extensions** and press **Remove** on the old "PSM RAVS Helper" that says **Unpacked**. Keep the new one. Don't run both at once.
4. Close the RAVS window and reload the clinic app. Settings should show RAVS Helper 0.5.8.

## Future updates

When I change the helper, I'll give you a new zip with a higher version number. Then:

1. Open the item in the dashboard.
2. Go to **Package** and press **Upload new package**.
3. If I've changed the description or the privacy answers, paste the new text from this page into **Store listing** or **Privacy**.
4. Press **Submit for review**.

Only send a new version once the last one has been approved. Sending one while a review is still running cancels it and starts again.

Every computer picks up the new version on its own once Google approves it, usually within a few hours of approval. Nobody has to reinstall anything.
