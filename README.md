# PSM Vaccine Clinic

The flu and COVID clinic app for PSM Pharmacy, plus the RAVS Helper Chrome add-on.

- `app/`: the Google Apps Script web app. See `app/SETUP.md`.
- `ravs-helper/`: the Chrome add-on that fills RAVS pages. See `ravs-helper/INSTALL.md`.
- `docs/HANDOVER.md`: the full project handover: how everything works, what's pending, and what access a new assistant or developer needs.

The live app loads `app/Index.html` from the `main` branch of this repository, so a change goes live within about 5 minutes of being merged. If GitHub can't be reached, the app uses the copy pasted into Apps Script.

This repository holds code only. Never commit patient details, logins or exports.
