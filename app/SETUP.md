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

1. **Before opening:** in Manage your appointments, open today's day view.
   - Select the appointments table, copy it, and use **Paste bookings** on the Front desk tab.
2. **Clinic:** for bookings, press **Check in**. For walk-ins, type NHS number or name, date of birth and postcode, then press **Vaccinated** once the jab is given. **Not vaccinated yet** puts them on a waiting list instead.
   - The age check runs automatically. Anyone under the age line needs a reason before they can be registered.
3. **Vaccinated today:** batch, arm, consent and vaccinator are filled from Settings. **Edit** on the list changes any of them.
4. **To record:** shows everything not yet on RAVS.
   - Copy each field across, save in RAVS, then press **Entered on RAVS**.
   - Anything from an earlier day turns amber. It turns red when it's 10 or more days late, because after 15 days it can't be claimed.
5. **Records:** shows daily totals (your old AUDIT tab), search, and a CSV export.

**Faster RAVS entry:** install the RAVS Helper add-on (see `../ravs-helper/INSTALL.md`). The To record tab then has **Fill in RAVS** buttons that fill each RAVS page for you.

## If the internet goes down

The app needs the internet to save. Carry on with your OFFLINE sheet or paper, then register those patients in the app once you're back online.

## Updating to a new version

1. Paste the new files into the Apps Script editor, as in step 2.
2. Go to **Deploy → Manage deployments**, click the pencil, set **Version: New version**, and click **Deploy**.

The link stays the same.

## Where the data is

Everything is in the **Records** tab of the app data sheet, with one row per vaccine given. You can open the sheet like any other. Please don't rename or reorder its columns.
