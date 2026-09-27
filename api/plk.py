"""Official Polish Basketball League (PLK) match URL ingestion."""
from __future__ import annotations
import re
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
from data_engine.common import build_game

ALLOWED_HOSTS={"plk.pl","www.plk.pl"}

def _ma(value):
    m=re.search(r"(\d+)\s*/\s*(\d+)",value or "")
    if not m: raise ValueError(f"Expected made/attempted value, got {value!r}")
    return int(m.group(1)),int(m.group(2))

def _num(value):
    m=re.search(r"-?\d+",(value or "").replace("\xa0"," "))
    if not m: return 0
    return int(m.group())

def validate_plk_url(url):
    p=urlparse(url)
    if p.scheme!="https" or p.hostname not in ALLOWED_HOSTS or not re.fullmatch(r"/mecz/(\d+)(?:/[^?#]+)?/?",p.path,re.I):
        raise ValueError("Only official https://plk.pl/mecz/... URLs are supported")
    return url

def fetch_html(url):
    validate_plk_url(url)
    r=requests.get(url,timeout=20,headers={"User-Agent":"CourtIQ/0.6 (+basketball analytics)"})
    r.raise_for_status()
    return r.text

def _cells(tr):
    return [c.get_text(" ",strip=True) for c in tr.find_all(["th","td"])]

def _total(cells):
    # PLK total row: label, PTS, MIN, 2P M/A, %, 3P M/A, %, FG M/A, %, FT M/A, %,
    # OREB, DREB, REB, AST, fouls, fouls drawn, STL, TOV, BLK, BLK against, EVAL, +/-.
    if len(cells)<22: raise ValueError(f"Unexpected PLK total row ({len(cells)} cells)")
    two_m,two_a=_ma(cells[3]); three_m,three_a=_ma(cells[5]); fgm,fga=_ma(cells[7]); ftm,fta=_ma(cells[9])
    return {"points":_num(cells[1]),"fgm":fgm,"fga":fga,"two_pm":two_m,"two_pa":two_a,
            "three_pm":three_m,"three_pa":three_a,"ftm":ftm,"fta":fta,
            "oreb":_num(cells[11]),"dreb":_num(cells[12]),"tov":_num(cells[18]),"ast":_num(cells[14]),
            "steals":_num(cells[17]),"blocks":_num(cells[19]),"eval":_num(cells[21])}

def _player(cells,team):
    if len(cells)<22 or not re.match(r"^\d+$",cells[0]): return None
    two_m,two_a=_ma(cells[3]) if "/" in cells[3] else (0,0)
    three_m,three_a=_ma(cells[5]) if "/" in cells[5] else (0,0)
    fgm,fga=_ma(cells[7]) if "/" in cells[7] else (two_m+three_m,two_a+three_a)
    ftm,fta=_ma(cells[9]) if "/" in cells[9] else (0,0)
    return {"team":team,"number":_num(cells[0]),"name":cells[1],"points":_num(cells[2]),"minutes":cells[3-0] if False else cells[3],
            "two_pm":two_m,"two_pa":two_a,"three_pm":three_m,"three_pa":three_a,"fgm":fgm,"fga":fga,
            "ftm":ftm,"fta":fta,"oreb":_num(cells[11]),"dreb":_num(cells[12]),"rebounds":_num(cells[13]),
            "ast":_num(cells[14]),"steals":_num(cells[17]),"tov":_num(cells[18]),"blocks":_num(cells[19]),
            "eval":_num(cells[21]),"plus_minus":_num(cells[22]) if len(cells)>22 else None}

def parse_plk_html(html,url):
    soup=BeautifulSoup(html,"html.parser")
    title=soup.title.get_text(" ",strip=True) if soup.title else ""
    m=re.search(r"(.+?)\s+vs\s+(.+?)\s*\|",title,re.I)
    if not m: raise ValueError("Could not identify PLK teams from page title")
    home_name,away_name=m.group(1).strip(),m.group(2).strip()

    total_rows=[]; player_groups=[[],[]]; group=0
    for tr in soup.find_all("tr"):
        cells=_cells(tr)
        if not cells: continue
        if cells[0].lower()=="suma":
            total_rows.append(cells); group=min(len(total_rows),1); continue
        # Player rows have jersey, player, points, minutes, then shooting columns.
        if len(cells)>=22 and re.fullmatch(r"\d+",cells[0] or "") and re.fullmatch(r"\d{1,2}:\d{2}",cells[3] or ""):
            player_groups[group].append(cells)
    if len(total_rows)!=2: raise ValueError(f"Expected 2 PLK team total rows, got {len(total_rows)}")

    home=_total(total_rows[0]); away=_total(total_rows[1]); home["team"]=home_name; away["team"]=away_name
    game_id=re.search(r"/mecz/(\d+)",url).group(1)
    text=soup.get_text(" ",strip=True)
    dm=re.search(r"\b(\d{2}\.\d{2}\.\d{4})\b",text)
    metadata={"id":game_id,"competition":"Polska Liga Koszykówki","home_team":home_name,"away_team":away_name,
              "date":dm.group(1) if dm else None,"title":title,"score":[home["points"],away["points"]]}
    game=build_game(home,away,metadata,{"provider":"PLK","url":url,"input":"official match URL"})
    game["players"]={"home":[p for r in player_groups[0] if (p:=_player(r,home_name))],
                     "away":[p for r in player_groups[1] if (p:=_player(r,away_name))]}
    game["home"]["raw"].update({k:home[k] for k in ("two_pm","two_pa","ast","steals","blocks","eval")})
    game["away"]["raw"].update({k:away[k] for k in ("two_pm","two_pa","ast","steals","blocks","eval")})
    return game

def import_plk_url(url):
    return parse_plk_html(fetch_html(url),validate_plk_url(url))
