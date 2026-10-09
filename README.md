# AstroRao · Astronomy Chart

A lightweight, bilingual stargazing guide built with SvelteKit 2, Svelte 5, and TypeScript.
Choose a location and an observation time to find familiar bright stars and complete sky patterns.

[Existing live app](https://mr-sky.vercel.app/) · [Repository](https://github.com/Huginn-ai/astronomyChart)

## What it does

- Search 29 cities by English or Chinese name, use device location, or enter coordinates.
- Set an explicit observation time zone. City selection fills the corresponding IANA zone.
- Preview the sky as you change the settings; see daytime and twilight guidance on the results page.
- Start with three bright stars, prioritized by brightness and altitude.
- Rotate the horizon map by dragging, keyboard, or slider. Select a target to highlight it.
- Show or hide labels, pattern lines, and the grid; save the horizon map as a PNG.
- Keep the optional Celestial equatorial view, loaded only when requested.
- Search targets, sort them, and filter by altitude and magnitude.
- Show complete asterisms, including all seven Big Dipper stars with their bowl and handle.
- Switch English / 中文, change Chinese name styles, and use a red-light night theme.
- Share a URL that preserves one exact UTC instant, location, time zone, and filters.
- Remember language, location settings, name style, and chart preference when browser storage is available.

## Run locally

Use Node.js 22 or later:

```sh
npm ci
npm run dev
```

## Checks

```sh
npm run check
npm run lint
npm test
npm run build
```

The regression tests cover known sidereal-time values, rising/setting geometry,
geographic poles, precession invariants, solar declination, cross-zone times,
DST gaps and folds, shared-link validation, compass wording, catalog membership,
filter completeness, daylight guidance, and bilingual message coverage.

## Observation time and sharing

The form's date/time belongs to the chosen **observation time zone**, not the viewer's
browser zone. City selection supplies the zone; manual coordinates allow any
recognized IANA zone. Device location uses the browser zone, which remains editable.

New links store the observation instant as ISO UTC (`time=…Z`) and store its
display zone separately (`tz=America/New_York`). Opening the link elsewhere
therefore produces the same star positions. Older local-time links remain supported
and are interpreted in the viewer's browser zone when no zone was recorded.

Nonexistent times during a spring DST change are rejected. When a time occurs
twice during the autumn change, the earlier occurrence is selected and the form
explains that choice. Invalid saved settings or blocked local storage do not
prevent the application from working.

## Astronomy and interpretation

Catalog positions are approximate J2000 RA/Dec. We precess them to the observation
date using the IAU 1976 mean-position model, compute local mean sidereal time, and
convert to geometric altitude/azimuth. The vector conversion is finite at the poles.
Azimuth is clockwise from **true north**; longitude is east-positive.

Atmospheric refraction, nutation, aberration, and stellar proper motion are omitted.
This is a guide to recognizing bright targets, not precision telescope pointing.
Clouds, moonlight, light pollution, and obstructions affect actual visibility.
A target above the horizon is listed even during daylight; the sky-condition notice
explains why it may not be visible to the eye.

The easiest-first order uses a simple score:
`2 × sin(altitude) − 0.45 × magnitude`. It is guidance, not a probability of detection.
Clusters use their combined magnitude and are excluded from the three-star recommendations.

Asterisms appear only if **every member** passes the altitude and magnitude filters.
The Pleiades entry represents the cluster center, rather than its individual members.

Sources and references:

- [USNO altitude/azimuth conversion](https://aa.usno.navy.mil/faq/alt_az)
- [USNO approximate solar coordinates](https://aa.usno.navy.mil/faq/sun_approx)
- [Meeus precession algorithm reference](https://pymeeus.readthedocs.io/en/stable/core/Coordinates.html)
- [Hong Kong Space Museum bright-star names](https://hk.space.museum/en/web/spm/resources/teachers-corner/constellations-and-myths/glossary-of-bright-stars.html)
- [Celestial chart API](https://github.com/ofrohn/d3-celestial)

## Source layout

| Path                             | Purpose                                                      |
| -------------------------------- | ------------------------------------------------------------ |
| `src/routes/+page.svelte`        | Observation form and live preview                            |
| `src/routes/result/+page.svelte` | Sky guide, maps, and target filtering                        |
| `src/lib/components/`            | Horizon canvas, Celestial wrapper, and icons                 |
| `src/lib/utils/astro.ts`         | Coordinate conversion, precession, and Sun position          |
| `src/lib/utils/time.ts`          | IANA-zone date/time handling                                 |
| `src/lib/utils/observing.ts`     | Validated settings, target filtering, and compass wording    |
| `src/lib/i18n/`                  | Static bilingual messages and component-scoped subscriptions |
| `src/lib/stars/catalog.ts`       | Curated stars, cluster, and asterism membership              |
| `tests/observing.test.ts`        | Numerical and behavior regressions                           |

## Deployment

The existing SvelteKit `adapter-auto` configuration supports the project's Vercel workflow.
Import the repository in Vercel or merge a reviewed branch through the existing deployment setup.
No API keys or external catalog service are required for the main observing flow.

Created by Caiqi (Maggie) Rao · GitHub: Huginn-ai.
