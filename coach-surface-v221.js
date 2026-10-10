(()=>{
'use strict';
const SECONDARY_IDS=['scoutingReportFlow','coachBriefFlow','seasonMemoryFlow','planUsageFlow','launchReadinessFlow'];
function surfacePlan(ids){const set=new Set(ids||[]);return {primary:'coachPrepSurface',secondary:SECONDARY_IDS.filter(id=>set.has(id))}}
function closeMenus(except=null){document.querySelectorAll('.cqCoachTools[data-open="1"]').forEach(w=>{if(w!==except){w.dataset.open='0';w.querySelector('.cqCoachToolsMenu')?.setAttribute('hidden','')}})}
function ensureStyle(){if(document.getElementById('cqCoachSurfaceStyle'))return;const s=document.createElement('style');s.id='cqCoachSurfaceStyle';s.textContent='.cqCoachTools{position:relative;display:inline-flex}.cqCoachToolsMenu{position:absolute;z-index:80;top:calc(100% + 7px);right:0;min-width:220px;padding:7px;border:1px solid rgba(255,255,255,.12);border-radius:11px;background:#0b1523;box-shadow:0 14px 34px rgba(0,0,0,.35);display:grid;gap:5px}.cqCoachToolsMenu[hidden]{display:none!important}.cqCoachToolsMenu .importBtn{width:100%;margin:0!important;text-align:left;justify-content:flex-start}.cqCoachToolsToggle{opacity:.84}.cqCoachPrepPrimary{font-weight:800}';document.head.appendChild(s)}
function prep(){if(window.CourtIQPrepHub?.open)return window.CourtIQPrepHub.open();return window.CourtIQAppActions?.run?.('dashboard')}
function consolidate(){
  ensureStyle();const p=document.querySelector('.pills');if(!p)return false;
  let prepBtn=document.getElementById('coachPrepSurface');
  if(!prepBtn){prepBtn=document.createElement('button');prepBtn.id='coachPrepSurface';prepBtn.type='button';prepBtn.className='importBtn primaryAction cqCoachPrepPrimary';prepBtn.textContent='GAME PREP';prepBtn.onclick=prep;p.prepend(prepBtn)}
  let wrap=document.getElementById('coachToolsSurface');
  if(!wrap){wrap=document.createElement('span');wrap.id='coachToolsSurface';wrap.className='cqCoachTools';wrap.dataset.open='0';wrap.innerHTML='<button type="button" class="importBtn cqCoachToolsToggle" aria-expanded="false">MORE</button><span class="cqCoachToolsMenu" hidden></span>';p.appendChild(wrap);const toggle=wrap.querySelector('.cqCoachToolsToggle');toggle.onclick=e=>{e.stopPropagation();const open=wrap.dataset.open!=='1';closeMenus(wrap);wrap.dataset.open=open?'1':'0';toggle.setAttribute('aria-expanded',open?'true':'false');wrap.querySelector('.cqCoachToolsMenu').toggleAttribute('hidden',!open)}}
  const menu=wrap.querySelector('.cqCoachToolsMenu');
  SECONDARY_IDS.forEach(id=>{const el=document.getElementById(id);if(!el||menu.contains(el))return;el.classList.remove('primaryAction');menu.appendChild(el)});
  if(wrap.parentElement!==p)p.appendChild(wrap);
  return true;
}
function boot(){consolidate();document.addEventListener('click',e=>{if(!e.target?.closest?.('.cqCoachTools'))closeMenus()})}
const Core={surfacePlan};
if(typeof window!=='undefined'){window.CourtIQCoachSurface={consolidate,Core};if(typeof document!=='undefined'){let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(consolidate,80)}).observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()}}
})();
