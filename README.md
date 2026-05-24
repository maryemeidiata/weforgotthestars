# We Forgot the Stars

A cinematic scrollytelling data essay about light pollution and what we gave away.

**[Live site →](https://weforgotthestars.vercel.app)**  &nbsp;|&nbsp; **[Portfolio →](https://maryemeidiata.vercel.app)**

---

## About

*We Forgot the Stars* traces how electric light erased the night sky, city by city, decade by decade. The essay moves through seven sections, from what a pristine Bortle 1 sky looks like to what it would take to get it back.

The visual centrepiece is a per-pixel reprojection of NASA's Black Marble satellite composite, real 2016 measurements of artificial light at night, rendered directly onto a D3 Natural Earth map.

---

## Sections

| # | Title | Visual |
|---|-------|--------|
| 1 | The Baseline Sky | Animated star field — Bortle 1, natural dark sky |
| 2 | Why We Lost It | Bortle scale degradation driven by scroll position |
| 3 | The First Cities to Lose the Stars | Draggable D3 globe, electrification by decade 1870–1950 |
| 4 | Where We Are Now | NASA Black Marble raster — real satellite data |
| 5 | The Worst Offenders | Map pans & zooms to each city as you scroll |
| 6 | Places That Still Have Darkness | IDA-certified dark sky places |
| 7 | What It Would Take | Tucson before/after LED retrofit slider |

---

## Stack

- **Next.js 16** (App Router, fully static export)
- **D3.js** — orthographic globe, Natural Earth projection, zoom behaviours
- **Canvas API** — star field simulation, NASA raster reprojection
- **Scrollama** — scroll-driven step callbacks
- **Framer Motion** — section transitions and stat reveals
- **Tailwind CSS**

---

## Data

| Source | Used for |
|--------|----------|
| [NASA Black Marble 2016](https://visibleearth.nasa.gov/images/144898) | Per-pixel light pollution map |
| [World Atlas of Artificial Night Sky Brightness](https://www.science.org/doi/10.1126/sciadv.1600377) — Falchi et al., 2016 | Bortle values, statistics |
| [DarkSky International](https://darksky.org/what-we-do/international-dark-sky-places/) | Certified dark sky place locations |
| [Kyba et al., *Science*, 2023](https://www.science.org/doi/10.1126/science.abq7781) | 9.6% annual growth figure |
| [Natural Earth / world-atlas](https://github.com/topojson/world-atlas) | Country geometry |

---

## How it works — the Black Marble layer

The map uses a client-side pixel reprojection: for every pixel in the D3 viewport, the code calls `projection.invert()` to get the `[lon, lat]` coordinate, then maps that to the corresponding pixel in the NASA equirectangular JPEG and samples it. The result is an accurate per-pixel rendering of real satellite data shaped to the Natural Earth projection, built entirely in the browser with no backend.

---

## Run locally

```bash
git clone https://github.com/maryemeidiata/weforgotthestars.git
cd weforgotthestars
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

*By [Maryeme Idiata](https://maryemeidiata.vercel.app)*
