# PSM RAVS Helper: privacy policy

PSM RAVS Helper is a Chrome extension used only by staff at PSM Pharmacy. It copies vaccination details from the pharmacy's own clinic app (a Google Apps Script web app) into the NHS "Record a vaccination" service (RAVS), on the same computer, so staff don't have to retype them.

## What it handles

- Patient details the clinic app sends it to record a vaccination: name, date of birth, NHS number, postcode, the vaccine, batch, vaccinator, reason, consent, injection site and any note.
- What RAVS shows after a patient search (address, GP and NHS number), which it passes back to the clinic app.
- The list of vaccinators shown on RAVS, with the email address RAVS shows next to each name.
- When staff press Get RAVS export in the clinic app: the pharmacy's own RAVS vaccination report (made on RAVS's Reports pages for dates staff choose), which it passes to the clinic app's RAVS check.

## Where it goes

- Data only moves between the clinic app and RAVS in the same Chrome window on the same computer.
- While a record is waiting to be filled in, it is kept in Chrome's local extension storage on that computer. It is removed once the clinic app confirms it has the result.
- Nothing is sent to the extension's developer or to anyone else. There are no analytics, adverts or tracking.
- The only network requests the extension makes itself go to RAVS: to keep the user's existing RAVS session signed in during clinic hours, and to read the report file RAVS has just made when staff ask for the RAVS export.

## What it doesn't do

- It never presses "Confirm and save" on RAVS. Staff check every page and save it themselves. For the RAVS export it presses "Confirm and create report", which only makes a report and changes no records.
- It doesn't read or change any other website. On Google pages it only runs inside the PSM clinic app.
- Its access to script.google.com is only used to read the address of the clinic app's tab. The helper links itself to the pharmacy's own copy of the app and never passes patient details to any other page.
- Data is never sold, shared or used for anything other than recording the pharmacy's own vaccinations.

## Contact

PSM Pharmacy. Ask at the pharmacy, or use the contact email on the Chrome Web Store listing.
