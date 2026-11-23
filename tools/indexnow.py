#!/usr/bin/env python3
"""IndexNow: meldet geänderte oder neue Seiten von esrstudio.de an Bing, Yandex & Co.

Nach einem Deploy ausführen:

    python3 tools/indexnow.py                  # alle Seiten aus sitemap.xml
    python3 tools/indexnow.py /neue-seite      # nur bestimmte Seiten
    python3 tools/indexnow.py /about /work https://esrstudio.de/contact
    python3 tools/indexnow.py --dry-run        # nur anzeigen, nichts senden

Der Key steht in der Datei <key>.txt im Projekt-Root (32 Zeichen a-z/0-9).
Sie muss live unter https://esrstudio.de/<key>.txt erreichbar sein; das
Script prüft das vor dem Senden. Antwort 200 oder 202 = angenommen.

Nur Seiten melden, die sich wirklich geändert haben oder neu sind.
Unveränderte Seiten immer wieder zu melden, sehen die Suchmaschinen nicht gern.
"""
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

HOST = "esrstudio.de"
BASE = f"https://{HOST}"
ENDPOINT = "https://api.indexnow.org/indexnow"
ROOT = Path(__file__).resolve().parent.parent

ANTWORTEN = {
    200: "OK, URLs angenommen",
    202: "Angenommen, Key wird noch geprüft",
    400: "Ungültige Anfrage",
    403: "Key ungültig (Key-Datei nicht gefunden oder Inhalt passt nicht)",
    422: "URLs gehören nicht zum Host oder passen nicht zum Key",
    429: "Zu viele Anfragen, später erneut versuchen",
}


def find_key():
    keys = [p for p in ROOT.glob("*.txt") if re.fullmatch(r"[a-z0-9]{32}", p.stem)]
    if len(keys) != 1:
        sys.exit(f"Fehler: Genau eine Key-Datei <32 Zeichen>.txt im Projekt-Root erwartet, gefunden: {len(keys)}")
    key = keys[0].read_text().strip()
    if key != keys[0].stem:
        sys.exit(f"Fehler: Inhalt von {keys[0].name} entspricht nicht dem Dateinamen.")
    return key


def sitemap_urls():
    xml = (ROOT / "sitemap.xml").read_text()
    return re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml)


def to_url(arg):
    if arg.startswith("http://") or arg.startswith("https://"):
        url = arg
    else:
        url = BASE + "/" + arg.lstrip("/")
    url = re.sub(r"^https?://(www\.)?esrstudio\.de", BASE, url)
    url = re.sub(r"\.html$", "", url)          # Vercel liefert saubere URLs aus
    url = re.sub(r"/index$", "/", url)
    if not url.startswith(BASE + "/") and url != BASE:
        sys.exit(f"Fehler: {arg} gehört nicht zu {BASE}")
    return url if url != BASE else BASE + "/"


def key_is_live(key):
    try:
        with urllib.request.urlopen(f"{BASE}/{key}.txt", timeout=15) as r:
            return r.status == 200 and r.read().decode().strip() == key
    except (urllib.error.URLError, TimeoutError):
        return False


def main():
    args = [a for a in sys.argv[1:] if a != "--dry-run"]
    dry = "--dry-run" in sys.argv
    key = find_key()
    urls = [to_url(a) for a in args] if args else sitemap_urls()
    urls = list(dict.fromkeys(urls))
    if not urls:
        sys.exit("Keine URLs zum Melden.")

    payload = {
        "host": HOST,
        "key": key,
        "keyLocation": f"{BASE}/{key}.txt",
        "urlList": urls,
    }
    print("URLs:", *urls, sep="\n  ")
    if dry:
        print("\n--dry-run: nichts gesendet.\n" + json.dumps(payload, indent=2))
        return

    if not key_is_live(key):
        sys.exit(f"Fehler: {BASE}/{key}.txt ist (noch) nicht live. Erst deployen, dann erneut ausführen.")

    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            status, body = r.status, r.read().decode(errors="replace")
    except urllib.error.HTTPError as e:
        status, body = e.code, e.read().decode(errors="replace")
    except urllib.error.URLError as e:
        sys.exit(f"Fehler: IndexNow nicht erreichbar ({e.reason})")

    print(f"\nAntwort: {status} – {ANTWORTEN.get(status, 'unbekannt')}")
    if body.strip():
        print(body.strip()[:500])
    sys.exit(0 if status in (200, 202) else 1)


if __name__ == "__main__":
    main()
