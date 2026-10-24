# Proteus by Outis

Source of the public website for **Proteus**, a modular robot developed by Outis in Berlin. The site is live at [outis-robotics.com](https://outis-robotics.com).

Proteus is a robot made of identical modules that changes its shape during the task: a walker over rubble, a chain through a small opening, a braced structure that works with force on site.

## Structure

| Path | Content |
|---|---|
| `index.html` | Home page |
| `impressum.html`, `privacy.html` | Legal notice and privacy policy (German) |
| `404.html` | Not-found page |
| `assets/css/site.css` | Styles |
| `assets/js/main.js` | Navigation, film player, looping clips with pause controls, scroll reveals |
| `assets/fonts/` | Archivo and IBM Plex Mono, self-hosted |
| `assets/media/` | Videos, video posters and images |
| `assets/img/` | Favicons |

## How it works

A static site with no build step. GitHub Pages serves it directly from the `main` branch, so every commit to `main` goes live, usually within minutes. The site sets no cookies, uses no tracking and loads no resources from third parties.

## Local preview

Serve the folder with any static server that supports HTTP range requests (Safari needs them to play video), for example:

```bash
npx serve .
```

## Contact

Yannik Trinn · [yannik.trinn@outis-robotics.com](mailto:yannik.trinn@outis-robotics.com)

## Copyright

© 2026 Yannik Trinn and Ruben Estrella (Outis). All rights reserved. Text, images and videos may not be reused without written permission. The fonts Archivo and IBM Plex Mono are licensed under the SIL Open Font License 1.1.
