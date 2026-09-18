# Oddball 2026

Static race-results template. Event: September 26, 2026 at Olympic Village, Vancouver (using the onboarding location wording; verified against https://dragonboatbc.ca/competition/fallclassic/). The header uses the supplied Oddball Fall Classic SVG from work-db/logos. races.json is intentionally empty until the Oddball Google Sheet publishes its grid.

## Cloudflare Pages

Suggested project name: oddball2026
Expected URL, if available: https://oddball2026.pages.dev/
Framework preset: None
Build command: exit 0
Build output directory: .

For a separate oddball2026 GitHub repository, copy this folder's contents into its root and leave the Cloudflare root directory blank. Select its production branch (normally main).

If deploying from db-race-grids instead, set the Cloudflare root directory to oddball2026. Only deploy this event folder.

Reference: https://developers.cloudflare.com/pages/framework-guides/deploy-anything/

## Before race day

- Review the event header and supplied Oddball artwork in index.html.
- Set the sheet exporter to the chosen repository, branch, and races.json path.
- Add an Oddball 2026 admin dropdown option with value oddball.
- Add the final public origin (expected https://oddball2026.pages.dev) to the marshalling Worker's allowed origins and deploy the Worker.
- Site session: oddball. KV status key: oddball:status (created on the first admin update).
- Verify results publishing and marshalling end to end, then clear test timestamps and reset marshalling.

The template does not create a GitHub repository, Cloudflare project, admin option, or Worker configuration.
