from api.ibba import parse_ibba_html

HTML="""<html><head><title>A — B - IBBA</title></head><body>
<div>05-04-2026</div>
<table><tr><th>קבוצה</th><th>רבע 1</th><th>רבע 2</th><th>רבע 3</th><th>רבע 4</th><th>תוצאה</th></tr>
<tr><td>A</td><td>20</td><td>20</td><td>20</td><td>20</td><td>80</td></tr>
<tr><td>B</td><td>18</td><td>18</td><td>18</td><td>18</td><td>72</td></tr></table>
<table><tr><th>#</th><th>שחקן</th><th>נק'</th><th>2 נק</th><th>3 נק</th><th>מהקו</th><th>ריב׳ הג׳</th><th>ריב׳ הת׳</th><th>איב'</th><th>אס'</th></tr>
<tr><td></td><td>סך הכל</td><td>80</td><td>20-40</td><td>10-25</td><td>10-12</td><td>25</td><td>10</td><td>12</td><td>20</td></tr></table>
<table><tr><th>#</th><th>שחקן</th><th>נק'</th><th>2 נק</th><th>3 נק</th><th>מהקו</th><th>ריב׳ הג׳</th><th>ריב׳ הת׳</th><th>איב'</th><th>אס'</th></tr>
<tr><td></td><td>סך הכל</td><td>72</td><td>18-38</td><td>8-24</td><td>12-16</td><td>23</td><td>9</td><td>15</td><td>16</td></tr></table>
</body></html>"""

def test_ibba_parser_to_courtiq_schema():
    g=parse_ibba_html(HTML,"https://ibasketball.co.il/match/778678/")
    assert g["validation"]["status"]=="verified"
    assert g["game"]["quarters"]["home"]==[20,20,20,20]
    assert g["home"]["raw"]["team"]=="A"
    assert g["home"]["raw"]["fgm"]==30
    assert g["home"]["four_factors"]["eFG%"]==53.8
