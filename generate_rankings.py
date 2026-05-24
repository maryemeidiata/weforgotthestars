#!/usr/bin/env python3
"""
generate_rankings.py

Downloads the Falchi et al. 2016 World Atlas of Artificial Night Sky Brightness
GeoTIFF and the GeoNames cities15000 dataset, samples the raster at each city
centroid, converts to Bortle scale, and writes the 10 most light-polluted cities
to data/worst-offenders.json.

Usage:
    pip install -r requirements.txt
    python generate_rankings.py

Output: data/worst-offenders.json
"""

import io
import json
import math
import os
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd
import rasterio
import requests
from rasterio.transform import rowcol

# ── URLs ──────────────────────────────────────────────────────────────────────
#
# FALCHI_URL: The Falchi et al. 2016 World Atlas of Artificial Night Sky
# Brightness.  The canonical host is NOAA NGDC.  If this 404s, check:
#   https://www.ngdc.noaa.gov/eog/wwda/
# and look for "World_Atlas_2015.zip" or "World_Atlas_2015_V2.zip".
# Update the constant below and re-run.
#
FALCHI_URL = (
    "https://www.ngdc.noaa.gov/eog/data/web_data/Atlas/World_Atlas_2015.zip"
)

# GeoNames: all cities with population ≥ 15,000.  URL is stable.
GEONAMES_URL = "https://download.geonames.org/export/dump/cities15000.zip"

# ── Paths ─────────────────────────────────────────────────────────────────────
OUTPUT_PATH = Path("data/worst-offenders.json")
CACHE_DIR = Path(".cache")
CACHE_DIR.mkdir(exist_ok=True)

# ── Physics ───────────────────────────────────────────────────────────────────
# Natural sky V-band surface brightness used as Falchi's reference.
NATURAL_SKY_MCD = 0.174  # milli-candela / m²  (= 174 μcd/m²)

# ── Bortle ↔ SQM thresholds ───────────────────────────────────────────────────
# Source: Bortle (2001) Sky & Telescope; SQM calibration from Cinzano & Falchi.
# Each tuple: (bortle_class, upper_sqm_bound).  Traversed from worst to best.
BORTLE_SQM = [
    (9, 17.5),   # SQM < 17.5          → Bortle 9 (inner city)
    (8, 18.3),   # 17.5 ≤ SQM < 18.3   → Bortle 8
    (7, 18.9),   # 18.3 ≤ SQM < 18.9   → Bortle 7
    (6, 19.5),   # 18.9 ≤ SQM < 19.5   → Bortle 6
    (5, 20.4),   # 19.5 ≤ SQM < 20.4   → Bortle 5
    (4, 21.0),   # 20.4 ≤ SQM < 21.0   → Bortle 4
    (3, 21.7),   # 21.0 ≤ SQM < 21.7   → Bortle 3
    (2, 21.9),   # 21.7 ≤ SQM < 21.9   → Bortle 2
    (1, 99.0),   # ≥ 21.9              → Bortle 1 (natural dark sky)
]

# ── ISO 3166-1 alpha-2 → display name (covers likely top-10 results) ─────────
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
    "HU": "Hungary",        "BG": "Bulgaria",        "HR": "Croatia",
    "RS": "Serbia",         "SK": "Slovakia",        "SI": "Slovenia",
    "ZA": "South Africa",   "KE": "Kenya",           "ET": "Ethiopia",
    "GH": "Ghana",          "TZ": "Tanzania",        "SD": "Sudan",
    "AR": "Argentina",      "CO": "Colombia",        "VE": "Venezuela",
    "CL": "Chile",          "PE": "Peru",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def brightness_to_sqm(artificial_mcd: float) -> float:
    """
    Convert artificial sky brightness (mcd/m²) to SQM (mag/arcsec²).

    Formula from Falchi 2016 supplementary material:
        SQM = 21.58 - 2.5 × log10(R + 0.171168)
    where R = artificial_mcd / NATURAL_SKY_MCD  (ratio to natural sky).
    """
    R = max(float(artificial_mcd), 0.0) / NATURAL_SKY_MCD
    return 21.58 - 2.5 * math.log10(R + 0.171168)


def sqm_to_bortle(sqm: float) -> int:
    """Map SQM value to integer Bortle class (1–9)."""
    for bortle, upper in BORTLE_SQM:
        if sqm < upper:
            return bortle
    return 1


def download_with_cache(url: str, cache_name: str) -> bytes:
    """Return cached bytes, or download and cache."""
    cache_path = CACHE_DIR / cache_name
    if cache_path.exists():
        print(f"  [cache] {cache_name}")
        return cache_path.read_bytes()
    print(f"  [fetch] {url}")
    resp = requests.get(url, stream=True, timeout=300)
    if resp.status_code == 404:
        raise FileNotFoundError(
            f"404 — file not found at {url}\n"
            "Update FALCHI_URL at the top of generate_rankings.py.\n"
            "Current download page: https://www.ngdc.noaa.gov/eog/wwda/"
        )
    resp.raise_for_status()
    data = resp.content
    cache_path.write_bytes(data)
    print(f"  [saved] {len(data) / 1e6:.1f} MB → {cache_name}")
    return data


def load_falchi_tiff() -> rasterio.DatasetReader:
    """Download, extract, and open the Falchi 2016 GeoTIFF."""
    tiff_cache = CACHE_DIR / "World_Atlas_2015.tif"
    if not tiff_cache.exists():
        zip_bytes = download_with_cache(FALCHI_URL, "World_Atlas_2015.zip")
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            tif_names = [
                n for n in zf.namelist()
                if n.lower().endswith((".tif", ".tiff"))
            ]
            if not tif_names:
                raise FileNotFoundError(
                    f"No .tif file found in ZIP archive.\n"
                    f"Archive contents: {zf.namelist()}\n"
                    "The download may be wrong — update FALCHI_URL."
                )
            tif_name = tif_names[0]
            print(f"  [extract] {tif_name}")
            tiff_cache.write_bytes(zf.read(tif_name))

    return rasterio.open(tiff_cache)


def load_geonames() -> pd.DataFrame:
    """Download and parse GeoNames cities15000.txt."""
    zip_bytes = download_with_cache(GEONAMES_URL, "cities15000.zip")

    # Column spec: http://download.geonames.org/export/dump/readme.txt
    cols = [
        "geonameid", "name", "asciiname", "alternatenames",
        "lat", "lng", "feature_class", "feature_code",
        "country_code", "cc2", "admin1", "admin2", "admin3", "admin4",
        "population", "elevation", "dem", "timezone", "modification_date",
    ]
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        with zf.open("cities15000.txt") as f:
            df = pd.read_csv(
                f, sep="\t", header=None, names=cols,
                encoding="utf-8", low_memory=False,
            )

    # Keep only populated places; drop extremely small entries
    df = df[(df["feature_class"] == "P") & (df["population"] >= 15_000)].copy()
    return df[["name", "country_code", "lat", "lng", "population"]].reset_index(drop=True)


def sample_raster(ds: rasterio.DatasetReader,
                  lats: np.ndarray,
                  lngs: np.ndarray) -> np.ndarray:
    """
    Sample raster band 1 at (lat, lng) pairs.
    Returns an array of float values; out-of-bounds pixels → 0.
    """
    band = ds.read(1).astype(float)
    h, w = band.shape
    nodata = ds.nodata  # may be None

    results = np.zeros(len(lats), dtype=float)
    for i, (lat, lng) in enumerate(zip(lats, lngs)):
        try:
            row, col = ds.index(lng, lat)
            if 0 <= row < h and 0 <= col < w:
                val = band[row, col]
                # Treat nodata or fill values as zero
                if nodata is not None and val == nodata:
                    val = 0.0
                results[i] = max(float(val), 0.0)
        except Exception:
            results[i] = 0.0
    return results


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print("=" * 50)
    print("  generate_rankings.py — Falchi 2016 pipeline")
    print("=" * 50)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    # 1. Falchi raster
    print("\n[1/5] Loading Falchi 2016 GeoTIFF...")
    try:
        ds = load_falchi_tiff()
    except FileNotFoundError as exc:
        print(f"\n  ✗ {exc}")
        return
    print(f"      CRS: {ds.crs}  |  size: {ds.width}×{ds.height}")

    # 2. GeoNames
    print("\n[2/5] Loading GeoNames cities15000...")
    cities = load_geonames()
    print(f"      {len(cities):,} populated places loaded")

    # 3. Sample raster
    print("\n[3/5] Sampling raster at city centroids...")
    brightness = sample_raster(ds, cities["lat"].values, cities["lng"].values)
    ds.close()
    cities = cities.copy()
    cities["brightness"] = brightness  # mcd/m²

    # 4. Convert to SQM and Bortle
    print("\n[4/5] Converting to Bortle scale...")
    cities["sqm"]    = cities["brightness"].apply(brightness_to_sqm)
    cities["bortle"] = cities["sqm"].apply(sqm_to_bortle)

    # Drop zero-brightness (oceans, nodata) and sort descending
    cities = cities[cities["brightness"] > 0].sort_values(
        "brightness", ascending=False
    ).reset_index(drop=True)

    top10 = cities.head(10).copy()

    # 5. Write JSON
    print("\n[5/5] Writing output...")
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

    print(f"\n  ✓ {OUTPUT_PATH}")
    print()
    print(f"  {'#':<3}  {'City':<22} {'Country':<16} {'Bortle':<8} {'mcd/m²'}")
    print(f"  {'-'*3}  {'-'*22} {'-'*16} {'-'*8} {'-'*8}")
    for r in results:
        print(f"  {r['rank']:<3}  {r['city']:<22} {r['country']:<16}  {r['bortle']}       {r['brightness']:.2f}")


if __name__ == "__main__":
    main()
