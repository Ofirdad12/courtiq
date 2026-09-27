from api.plk import parse_plk_html, validate_plk_url

URL="https://plk.pl/mecz/225903/dziki-warszawa-vs-zastal-zielona-gora/statystyki"

def test_plk_225903_fixture():
    html="""<html><head><title>Dziki Warszawa vs Zastal Zielona Góra | 26.09.2026 - Statystyki - Polska Liga Koszykówki</title></head><body>
    <table><tr><th>NR</th><th>Zawodnik</th></tr>
    <tr><td>1</td><td>A. Luke</td><td>6</td><td>26:05</td><td>0/1</td><td>0</td><td>2/5</td><td>40</td><td>2/6</td><td>33.3</td><td>2/6</td><td>33.3</td><td>1</td><td>1</td><td>2</td><td>1</td><td>1</td><td>9</td><td>1</td><td>1</td><td>0</td><td>0</td><td>8</td><td>0</td></tr>
    <tr><td>Suma</td><td>77</td><td>200:00</td><td>17/32</td><td>53.1</td><td>9/30</td><td>30</td><td>26/62</td><td>41.9</td><td>16/25</td><td>64</td><td>11</td><td>26</td><td>37</td><td>24</td><td>22</td><td>24</td><td>15</td><td>8</td><td>4</td><td>3</td><td>83</td></tr></table>
    <table><tr><th>NR</th><th>Zawodnik</th></tr>
    <tr><td>0</td><td>C. Garrison</td><td>10</td><td>31:03</td><td>1/3</td><td>33.3</td><td>2/5</td><td>40</td><td>3/8</td><td>37.5</td><td>2/2</td><td>100</td><td>1</td><td>5</td><td>6</td><td>8</td><td>3</td><td>2</td><td>3</td><td>2</td><td>0</td><td>0</td><td>18</td><td>10</td></tr>
    <tr><td>Suma</td><td>81</td><td>200:00</td><td>19/37</td><td>51.4</td><td>10/27</td><td>37</td><td>29/64</td><td>45.3</td><td>13/17</td><td>76.5</td><td>9</td><td>29</td><td>38</td><td>25</td><td>24</td><td>22</td><td>14</td><td>7</td><td>3</td><td>4</td><td>96</td></tr></table>
    </body></html>"""
    game=parse_plk_html(html,URL)
    assert game["game"]["id"]=="225903"
    assert game["game"]["home_team"]=="Dziki Warszawa"
    assert game["game"]["away_team"]=="Zastal Zielona Góra"
    assert game["home"]["raw"]["points"]==77
    assert game["away"]["raw"]["points"]==81
    assert game["home"]["raw"]["fga"]==62
    assert game["away"]["raw"]["three_pa"]==27
    assert game["players"]["home"][0]["name"]=="A. Luke"
    assert game["players"]["away"][0]["name"]=="C. Garrison"
    assert game["validation"]["status"]=="verified"

def test_plk_rejects_non_official_host():
    try:
        validate_plk_url("https://example.com/mecz/225903/x/statystyki")
        assert False
    except ValueError:
        assert True
