(()=>{
'use strict';

const SUPABASE_URL='https://lgzfmoioecixmnivtqan.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_LTCc5iEgOzrH7t8bxvxwOA_aWsHoY8l';
const SESSION_KEY='courtiq_supabase_session';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(_){return null}}
async function request(path,retry=true){
  const s=session();if(!s?.access_token)throw new Error('יש להתחבר כדי לראות Plan & Usage.');
  const res=await fetch(SUPABASE_URL+path,{headers:{apikey:PUBLISHABLE_KEY,Authorization:'Bearer '+s.access_token}});
  let body=null;try{body=await res.json()}catch(_){}
  if(res.status===401&&retry&&window.CourtIQData?.refreshSession){const ok=await window.CourtIQData.refreshSession();if(ok)return request(path,false)}
  if(!res.ok)throw new Error(body?.message||body?.error||body?.hint||'Plan request failed');
  return Array.isArray(body)?body:[];
}
function usageState(row){
  const limit=row?.monthly_game_limit==null?null:Number(row.monthly_game_limit),used=Math.max(0,Number(row?.games_used)||0),remaining=limit==null?null:Math.max(0,limit-used),ratio=limit&&limit>0?Math.min(1,used/limit):0;
  return {limit,used,remaining,ratio,unlimited:limit==null,canImport:row?.can_import_game===true};
}
function statusLabel(status){return ({trialing:'TRIAL',active:'ACTIVE',past_due:'PAST DUE',paused:'PAUSED',canceled:'CANCELED',incomplete:'INCOMPLETE'})[String(status||'').toLowerCase()]||String(status||'UNKNOWN').toUpperCase()}
function featureRows(features){
  const labels={official_import:'Official game import',scouting_report:'Opponent scouting',coach_brief:'Coach Brief',season_memory:'Season Memory',player_memory:'Player Memory',live_intelligence:'Live Intelligence',video:'Video Intelligence',multi_team:'Multi-team workspace',api:'API access'};
  return Object.entries(labels).map(([k,label])=>`<li data-on="${features?.[k]===true?'1':'0'}"><b>${features?.[k]===true?'✓':'—'}</b> ${E(label)}</li>`).join('');
}
function fmtDate(v){if(!v)return '—';try{return new Intl.DateTimeFormat('he-IL',{year:'numeric',month:'short',day:'numeric'}).format(new Date(v))}catch(_){return String(v)}}
async function loadPlan(){
  const resolved=await window.CourtIQMultiClub?.resolveClub?.();if(!resolved?.club)throw new Error('לא נמצא מועדון פעיל.');const club=resolved.club;
  const rows=await request(`/rest/v1/club_entitlement_status?select=club_id,plan_code,plan_name,status,payment_provider,current_period_start,current_period_end,trial_ends_at,cancel_at_period_end,monthly_game_limit,seat_limit,features,games_used,games_remaining,can_import_game&club_id=eq.${Number(club.id)}&limit=1`);
  if(!rows.length)throw new Error('אין עדיין Subscription משויך למועדון הזה.');return {club,row:rows[0]};
}
function render(root,club,row){
  const u=usageState(row),pct=u.unlimited?0:Math.round(u.ratio*100),status=statusLabel(row.status),provider=row.payment_provider?String(row.payment_provider).toUpperCase():'NOT CONNECTED';
  root.innerHTML=`<div class="planHero"><div><small>COURTIQ SaaS</small><h2>${E(row.plan_name||row.plan_code)}</h2><p>${E(club.name)} · ${E(status)}</p></div><span class="planState ${E(String(row.status||''))}">${E(status)}</span></div><section class="planUsage"><div class="planMetric"><span>Official games this period</span><b>${u.used}${u.unlimited?' / ∞':` / ${u.limit}`}</b><small>${u.unlimited?'Unlimited plan':`${u.remaining} remaining`}</small></div><div class="planBar" aria-label="Game usage"><i style="width:${pct}%"></i></div><div class="planMeta"><span>Period start <b>${E(fmtDate(row.current_period_start))}</b></span><span>Period end <b>${E(fmtDate(row.current_period_end))}</b></span><span>Seats <b>${row.seat_limit==null?'Unlimited':E(row.seat_limit)}</b></span><span>Billing <b>${E(provider)}</b></span></div>${u.canImport?'':'<p class="planWarn">Game import is currently blocked by subscription status, period end or usage limit.</p>'}</section><section><h3>Entitlements</h3><ul class="planFeatures">${featureRows(row.features||{})}</ul></section>${row.trial_ends_at?`<section class="planNote"><b>Trial ends:</b> ${E(fmtDate(row.trial_ends_at))}</section>`:''}<section class="planNote">Payment processing is intentionally separate from CourtIQ entitlements. Connecting Stripe later will update this subscription record; the product rules already live here.</section>`;
}
async function openPlan(){
  document.getElementById('cqPlanUsage')?.remove();const modal=document.createElement('div');modal.id='cqPlanUsage';modal.className='modal';modal.innerHTML='<div class="modalCard cqPlanCard"><button class="modalX" aria-label="Close">×</button><p class="planLoading">Loading plan…</p><div class="planBody"></div></div>';document.body.appendChild(modal);modal.querySelector('.modalX').onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove()};
  try{const {club,row}=await loadPlan();modal.querySelector('.planLoading').remove();render(modal.querySelector('.planBody'),club,row)}catch(e){modal.querySelector('.planLoading').textContent=e.message}
}
function style(){if(document.getElementById('cqPlanUsageStyle'))return;const s=document.createElement('style');s.id='cqPlanUsageStyle';s.textContent='.cqPlanCard{max-width:720px}.planHero{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.planHero h2{font-size:32px;margin:3px 0}.planHero p{color:#94a9bd}.planState{border:1px solid rgba(255,255,255,.18);padding:7px 10px;border-radius:999px;font-size:11px}.planState.active,.planState.trialing{border-color:#42ca83;color:#9ff0be}.planUsage, .planNote{border:1px solid rgba(255,255,255,.1);border-radius:13px;padding:14px;margin-top:14px;background:rgba(255,255,255,.03)}.planMetric{display:grid;grid-template-columns:1fr auto;gap:3px 12px}.planMetric b{font-size:24px}.planMetric small{color:#90a5b9}.planBar{height:9px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden;margin:12px 0}.planBar i{display:block;height:100%;background:currentColor;border-radius:999px}.planMeta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.planMeta span{padding:8px;background:rgba(255,255,255,.035);border-radius:8px;color:#90a5b9}.planMeta b{display:block;color:#fff}.planFeatures{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;padding:0;list-style:none}.planFeatures li{padding:8px 10px;border:1px solid rgba(255,255,255,.08);border-radius:8px;color:#8599ad}.planFeatures li[data-on="1"]{color:#e8f6ef;border-color:rgba(71,210,137,.25)}.planWarn{color:#ffd1a1;border-right:3px solid #d99a4b;padding-right:10px}.planNote{font-size:12px;color:#91a5b8}@media(max-width:650px){.planMeta,.planFeatures{grid-template-columns:1fr}}';document.head.appendChild(s)}
function inject(){style();const p=document.querySelector('.pills');if(!p||document.getElementById('planUsageFlow'))return;const b=document.createElement('button');b.id='planUsageFlow';b.className='importBtn';b.textContent='PLAN · USAGE';b.onclick=openPlan;p.appendChild(b)}
const Core={usageState,statusLabel};
if(typeof window!=='undefined'){window.CourtIQPlanUsageCore=Core;if(typeof document!=='undefined'){let t;const boot=()=>inject();new MutationObserver(()=>{clearTimeout(t);t=setTimeout(boot,80)}).observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();}}
})();
