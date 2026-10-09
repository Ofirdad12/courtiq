from api.ibba import parse_ibba_html, validate_ibba_url

HTML="""<html><head><title>A — B - IBBA</title></head><body>
<div>05-04-2026</div>
<table><tr><th>קבוצה</th><th>רבע 1</th><th>רבע 2</th><th>רבע 3</th><th>רבע 4</th><th>תוצאה</th></tr>
<tr><td>A</td><td>20</td><td>20</td><td>20</td><td>20</td><td>80</td></tr>
<tr><td>B</td><td>18</td><td>18</td><td>18</td><td>18</td><td>72</td></tr></table>
<table><tr><th>#</th><th>שחקן</th><th>חמישייה</th><th>דק'</th><th>נק'</th><th>2 נק</th><th>3 נק</th><th>מהקו</th><th>ריב׳ הג׳</th><th>ריב׳ הת׳</th><th>איב'</th><th>אס'</th></tr>
<tr><td>4</td><td>Player A1</td><td>1</td><td>30:00</td><td>50</td><td>10-15</td><td>8-15</td><td>6-6</td><td>10</td><td>4</td><td>4</td><td>8</td></tr>
<tr><td>8</td><td>Player A2</td><td>0</td><td>20:00</td><td>30</td><td>10-25</td><td>2-10</td><td>4-6</td><td>15</td><td>6</td><td>8</td><td>12</td></tr>
<tr><td></td><td>סך הכל</td><td></td><td></td><td>80</td><td>20-40</td><td>10-25</td><td>10-12</td><td>25</td><td>10</td><td>12</td><td>20</td></tr></table>
<table><tr><th>#</th><th>שחקן</th><th>חמישייה</th><th>דק'</th><th>נק'</th><th>2 נק</th><th>3 נק</th><th>מהקו</th><th>ריב׳ הג׳</th><th>ריב׳ הת׳</th><th>איב'</th><th>אס'</th></tr>
<tr><td>5</td><td>Player B1</td><td>1</td><td>31:00</td><td>38</td><td>10-18</td><td>4-10</td><td>6-8</td><td>12</td><td>5</td><td>6</td><td>8</td></tr>
<tr><td>9</td><td>Player B2</td><td>0</td><td>19:00</td><td>34</td><td>8-20</td><td>4-14</td><td>6-8</td><td>11</td><td>4</td><td>9</td><td>8</td></tr>
<tr><td></td><td>סך הכל</td><td></td><td></td><td>72</td><td>18-38</td><td>8-24</td><td>12-16</td><td>23</td><td>9</td><td>15</td><td>16</td></tr></table>
</body></html>"""


def test_ibba_parser_to_courtiq_schema():
    g=parse_ibba_html(HTML,"https://ibasketball.co.il/match/778678/")
    assert g["validation"]["status"]=="verified"
    assert g["game"]["quarters"]["home"]==[20,20,20,20]
    assert g["home"]["raw"]["team"]=="A"
    assert g["home"]["raw"]["fgm"]==30
    assert g["home"]["four_factors"]["eFG%"]==53.8
    assert g["players"]["home"][0]["name"]=="Player A1"
    assert g["players"]["home"][0]["starter"] is True
    assert g["players"]["home"][1]["starter"] is False
    assert g["players"]["home"][0]["points"]==50
    assert g["players"]["home"][0]["rebounds"]==14
    assert g["data_quality"]["grade"]=="verified"
    assert g["data_quality"]["checks"]["player_points_match_team_totals"] is True
    assert g["evidence"]["player_boxscore"] is True


def test_ibba_accepts_official_prefixed_match_ids():
    url="https://ibasketball.co.il/match/x99002-2/"
    assert validate_ibba_url(url)==url


def test_ibba_does_not_invent_bench_status_without_source_flag():
    html=HTML.replace("<th>חמישייה</th>","<th>Role</th>").replace("<td>1</td><td>30:00</td>","<td></td><td>30:00</td>").replace("<td>0</td><td>20:00</td>","<td></td><td>20:00</td>").replace("<td>1</td><td>31:00</td>","<td></td><td>31:00</td>").replace("<td>0</td><td>19:00</td>","<td></td><td>19:00</td>")
    g=parse_ibba_html(html,"https://ibasketball.co.il/match/778679/")
    assert all(p["starter"] is None for p in g["players"]["home"]+g["players"]["away"])
    assert g["data_quality"]["checks"]["starter_flags_from_source"] is False
