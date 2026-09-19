from api.compare import compare_teams

def game(home,away,hf,af):
    def side(name,f):
        return {"raw":{"team":name,"tov":f["tov"],"ast":f["ast"]},"possessions_est":f["poss"],"four_factors":{"eFG%":f["efg"],"TOV%":f["tovp"],"ORB%":f["orb"],"FTr":f["ftr"]}}
    return {"home":side(home,hf),"away":side(away,af)}

def test_compare_samples():
    games=[game("Ashdod","Karmiel",{"tov":10,"ast":20,"poss":70,"efg":55,"tovp":12,"orb":30,"ftr":25},{"tov":15,"ast":12,"poss":71,"efg":48,"tovp":19,"orb":22,"ftr":20}),
           game("Ramat Gan","Ashdod",{"tov":11,"ast":19,"poss":72,"efg":53,"tovp":13,"orb":28,"ftr":24},{"tov":9,"ast":18,"poss":71,"efg":56,"tovp":11,"orb":31,"ftr":26})]
    out=compare_teams(games,"Ashdod","Ramat Gan")
    assert out["team_a"]["games"]==2
    assert out["team_b"]["games"]==1
    assert out["team_a"]["averages"]["eFG%"]==55.5
