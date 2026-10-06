/* CourtIQ Basketball Ops Data v187 · Player 360 / GM / Recruitment adapter. */
(function(root){
  'use strict';
  const SUPABASE_URL='https://lgzfmoioecixmnivtqan.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_LTCc5iEgOzrH7t8bxvxwOA_aWsHoY8l';
  const SESSION_KEY='courtiq_supabase_session';
  const readSession=()=>{try{return JSON.parse(root.localStorage?.getItem(SESSION_KEY)||'null');}catch(_){return null;}};
  async function request(path,options={}){
    const session=readSession();if(!session?.access_token)throw new Error('Sign in to load Basketball Operations.');
    const res=await fetch(SUPABASE_URL+path,{...options,headers:{apikey:PUBLISHABLE_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json',...(options.headers||{})}});
    let body=null;try{body=await res.json();}catch(_){}
    if(res.status===401&&root.CourtIQData?.refreshSession){const fresh=await root.CourtIQData.refreshSession();if(fresh)return request(path,options);}
    if(!res.ok)throw new Error(body?.message||body?.error||body?.hint||'Basketball Operations request failed.');
    return body;
  }
  async function snapshot(clubId,season=null){return request('/rest/v1/rpc/basketball_ops_snapshot',{method:'POST',body:JSON.stringify({p_club_id:Number(clubId),p_season:season||null})});}
  async function player360(clubId,playerId,season=null){return request('/rest/v1/rpc/player_360_snapshot',{method:'POST',body:JSON.stringify({p_club_id:Number(clubId),p_player_id:Number(playerId),p_season:season||null})});}
  async function saveNeed(row){return request('/rest/v1/club_roster_needs?on_conflict=club_id,season,role_key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(row)});}
  async function saveShortlist(row){return request('/rest/v1/recruitment_shortlist?on_conflict=club_id,season,player_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(row)});}
  const api={request,snapshot,player360,saveNeed,saveShortlist,readSession};
  root.CourtIQBasketballOpsData=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
