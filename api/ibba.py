"""IBBA match URL ingestion. Server-side only."""
from __future__ import annotations
import re
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
from data_engine.common import build_game

ALLOWED_HOSTS={"ibasketball.co.il","www.ibasketball.co.il"}

def _ma(value:str)->tuple[int,int]:
    m=re.search(r"(\d+)\s*-\s*(\d+)", value or "")
    if not m: raise ValueError(f"Expected made-attempted value, got {value!r}")
    return int(m.group(1)),int(m.group(2))

def _num(value:str)->int:
    m=re.search(r"-?\d+", (value or "").replace(",",""))
    if not m: raise ValueError(f"Expected numeric value, got {value!r}")
    return int(m.group())

def validate_ibba_url(url:str)->str:
    p=urlparse(url)
    if p.scheme!="https" or p.hostname not in ALLOWED_HOSTS or not re.fullmatch(r"/match/[a-z0-9]+(?:-[a-z0-9]+)*/?",p.path,re.I):
        raise ValueError("Only official https://ibasketball.co.il/match/... URLs are supported")
    return url

def fetch_html(url:str)->str:
    validate_ibba_url(url)
    r=requests.get(url,timeout=15,headers={"User-Agent":"CourtIQ/0.5 (+basketball analytics pilot)"})
    r.raise_for_status()
    return r.text

def _headers(table):
    row=table.find("tr")
    return [c.get_text(" ",strip=True) for c in row.find_all(["th","td"])] if row else []

def _find_idx(headers,needles):
    for i,h in enumerate(headers):
        if any(n in h for n in needles): return i
    raise ValueError(f"Missing expected IBBA column: {needles}")

def _team_total(table):
    headers=_headers(table)
    total=None
    for tr in table.find_all("tr"):
        cells=[c.get_text(" ",strip=True) for c in tr.find_all(["th","td"])]
        if any("סך הכל" in c for c in cells):
            total=cells; break
    if not total: raise ValueError("IBBA player table has no total row")
    pts=_num(total[_find_idx(headers,["נק'","נק׳"])])
    two_m,two_a=_ma(total[_find_idx(headers,["2 נק"])])
    three_m,three_a=_ma(total[_find_idx(headers,["3 נק"])])
    ftm,fta=_ma(total[_find_idx(headers,["מהקו"])])
    dreb=_num(total[_find_idx(headers,["ריב׳ הג׳","ריב' הג'","ריב הג"])])
    oreb=_num(total[_find_idx(headers,["ריב׳ הת׳","ריב' הת'","ריב הת"])])
    tov=_num(total[_find_idx(headers,["איב'","איב׳"])])
    ast=_num(total[_find_idx(headers,["אס'","אס׳"])])
    return {"points":pts,"fgm":two_m+three_m,"fga":two_a+three_a,"three_pm":three_m,
            "three_pa":three_a,"ftm":ftm,"fta":fta,"oreb":oreb,"dreb":dreb,"tov":tov,"ast":ast,
            "two_pm":two_m,"two_pa":two_a}

def parse_ibba_html(html:str,url:str)->dict:
    soup=BeautifulSoup(html,"html.parser")
    # Quarter table: identify by Hebrew quarter headers.
    qtable=None
    for t in soup.find_all("table"):
        hs=" | ".join(_headers(t))
        if "רבע 1" in hs and "רבע 4" in hs:
            qtable=t; break
    if not qtable: raise ValueError("Could not locate IBBA quarter table")
    rows=[]
    for tr in qtable.find_all("tr")[1:]:
        cells=[c.get_text(" ",strip=True) for c in tr.find_all(["th","td"])]
        if len(cells)>=6 and cells[0]:
            rows.append(cells)
    if len(rows)<2: raise ValueError("Could not read two teams from IBBA quarter table")
    home_name,away_name=rows[0][0],rows[1][0]
    quarters={"home":[_num(x) for x in rows[0][1:5]],"away":[_num(x) for x in rows[1][1:5]]}

    player_tables=[]
    for t in soup.find_all("table"):
        hs=" | ".join(_headers(t))
        if ("2 נק" in hs and "3 נק" in hs and ("איב" in hs) and ("אס" in hs)):
            player_tables.append(t)
    if len(player_tables)<2: raise ValueError("Could not locate both IBBA team box-score tables")
    home=_team_total(player_tables[0]); away=_team_total(player_tables[1])
    home["team"]=home_name; away["team"]=away_name

    title=soup.title.get_text(" ",strip=True) if soup.title else f"{home_name} — {away_name}"
    text=soup.get_text(" ",strip=True)
    date_match=re.search(r"\b(\d{2}-\d{2}-\d{4})\b",text)
    metadata={"id":re.search(r"/match/([^/]+)",url).group(1),"home_team":home_name,"away_team":away_name,
              "date":date_match.group(1) if date_match else None,"title":title,"quarters":quarters}
    game=build_game(home,away,metadata,{"provider":"IBBA","url":url,"input":"official match URL"})
    game["home"]["raw"]["ast"]=home["ast"]; game["away"]["raw"]["ast"]=away["ast"]
    return game

def import_ibba_url(url:str)->dict:
    return parse_ibba_html(fetch_html(url),validate_ibba_url(url))
