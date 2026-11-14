# React + Vite

## Sweety frontend

The authenticated application has separate routes for `/dashboard`, `/analytics`,
and `/reports`. Sign-in and registration remain public routes; all three tracking
pages share the authenticated navigation layout.

Copy `.env.example` to `.env` and set `VITE_API_URL` to the backend API base URL.
`VITE_APP_TIME_ZONE` defines the calendar used for date presets and date-only
display (defaults to `Asia/Kolkata`); set the backend `APP_TIME_ZONE` to the same
value so future-date validation uses the same calendar.

The top navigation theme controls offer Light and Dark modes. The selected
preference is saved locally as `sweety-theme` and stays in the browser; it is
not sent to the backend.

Dashboard and Analytics each have independent, inclusive date and time-slot
filters. Presets use the application calendar: yesterday is the previous date,
Last 7/30 Days include today plus the preceding 6/29 dates, and month presets
use calendar-month boundaries. Custom ranges are inclusive and cannot end in
the future or start after their end date.

Reports use their own filters and apply only when **Generate report** is
selected. A weekly report covers the selected week-ending date and previous
six calendar days; a monthly report covers the selected calendar month up to
today when it is the current month. Custom report ranges are inclusive. The
selected time slot is applied to report statistics, charts, breakdowns, and
individual readings; **All time slots** includes every recorded slot.

Run the frontend checks from `client` with `npm test`, `npm run lint`, and
`npm run build`.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

DEMO_DOCTOR_PASSWORD=YourUniqueStrongPassword123!

/_
Doctor Login email
Ananya Rao ananya.rao@demo.sweety.test
Rahul Mehta rahul.mehta@demo.sweety.test
Priya Nair priya.nair@demo.sweety.test
Arjun Sharma arjun.sharma@demo.sweety.test
Sneha Iyer sneha.iyer@demo.sweety.test
_/
