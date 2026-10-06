/* CourtIQ League Intelligence Data v188 · imported-dataset adapter. */
(function(root){
  'use strict';
  const SUPABASE_URL='https://lgzfmoioecixmnivtqan.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_LTCc5iEgOzrH7t8bxvxwOA_aWsHoY8l';
  const SESSION_KEY='courtiq_supabase_session';
  const readSession=()=>{try{return JSON.parse(root.localStorage?.getItem(SESSION_KEY)||'null');}catch(_){return null;}};
  async function request(path,options={}){
    const session=readSession();if(!session?.access_token)throw new Error('Sign in to load League Intelligence.');
    const res=await fetch(SUPABASE_URL+path,{...options,headers:{apikey:PUBLISHABLE_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json',...(options.headers||{})}});
    let body=null;try{body=await res.json();}catch(_){}
    if(res.status===401&&root.CourtIQData?.refreshSession){const fresh=await root.CourtIQData.refreshSession();if(fresh)return request(path,options);}
    if(!res.ok)throw new Error(body?.message||body?.error||body?.hint||'League Intelligence request failed.');
    return body;
  }
  async function snapshot(clubId){
    const cid=Number(clubId);if(!cid)throw new Error('Club context is required.');
    const games=await request('/rest/v1/games?select=id,club_id,provider,competition,game_date,home_team,away_team,payload&club_id=eq.'+cid+'&order=game_date.desc.nullslast,id.desc');
    const ids=(games||[]).map(x=>Number(x.id)).filter(Boolean);
    let playerStats=[];
    if(ids.length){
      const chunks=[];for(let i=0;i<ids.length;i+=80)chunks.push(ids.slice(i,i+80));
      for(const chunk of chunks){
        const rows=await request('/rest/v1/game_player_stats?select=game_id,player_id,provider,team_name,opponent_name,player_name,minutes,stats,calculated,verified,created_at&game_id=in.('+chunk.join(',')+')&verified=eq.true');
        playerStats.push(...(rows||[]));
      }
    }
    return {games:games||[],player_stats:playerStats};
  }
  const api={request,snapshot,readSession};
  root.CourtIQLeagueData=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
