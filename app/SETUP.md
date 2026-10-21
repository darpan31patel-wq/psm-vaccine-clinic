# Setting up the PSM Vaccine Clinic app

This takes about 10 minutes. The app runs inside your own Google account. All the patient data stays in one Google Sheet that only that account can open, the same as your current sheets.

## What you need

- The pharmacy Google account that owns your current "2026 FLU COVID" sheet.
- The three files in this folder: `Code.gs`, `Index.html` and `appsscript.json`.

## 1. Make the data sheet

1. In Google Drive, signed in as the pharmacy account, click **New → Google Sheets**.
2. Name it **Vaccine Clinic 2026-27 (app data)**.
3. Don't share it with anyone.

## 2. Add the app to the sheet

1. In that sheet, click **Extensions → Apps Script**.
2. In the file called `Code.gs`, delete what's there and paste in everything from our `Code.gs`.
3. Click the **+** next to Files, choose **HTML**, and name it exactly `Index`.
4. Delete what's in the new file and paste in everything from our `Index.html`.
5. Click the gear icon (**Project Settings**) and tick **Show "appsscript.json" manifest file in editor**.
6. Go back to the editor, open `appsscript.json`, and replace its contents with ours. This sets the time zone to London.
7. Click **Save** (the disk icon).

## 3. Turn it on

1. Click **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Only myself**.
4. Click **Deploy**, then **Authorise access**, and choose the pharmacy account.
   - Google will warn that the app isn't verified. That's because you wrote it yourself.
   - Click **Advanced → Go to … (unsafe)**, then **Allow**.
5. Copy the **Web app URL**.

## 4. Use it on each computer

1. On each of the three computers, open Chrome signed in as the same pharmacy Google account.
2. Open the Web app URL and bookmark it.

"Only myself" means only that Google account can open the app. Anyone else gets a Google "no access" page.

## 5. First-time settings

Open the app and go to **Settings**:

- **Vaccinators:** type each name exactly as RAVS shows it in the vaccinator list.
- **Vaccinator on duty:** choose who's vaccinating today.
- **Today's vaccine stock:** type the batch number for each product.
  - For COVID, change the product name to the one RAVS shows.
- **Desk staff:** add their names.
- **Locations:** "Off-site: Kingston Council" is already there.
- **Age rules:** these are set to 65 by 31/03/2027 for flu and 75 by 31/01/2027 for COVID. Check them against this season's guidance.

Click **Save settings**. Settings are shared, so every computer picks them up within about 10 seconds.

## Day to day

At the start of the day, press **Open RAVS** at the top of the app and log in to RAVS. RAVS opens on the right half of the screen with the app on the left. Then press the connection button next to it: it should say **Connected**.

1. **Before opening:** in Manage your appointments, open today's day view.
   - Select the appointments table, copy it, and use **Paste bookings** on the Front desk tab.
2. **Clinic, box 1 (Find patient):** type the NHS number, or first name, last name and date of birth, and press **Search RAVS**. For bookings, **Check in** fills these in and searches straight away.
   - The RAVS Helper looks the patient up in the RAVS tab and shows their name, date of birth, NHS number, address, GP and past vaccinations. Check them with the patient, then press **Confirm patient**.
   - This needs the RAVS Helper installed and RAVS logged in on the front-desk Mac. Without it, use **Continue without checking RAVS**.
3. **Clinic, box 2 (Record vaccination):** choose the vaccines and press **Vaccinated** once the jab is given. Batch, arm, consent and vaccinator come from Settings, and **Edit** on the Vaccinated today list changes any of them. **Not vaccinated yet** puts the patient on a waiting list instead.
4. **To record:** shows everything not yet on RAVS.
   - Copy each field across, save in RAVS, then press **Entered on RAVS**.
   - Anything from an earlier day turns amber. It turns red when it's 10 or more days late, because after 15 days it can't be claimed.
5. **Records:** shows daily totals (your old AUDIT tab), search, and a CSV export.

**Faster RAVS entry:** install the RAVS Helper add-on (see `../ravs-helper/INSTALL.md`). The To record tab then has **Fill in RAVS** buttons that fill each RAVS page for you.

## If the internet goes down

If a save can't reach Google, the app keeps it on that computer, inside Chrome. The header shows **2 waiting to save** in red, and the saves are sent by themselves, in order, once the connection is back. Don't clear Chrome's browsing data while that badge shows.

The app itself needs the internet to open. If it won't open, carry on with Offline mode, paper or your OFFLINE sheet, then register those patients once you're back online.

## Backups, the change log and the app copy

- **Nightly backup:** every night at about 2am, Google copies every tab of the app data sheet into a new sheet in the Drive folder **PSM Clinic backups**. The newest 30 are kept. The time of the last backup is at the bottom of Settings.
- **Change log:** the **Changes** tab in the app data sheet lists every save, edit, delete and settings change, with who (the Operator) and when.
- **App copy:** the same Drive folder holds **App copy - Index.html** and **App copy - app.js**. The app uses them if GitHub can't be reached. They update by themselves. Don't edit or delete them.

To turn the nightly backup on (once):

1. In the app data sheet, click **Extensions → Apps Script**.
2. In the list next to **Run** at the top, choose **turnOnBackups**, then press **Run**.
3. Google asks for permission. Choose the pharmacy account, then **Advanced → Go to … (unsafe) → Allow**. This lets the app use Google Drive for the backups.

## Updating to a new version

1. Paste the new files into the Apps Script editor, as in step 2.
2. Go to **Deploy → Manage deployments**, click the pencil, set **Version: New version**, and click **Deploy**.

The link stays the same.

## Where the data is

Everything is in the **Records** tab of the app data sheet, with one row per vaccine given. You can open the sheet like any other. Please don't rename or reorder its columns.
