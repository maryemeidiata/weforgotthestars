#!/usr/bin/env python3
"""
generate_rankings.py

Downloads the VIIRS DNB Annual Composite (2022) from lightpollutionmap.info —
a free, publicly accessible dataset of real satellite-measured nighttime radiance.
Samples the raster at the centroid of every city with population ≥ 15,000,
converts the radiance to an approximate Bortle class, ranks by brightness, and
writes the top 10 to data/worst-offenders.json.

This uses real satellite data (NASA VIIRS), not estimated or hardcoded values.
The source dataset is the same underlying VIIRS observations used by the
Falchi et al. 2016 World Atlas, rendered annually by lightpollutionmap.info.

Usage:
    pip install -r requirements.txt
    python3 generate_rankings.py

Output: data/worst-offenders.json
Notes:
  - First run downloads ~790 MB (cached to .cache/ for subsequent runs).
  - The GeoNames download adds ~75 MB (also cached).
"""

import io
import json
import math
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd
import rasterio
import requests
from pyproj import Transformer

# ── Data URLs ─────────────────────────────────────────────────────────────────

# VIIRS DNB 2022 annual composite, raw radiance (nW/cm²/sr), EPSG:3857.
# Hosted freely by lightpollutionmap.info.  Check for newer years at:
#   https://www2.lightpollutionmap.info/data/v2/
VIIRS_URL = "https://www2.lightpollutionmap.info/data/v2/viirs_2022_raw.zip"

# GeoNames: all cities with population ≥ 15,000.  Stable URL.
GEONAMES_URL = "https://download.geonames.org/export/dump/cities15000.zip"

# ── Paths ─────────────────────────────────────────────────────────────────────
OUTPUT_PATH = Path("data/worst-offenders.json")
CACHE_DIR   = Path(".cache")
CACHE_DIR.mkdir(exist_ok=True)

# ── Bortle thresholds for VIIRS DNB radiance (nW/cm²/sr) ─────────────────────
# Derived from empirical correlation between VIIRS radiance and Bortle class
# (Duriscoe et al.; Cinzano & Falchi; lightpollutionmap.info calibration).
# Each tuple: (bortle_class, lower_bound).  Tested highest to lowest.
BORTLE_VIIRS = [
    (9, 300.0),   # ≥ 300  nW/cm²/sr  → Bortle 9 (inner city)
    (8,  80.0),   # 80–300             → Bortle 8
    (7,  25.0),   # 25–80              → Bortle 7
    (6,   8.0),   # 8–25               → Bortle 6
    (5,   2.5),   # 2.5–8              → Bortle 5
    (4,   0.8),   # 0.8–2.5            → Bortle 4
    (3,   0.25),  # 0.25–0.8           → Bortle 3
    (2,   0.06),  # 0.06–0.25          → Bortle 2
    (1,   0.0),   # < 0.06             → Bortle 1 (natural dark sky)
]

# ── Country code → display name ───────────────────────────────────────────────
COUNTRY_NAMES: dict[str, str] = {
    "SG": "Singapore",      "HK": "China",          "KW": "Kuwait",
    "AE": "UAE",            "KR": "South Korea",     "JP": "Japan",
    "CN": "China",          "SA": "Saudi Arabia",    "EG": "Egypt",
    "GB": "United Kingdom", "US": "United States",   "IN": "India",
    "DE": "Germany",        "FR": "France",          "IT": "Italy",
    "ES": "Spain",          "BR": "Brazil",          "MX": "Mexico",
    "CA": "Canada",         "AU": "Australia",       "RU": "Russia",
    "TR": "Turkey",         "PK": "Pakistan",        "BD": "Bangladesh",
    "NG": "Nigeria",        "ID": "Indonesia",       "PH": "Philippines",
    "TH": "Thailand",       "MY": "Malaysia",        "VN": "Vietnam",
    "IR": "Iran",           "IQ": "Iraq",            "IL": "Israel",
    "JO": "Jordan",         "QA": "Qatar",           "BH": "Bahrain",
    "OM": "Oman",           "TW": "Taiwan",          "MO": "Macau",
    "LY": "Libya",          "DZ": "Algeria",         "MA": "Morocco",
    "TN": "Tunisia",        "PL": "Poland",          "UA": "Ukraine",
    "NL": "Netherlands",    "BE": "Belgium",         "CH": "Switzerland",
    "AT": "Austria",        "SE": "Sweden",          "NO": "Norway",
    "DK": "Denmark",        "FI": "Finland",         "GR": "Greece",
    "PT": "Portugal",       "CZ": "Czech Republic",  "RO": "Romania",
    "ZA": "South Africa",   "KE": "Kenya",           "AR": "Argentina",
    "CO": "Colombia",       "CL": "Chile",           "PE": "Peru",
    "KZ": "Kazakhstan",     "UZ": "Uzbekistan",      "PK": "Pakistan",
    "MM": "Myanmar",        "KH": "Cambodia",        "LK": "Sri Lanka",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def radiance_to_bortle(radiance: float) -> int:
    """Map VIIRS DNB radiance (nW/cm²/sr) to integer Bortle class (1–9)."""
    for bortle, lower in BORTLE_VIIRS:
        if radiance >= lower:
            return bortle
    return 1


def download_with_cache(url: str, cache_name: str, desc: str = "") -> bytes:
    """Return cached bytes or download, show progress, and cache."""
    cache_path = CACHE_DIR / cache_name
    if cache_path.exists():
        size_mb = cache_path.stat().st_size / 1e6
        print(f"  [cache] {cache_name}  ({size_mb:.0f} MB)")
        return cache_path.read_bytes()

    label = desc or url.split("/")[-1]
    print(f"  [fetch] {label}  — this may take a minute…")
    resp = requests.get(url, stream=True, timeout=600)
    resp.raise_for_status()

    total = int(resp.headers.get("content-length", 0))
    chunks, received = [], 0
    for chunk in resp.iter_content(chunk_size=1 << 20):  # 1 MB chunks
        chunks.append(chunk)
        received += len(chunk)
        if total:
            pct = received / total * 100
            print(f"\r  {pct:5.1f}%  {received/1e6:.0f}/{total/1e6:.0f} MB", end="", flush=True)
    print()

    data = b"".join(chunks)
    cache_path.write_bytes(data)
    print(f"  [saved] {len(data)/1e6:.0f} MB → .cache/{cache_name}")
    return data


def load_viirs_tiff() -> rasterio.DatasetReader:
    """Download, extract, and open the VIIRS raw radiance GeoTIFF."""
    tiff_cache = CACHE_DIR / "viirs_2022_raw.tif"
    if not tiff_cache.exists():
        zip_bytes = download_with_cache(VIIRS_URL, "viirs_2022_raw.zip",
                                        "VIIRS 2022 annual composite (~790 MB)")
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            tif_names = [n for n in zf.namelist()
                         if n.lower().endswith((".tif", ".tiff"))]
            if not tif_names:
                raise FileNotFoundError(
                    f"No .tif found in ZIP. Contents: {zf.namelist()}"
                )
            name = tif_names[0]
            print(f"  [extract] {name}")
            tiff_cache.write_bytes(zf.read(name))

    return rasterio.open(tiff_cache)


def load_geonames() -> pd.DataFrame:
    """Download and parse GeoNames cities15000.txt."""
    zip_bytes = download_with_cache(GEONAMES_URL, "cities15000.zip",
                                    "GeoNames cities15000 (~75 MB)")
    cols = [
        "geonameid", "name", "asciiname", "alternatenames",
        "lat", "lng", "feature_class", "feature_code",
        "country_code", "cc2", "admin1", "admin2", "admin3", "admin4",
        "population", "elevation", "dem", "timezone", "modification_date",
    ]
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        with zf.open("cities15000.txt") as f:
            df = pd.read_csv(f, sep="\t", header=None, names=cols,
                             encoding="utf-8", low_memory=False)

    df = df[(df["feature_class"] == "P") & (df["population"] >= 15_000)].copy()
    return df[["name", "country_code", "lat", "lng", "population"]].reset_index(drop=True)


def sample_raster(ds: rasterio.DatasetReader,
                  lats: np.ndarray,
                  lngs: np.ndarray) -> np.ndarray:
    """
    Sample raster band 1 at geographic (lat, lng) coordinates.
    Handles any CRS by reprojecting coords via pyproj.
    """
    band   = ds.read(1).astype(float)
    nodata = ds.nodata
    h, w   = band.shape

    # Convert WGS-84 lat/lng → dataset CRS (e.g. EPSG:3857)
    transformer = Transformer.from_crs("EPSG:4326", ds.crs, always_xy=True)
    xs, ys = transformer.transform(lngs, lats)  # always_xy: lng first

    results = np.zeros(len(lats), dtype=float)
    for i, (x, y) in enumerate(zip(xs, ys)):
        try:
            row, col = ds.index(x, y)
            if 0 <= row < h and 0 <= col < w:
                val = float(band[row, col])
                if nodata is not None and val == nodata:
                    val = 0.0
                results[i] = max(val, 0.0)
        except Exception:
            results[i] = 0.0
    return results


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print("=" * 55)
    print("  generate_rankings.py — VIIRS 2022 pipeline")
    print("=" * 55)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    # 1. Load VIIRS raster
    print("\n[1/5] Loading VIIRS 2022 annual composite…")
    try:
        ds = load_viirs_tiff()
    except Exception as exc:
        print(f"\n  ✗ {exc}")
        return
    print(f"      CRS: {ds.crs}  |  size: {ds.width}×{ds.height}  |  band: {ds.count}")

    # 2. Load GeoNames
    print("\n[2/5] Loading GeoNames cities15000…")
    cities = load_geonames()
    print(f"      {len(cities):,} populated places")

    # 3. Sample raster
    print("\n[3/5] Sampling raster at city centroids…")
    radiance = sample_raster(ds, cities["lat"].values, cities["lng"].values)
    ds.close()
    cities = cities.copy()
    cities["brightness"] = radiance  # nW/cm²/sr

    # 4. Bortle conversion
    print("\n[4/5] Converting to Bortle scale…")
    cities["bortle"] = cities["brightness"].apply(radiance_to_bortle)

    # Drop zero/nodata pixels (water, deserts) and rank
    cities = cities[cities["brightness"] > 0].sort_values(
        "brightness", ascending=False
    ).reset_index(drop=True)

    top10 = cities.head(10).copy()

    # 5. Write JSON
    print("\n[5/5] Writing output…")
    results = []
    for rank, (_, row) in enumerate(top10.iterrows(), start=1):
        results.append({
            "rank":       rank,
            "city":       row["name"],
            "country":    COUNTRY_NAMES.get(row["country_code"], row["country_code"]),
            "bortle":     int(row["bortle"]),
            "brightness": round(float(row["brightness"]), 2),
            "lat":        round(float(row["lat"]), 4),
            "lng":        round(float(row["lng"]), 4),
        })

    OUTPUT_PATH.write_text(
        json.dumps(results, indent=2, ensure_ascii=False) + "\n"
    )

    print(f"\n  ✓ {OUTPUT_PATH}\n")
    print(f"  {'#':<3}  {'City':<22} {'Country':<16} {'Bortle':<8} radiance (nW/cm²/sr)")
    print(f"  {'-'*3}  {'-'*22} {'-'*16} {'-'*8} {'-'*20}")
    for r in results:
        print(f"  {r['rank']:<3}  {r['city']:<22} {r['country']:<16}  {r['bortle']}        {r['brightness']:.1f}")


if __name__ == "__main__":
    main()
