"""CourtIQ pilot API: URL -> verified game -> saved library -> comparison."""
import json
import os
from pathlib import Path
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from api.compare import compare_teams
from api.ibba import import_ibba_url
from api.plk import import_plk_url

app = FastAPI(title="CourtIQ Pilot API", version="0.7")
origins = [
    x.strip()
    for x in os.getenv("COURTIQ_ORIGINS", "https://ofirdad12.github.io").split(",")
    if x.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
STORE = Path(os.getenv("COURTIQ_STORE", "data/pilot_games.json"))


class ImportRequest(BaseModel):
    url: HttpUrl


class CompareRequest(BaseModel):
    team_a: str
    team_b: str


def load_games():
    if not STORE.exists():
        return []
    return json.loads(STORE.read_text(encoding="utf-8"))


def save_games(games):
    STORE.parent.mkdir(parents=True, exist_ok=True)
    STORE.write_text(json.dumps(games, ensure_ascii=False, indent=2), encoding="utf-8")


def _importer_for(url: str):
    host = (urlparse(url).hostname or "").lower()
    if host in {"ibasketball.co.il", "www.ibasketball.co.il"}:
        return import_ibba_url
    if host in {"plk.pl", "www.plk.pl"}:
        return import_plk_url
    raise ValueError("Unsupported official source. Currently supported: IBBA and PLK official game URLs.")


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "courtiq-pilot",
        "version": "0.7",
        "official_sources": ["IBBA", "PLK"],
    }


@app.get("/api/games")
def games():
    return load_games()


@app.post("/api/import-url")
def import_url(req: ImportRequest):
    try:
        url = str(req.url)
        game = _importer_for(url)(url)
        items = load_games()
        gid = game["game"]["id"]
        provider = game.get("source", {}).get("provider")
        # Deduplicate by provider + external game id so different leagues may reuse ids safely.
        items = [
            g
            for g in items
            if not (
                str(g.get("game", {}).get("id")) == str(gid)
                and g.get("source", {}).get("provider") == provider
            )
        ] + [game]
        save_games(items)
        return game
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@app.post("/api/compare")
def compare(req: CompareRequest):
    try:
        return compare_teams(load_games(), req.team_a, req.team_b)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
