/* CourtIQ Club OS v186 · organization context data adapter. */
(function(root){
  'use strict';
  const SUPABASE_URL='https://lgzfmoioecixmnivtqan.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_LTCc5iEgOzrH7t8bxvxwOA_aWsHoY8l';
  const SESSION_KEY='courtiq_supabase_session';
  const readSession=()=>{try{return JSON.parse(root.localStorage?.getItem(SESSION_KEY)||'null');}catch(_){return null;}};
  async function request(path,options={}){
    const session=readSession();
    if(!session?.access_token)throw new Error('Sign in to load Club OS.');
    const res=await fetch(SUPABASE_URL+path,{...options,headers:{apikey:PUBLISHABLE_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json',...(options.headers||{})}});
    let body=null;try{body=await res.json();}catch(_){}
    if(res.status===401&&root.CourtIQData?.refreshSession){const fresh=await root.CourtIQData.refreshSession();if(fresh)return request(path,options);}
    if(!res.ok)throw new Error(body?.message||body?.error||body?.hint||'Club OS request failed.');
    return body;
  }
  async function context(){
    const body=await request('/rest/v1/rpc/my_club_os_context',{method:'POST',body:'{}'});
    return Array.isArray(body)?body:[];
  }
  async function stats(clubId,season){
    const cid=Number(clubId);if(!cid)return {games:0,roster:0,scouting:0,opponents:0,reports:0};
    const [games,players]=await Promise.all([
      request('/rest/v1/games?select=id&club_id=eq.'+cid),
      request('/rest/v1/club_players?select=roster_status,season&club_id=eq.'+cid+(season?'&season=eq.'+encodeURIComponent(season):''))
    ]);
    const ids=(games||[]).map(x=>Number(x.id)).filter(Boolean);
    let reports=[];
    if(ids.length){try{reports=await request('/rest/v1/game_reports?select=id,game_id&game_id=in.('+ids.join(',')+')');}catch(_){reports=[];}}
    const rows=players||[];
    return {games:(games||[]).length,roster:rows.filter(x=>x.roster_status==='roster').length,scouting:rows.filter(x=>x.roster_status==='scouting').length,opponents:rows.filter(x=>x.roster_status==='opponent').length,reports:reports.length};
  }
  const api={context,stats,readSession};
  root.CourtIQClubOSData=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
