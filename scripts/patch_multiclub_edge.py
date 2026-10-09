from pathlib import Path

path = Path("supabase/functions/import-ibba-game/index.ts")
text = path.read_text(encoding="utf-8")

sentinel = 'const requestedClubId=Number(body.club_id||0);'
if sentinel in text:
    print("Multi-club Edge patch already applied.")
    raise SystemExit(0)

old_club = '''    const userDb=createClient(supabaseUrl,anon,{global:{headers:{Authorization:auth}}});
    const {data:clubs,error:clubErr}=await userDb.from("clubs").select("id,name,season").eq("slug","maccabi-bnot-ashdod").limit(1);
    if(clubErr) throw clubErr;
    if(!clubs?.length) return j({error:"This account does not have access to the Ashdod pilot."},403);

    const club=clubs[0];
    auditClubId=club.id;
    const body=await req.json();
    const parsed=validateUrl(String(body.url||""));'''
new_club = '''    const userDb=createClient(supabaseUrl,anon,{global:{headers:{Authorization:auth}}});
    const body=await req.json();
    const requestedClubId=Number(body.club_id||0);
    let clubQuery=userDb.from("clubs").select("id,name,season").order("id",{ascending:true}).limit(requestedClubId?1:2);
    if(requestedClubId) clubQuery=clubQuery.eq("id",requestedClubId);
    const {data:clubs,error:clubErr}=await clubQuery;
    if(clubErr) throw clubErr;
    if(!clubs?.length) return j({error:"This account does not have access to the selected club."},403);
    if(!requestedClubId&&clubs.length>1) return j({error:"Select a club before importing this game.",code:"CLUB_SELECTION_REQUIRED"},409);

    const club=clubs[0];
    auditClubId=club.id;
    const parsed=validateUrl(String(body.url||""));'''

old_plk = '''      if(starters.verified){
        parsedPlayers[0].players.forEach((p:any)=>p.starter=starters.home.includes(p.name));
        parsedPlayers[1].players.forEach((p:any)=>p.starter=starters.away.includes(p.name));
      }'''
new_plk = '''      if(starters.verified){
        parsedPlayers[0].players.forEach((p:any)=>{p.starter=starters.home.includes(p.name);p.starter_verified=true;p.starter_source="official_play_by_play";});
        parsedPlayers[1].players.forEach((p:any)=>{p.starter=starters.away.includes(p.name);p.starter_verified=true;p.starter_source="official_play_by_play";});
      }else{
        parsedPlayers[0].players.forEach((p:any)=>{p.starter=null;p.starter_verified=false;p.starter_source="unknown";});
        parsedPlayers[1].players.forEach((p:any)=>{p.starter=null;p.starter_verified=false;p.starter_source="unknown";});
      }'''

old_upsert = '''    },{onConflict:"provider,external_id"}).select("id").single();'''
new_upsert = '''    },{onConflict:"club_id,provider,external_id"}).select("id").single();'''

old_starter = '''jersey_number:player.number||null,starter:Boolean(player.starter),minutes:player.minutes||0,stats:player,calculated'''
new_starter = '''jersey_number:player.number||null,starter:typeof player.starter==="boolean"?player.starter:null,minutes:player.minutes||0,stats:player,calculated'''

old_fiba = '''    if(provider==="FIBA"){
      const ashdodSide=/ashdod/i.test(homeName)?0:/ashdod/i.test(awayName)?1:-1;
      if(ashdodSide>=0){'''
new_fiba = '''    if(provider==="FIBA"){
      const key=(value:string)=>clean(value||"").toLowerCase().replace(/[^a-z0-9]+/g,"");
      const clubKey=key(String(club.name||""));
      const clubSide=clubKey&&key(homeName).includes(clubKey)?0:clubKey&&key(awayName).includes(clubKey)?1:-1;
      if(clubSide>=0){'''

old_team_players = '''        const teamPlayers=parsedPlayers[ashdodSide].players.filter((p:any)=>p.has_played||p.minutes>0);'''
new_team_players = '''        const teamPlayers=parsedPlayers[clubSide].players.filter((p:any)=>p.has_played||p.minutes>0);'''

old_club_name = '''competition:title,club_name:"Maccabi Bnot Ashdod",phase:'''
new_club_name = '''competition:title,club_name:club.name,phase:'''

replacements = [
    (old_club, new_club, "club authorization"),
    (old_plk, new_plk, "PLK starter evidence"),
    (old_upsert, new_upsert, "club-scoped game upsert"),
    (old_starter, new_starter, "tri-state starter persistence"),
    (old_fiba, new_fiba, "FIBA club-side linking"),
    (old_team_players, new_team_players, "FIBA selected side"),
    (old_club_name, new_club_name, "FIBA club name"),
]

for old, new, label in replacements:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one {label} target, found {count}")
    text = text.replace(old, new, 1)

if "maccabi-bnot-ashdod" in text or "Ashdod pilot" in text:
    raise RuntimeError("Pilot-specific import hardcode remains in Edge Function")
if 'onConflict:"provider,external_id"' in text:
    raise RuntimeError("Global game upsert conflict target remains")

path.write_text(text, encoding="utf-8")
print("Applied multi-club Edge Function patch safely.")
