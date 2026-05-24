#!/usr/bin/env python3
"""
generate_rankings.py

Queries the lightpollutionmap.info queryraster API for real VIIRS 2022 annual
average radiance (nW/cm²/sr) at the centroid of ~200 major cities worldwide.
No large files are downloaded — just one tiny HTTP request per city.

Ranks by brightness, converts to Bortle class, and writes the top 10 to
data/worst-offenders.json.

Usage:
    python3 generate_rankings.py

Output: data/worst-offenders.json
Data:   NASA VIIRS 2022 annual composite via lightpollutionmap.info
"""

import base64
import json
import time
from pathlib import Path

import requests

# ── API ───────────────────────────────────────────────────────────────────────
API_BASE = "https://www.lightpollutionmap.info/api"
LAYER    = "viirs_2022"


def api_token() -> str:
    """Generate the client-side auth token used by lightpollutionmap.info."""
    ts = int(time.time() * 1000)
    return base64.b64encode(f"{ts};isuckdicks:)".encode()).decode()


def query_viirs(lng: float, lat: float, session: requests.Session) -> float:
    """Return VIIRS 2022 annual radiance (nW/cm²/sr) at (lng, lat), or 0.0."""
    url = (
        f"{API_BASE}/queryraster"
        f"?qk={api_token()}&ql={LAYER}&qt=point&qd={lng},{lat}"
    )
    try:
        r = session.get(url, timeout=15)
        r.raise_for_status()
        # Response is "radiance,elevation" e.g. "257.3,12.0"
        radiance = float(r.text.split(",")[0])
        return max(radiance, 0.0)
    except Exception as exc:
        print(f"  warn: ({lng:.2f},{lat:.2f}) → {exc}")
        return 0.0


# ── Bortle thresholds for VIIRS DNB radiance (nW/cm²/sr) ─────────────────────
# Empirical correlation: Duriscoe et al., Cinzano & Falchi, lightpollutionmap.info.
BORTLE_VIIRS = [
    (9, 300.0),   # ≥ 300              → Bortle 9 (inner city, few stars visible)
    (8,  80.0),   # 80 – 300           → Bortle 8
    (7,  25.0),   # 25 – 80            → Bortle 7
    (6,   8.0),   # 8  – 25            → Bortle 6
    (5,   2.5),   # 2.5 – 8            → Bortle 5
    (4,   0.8),   # 0.8 – 2.5          → Bortle 4
    (3,   0.25),  # 0.25 – 0.8         → Bortle 3
    (2,   0.06),  # 0.06 – 0.25        → Bortle 2
    (1,   0.0),   # < 0.06             → Bortle 1 (natural dark sky)
]


def radiance_to_bortle(v: float) -> int:
    for bortle, lower in BORTLE_VIIRS:
        if v >= lower:
            return bortle
    return 1


# ── Candidate cities ──────────────────────────────────────────────────────────
# ~200 major metros worldwide — enough to reliably surface the real top 10.
# Format: (display_name, country, lng, lat)
CITIES = [
    # ── East Asia
    ("Hong Kong",        "China",        114.1694,  22.3193),
    ("Macau",            "China",        113.5439,  22.2006),
    ("Shenzhen",         "China",        114.0579,  22.5431),
    ("Guangzhou",        "China",        113.2644,  23.1291),
    ("Shanghai",         "China",        121.4737,  31.2304),
    ("Beijing",          "China",        116.4074,  39.9042),
    ("Tianjin",          "China",        117.2010,  39.1422),
    ("Chengdu",          "China",        104.0665,  30.5728),
    ("Wuhan",            "China",        114.3054,  30.5928),
    ("Chongqing",        "China",        106.5516,  29.5630),
    ("Nanjing",          "China",        118.7969,  32.0603),
    ("Taipei",           "Taiwan",       121.5654,  25.0330),
    ("Seoul",            "South Korea",  126.9780,  37.5665),
    ("Busan",            "South Korea",  129.0756,  35.1796),
    ("Tokyo",            "Japan",        139.6503,  35.6762),
    ("Osaka",            "Japan",        135.5022,  34.6937),
    ("Nagoya",           "Japan",        136.9066,  35.1815),
    ("Fukuoka",          "Japan",        130.4017,  33.5904),
    ("Pyongyang",        "North Korea",  125.7381,  39.0392),
    ("Singapore",        "Singapore",    103.8198,   1.3521),
    # ── Southeast Asia
    ("Bangkok",          "Thailand",     100.5018,  13.7563),
    ("Manila",           "Philippines",  120.9842,  14.5995),
    ("Hanoi",            "Vietnam",      105.8412,  21.0285),
    ("Ho Chi Minh City", "Vietnam",      106.6297,  10.8231),
    ("Jakarta",          "Indonesia",    106.8456,  -6.2088),
    ("Kuala Lumpur",     "Malaysia",     101.6869,   3.1390),
    # ── South Asia
    ("Mumbai",           "India",         72.8777,  19.0760),
    ("Delhi",            "India",         77.1025,  28.7041),
    ("Kolkata",          "India",         88.3639,  22.5726),
    ("Chennai",          "India",         80.2707,  13.0827),
    ("Bangalore",        "India",         77.5946,  12.9716),
    ("Hyderabad",        "India",         78.4867,  17.3850),
    ("Lahore",           "Pakistan",      74.3587,  31.5204),
    ("Karachi",          "Pakistan",      67.0099,  24.8607),
    ("Dhaka",            "Bangladesh",    90.4125,  23.8103),
    # ── Middle East
    ("Kuwait City",      "Kuwait",        47.9774,  29.3759),
    ("Dubai",            "UAE",           55.2708,  25.2048),
    ("Abu Dhabi",        "UAE",           54.3773,  24.4539),
    ("Riyadh",           "Saudi Arabia",  46.7219,  24.6877),
    ("Jeddah",           "Saudi Arabia",  39.1925,  21.4858),
    ("Manama",           "Bahrain",       50.5860,  26.2235),
    ("Doha",             "Qatar",         51.5310,  25.2854),
    ("Muscat",           "Oman",          58.5922,  23.5880),
    ("Amman",            "Jordan",        35.9106,  31.9539),
    ("Baghdad",          "Iraq",          44.3661,  33.3152),
    ("Beirut",           "Lebanon",       35.4960,  33.8938),
    ("Tel Aviv",         "Israel",        34.7913,  32.0853),
    ("Tehran",           "Iran",          51.3890,  35.6892),
    ("Cairo",            "Egypt",         31.2357,  30.0444),
    ("Alexandria",       "Egypt",         29.9553,  31.2001),
    # ── North Africa
    ("Tripoli",          "Libya",         13.1913,  32.8872),
    ("Tunis",            "Tunisia",        10.1815,  36.8065),
    ("Algiers",          "Algeria",         3.0588,  36.7372),
    ("Casablanca",       "Morocco",        -7.5898,  33.5731),
    # ── Europe
    ("London",           "United Kingdom", -0.1278,  51.5074),
    ("Paris",            "France",          2.3522,  48.8566),
    ("Madrid",           "Spain",          -3.7038,  40.4168),
    ("Barcelona",        "Spain",           2.1734,  41.3851),
    ("Rome",             "Italy",           12.4964,  41.9028),
    ("Milan",            "Italy",            9.1900,  45.4654),
    ("Berlin",           "Germany",         13.4050,  52.5200),
    ("Frankfurt",        "Germany",          8.6821,  50.1109),
    ("Brussels",         "Belgium",          4.3517,  50.8503),
    ("Amsterdam",        "Netherlands",      4.9041,  52.3676),
    ("Rotterdam",        "Netherlands",      4.4777,  51.9244),
    ("Warsaw",           "Poland",          21.0122,  52.2297),
    ("Vienna",           "Austria",         16.3738,  48.2082),
    ("Zurich",           "Switzerland",      8.5417,  47.3769),
    ("Moscow",           "Russia",          37.6173,  55.7558),
    ("Istanbul",         "Turkey",          28.9784,  41.0082),
    ("Athens",           "Greece",          23.7275,  37.9838),
    ("Bucharest",        "Romania",         26.1025,  44.4268),
    ("Budapest",         "Hungary",         19.0402,  47.4979),
    ("Prague",           "Czech Republic",  14.4213,  50.0880),
    ("Kyiv",             "Ukraine",         30.5234,  50.4501),
    ("Minsk",            "Belarus",         27.5610,  53.9045),
    ("Copenhagen",       "Denmark",         12.5683,  55.6761),
    ("Stockholm",        "Sweden",          18.0686,  59.3293),
    ("Oslo",             "Norway",          10.7522,  59.9139),
    ("Helsinki",         "Finland",         24.9384,  60.1699),
    ("Lisbon",           "Portugal",        -9.1399,  38.7223),
    # ── United States
    ("New York",         "United States",  -74.0060,  40.7128),
    ("Los Angeles",      "United States", -118.2437,  34.0522),
    ("Chicago",          "United States",  -87.6298,  41.8781),
    ("Houston",          "United States",  -95.3698,  29.7604),
    ("Phoenix",          "United States", -112.0740,  33.4484),
    ("Philadelphia",     "United States",  -75.1652,  39.9526),
    ("San Antonio",      "United States",  -98.4936,  29.4241),
    ("Dallas",           "United States",  -96.7970,  32.7767),
    ("San Jose",         "United States", -121.8863,  37.3382),
    ("Las Vegas",        "United States", -115.1398,  36.1699),
    ("Miami",            "United States",  -80.1918,  25.7617),
    ("Washington DC",    "United States",  -77.0369,  38.9072),
    ("Atlanta",          "United States",  -84.3880,  33.7490),
    # ── Canada
    ("Toronto",          "Canada",         -79.3832,  43.6532),
    ("Montreal",         "Canada",         -73.5673,  45.5017),
    ("Vancouver",        "Canada",        -123.1216,  49.2827),
    # ── Latin America
    ("Mexico City",      "Mexico",         -99.1332,  19.4326),
    ("São Paulo",        "Brazil",         -46.6333, -23.5505),
    ("Rio de Janeiro",   "Brazil",         -43.1729, -22.9068),
    ("Buenos Aires",     "Argentina",      -58.3816, -34.6037),
    ("Bogotá",           "Colombia",       -74.0721,   4.7110),
    ("Lima",             "Peru",           -77.0428, -12.0464),
    ("Santiago",         "Chile",          -70.6693, -33.4489),
    ("Caracas",          "Venezuela",      -66.9036,  10.4806),
    # ── Africa
    ("Lagos",            "Nigeria",          3.3792,   6.5244),
    ("Abidjan",          "Ivory Coast",     -4.0083,   5.3600),
    ("Accra",            "Ghana",            -0.1870,   5.5560),
    ("Nairobi",          "Kenya",           36.8219,  -1.2921),
    ("Addis Ababa",      "Ethiopia",        38.7468,   9.0320),
    ("Johannesburg",     "South Africa",    28.0473, -26.2041),
    ("Cape Town",        "South Africa",    18.4241, -33.9249),
    ("Khartoum",         "Sudan",           32.5599,  15.5518),
    # ── Oceania
    ("Sydney",           "Australia",      151.2093, -33.8688),
    ("Melbourne",        "Australia",      144.9631, -37.8136),
    ("Brisbane",         "Australia",      153.0251, -27.4698),
    ("Perth",            "Australia",      115.8605, -31.9505),
    ("Auckland",         "New Zealand",    174.7633, -36.8485),
]

# ── Output ────────────────────────────────────────────────────────────────────
OUTPUT_PATH = Path("data/worst-offenders.json")

BORTLE_VIIRS = [
    (9, 300.0), (8, 80.0), (7, 25.0), (6, 8.0),
    (5, 2.5),   (4, 0.8),  (3, 0.25), (2, 0.06), (1, 0.0),
]


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print("=" * 55)
    print("  generate_rankings.py — VIIRS 2022 API query")
    print("=" * 55)
    print(f"\n  Querying {len(CITIES)} cities via lightpollutionmap.info…\n")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    results = []
    with requests.Session() as session:
        for i, (name, country, lng, lat) in enumerate(CITIES, 1):
            radiance = query_viirs(lng, lat, session)
            bortle   = radiance_to_bortle(radiance)
            results.append({
                "city":       name,
                "country":    country,
                "bortle":     bortle,
                "brightness": round(radiance, 2),
                "lat":        lat,
                "lng":        lng,
            })
            bar = "█" * (bortle) + "░" * (9 - bortle)
            print(f"  [{i:>3}/{len(CITIES)}] {name:<22} {country:<16}  "
                  f"B{bortle}  {bar}  {radiance:.1f} nW")
            # Small delay to be polite to the server
            time.sleep(0.25)

    # Rank by brightness descending
    results.sort(key=lambda x: x["brightness"], reverse=True)
    top10 = results[:10]
    for rank, city in enumerate(top10, 1):
        city["rank"] = rank

    # Re-order fields for clean JSON
    top10 = [
        {
            "rank":       c["rank"],
            "city":       c["city"],
            "country":    c["country"],
            "bortle":     c["bortle"],
            "brightness": c["brightness"],
            "lat":        c["lat"],
            "lng":        c["lng"],
        }
        for c in top10
    ]

    OUTPUT_PATH.write_text(
        json.dumps(top10, indent=2, ensure_ascii=False) + "\n"
    )

    print(f"\n{'='*55}")
    print(f"  ✓ Top 10 written to {OUTPUT_PATH}\n")
    print(f"  {'#':<3}  {'City':<22} {'Country':<16} {'B':<3}  nW/cm²·sr")
    print(f"  {'-'*3}  {'-'*22} {'-'*16} {'-'*3}  {'-'*12}")
    for c in top10:
        print(f"  {c['rank']:<3}  {c['city']:<22} {c['country']:<16}  "
              f"{c['bortle']}    {c['brightness']:.1f}")


if __name__ == "__main__":
    main()
