/* CourtIQ v185 · Coach Decision Engine + Hypothesis Tracker + Evidence / Counter-Evidence. */
(function(root){
  'use strict';
  const STORE='courtiq_decision_hypotheses_v1';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>{const x=Number(String(v??'').replace(/%$/,''));return Number.isFinite(x)?x:null;};
  const other=s=>s==='away'?'home':'away';
  const teamName=(G,s)=>G?.[s]||s;
  const eventList=G=>Array.isArray(G?.playByPlay)?G.playByPlay:Array.isArray(G?.play_by_play)?G.play_by_play:[];
  const factorMap=G=>Object.fromEntries((G?.factors||[]).filter(Array.isArray).map(r=>[String(r[0]),{home:num(r[1]),away:num(r[2])}]));
  const clockSeconds=v=>{const m=String(v||'').match(/(\d+):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null;};
  const scorePair=v=>{const m=String(v||'').match(/(\d+)\s*[-:–]\s*(\d+)/);return m?[Number(m[1]),Number(m[2])]:null;};
  const round=v=>Math.round(Number(v||0)*10)/10;

  function latestEvent(G){
    return eventList(G).map((e,i)=>({...e,_i:i,_s:clockSeconds(e.clock)})).filter(e=>Number(e.period)>0&&e._s!=null)
      .sort((a,b)=>Number(b.period)-Number(a.period)||a._s-b._s||b._i-a._i)[0]||null;
  }
  function scoreOrientation(G){
    const rows=eventList(G).map(e=>scorePair(e.score)).filter(Boolean),hs=num(G?.hs),as=num(G?.as);if(!rows.length||hs==null||as==null)return null;
    for(let i=rows.length-1;i>=0;i--){const s=rows[i];if(s[0]===hs&&s[1]===as)return 0;if(s[1]===hs&&s[0]===as)return 1;}
    return null;
  }
  function recentRun(G,minutes=5){
    const latest=latestEvent(G),orientation=scoreOrientation(G);if(!latest||orientation==null)return null;
    const period=Number(latest.period),now=clockSeconds(latest.clock);if(now==null)return null;
    const duration=period<=4?600:300,target=Math.min(duration,now+minutes*60),rows=eventList(G).filter(e=>Number(e.period)===period&&scorePair(e.score)&&clockSeconds(e.clock)!=null)
      .map(e=>({sec:clockSeconds(e.clock),raw:scorePair(e.score)})).map(x=>({sec:x.sec,score:orientation===1?[x.raw[1],x.raw[0]]:x.raw}));
    if(!rows.length)return null;
    const current=orientation===1?[Number(G.as||0),Number(G.hs||0)]:[Number(G.hs||0),Number(G.as||0)],candidates=rows.filter(x=>x.sec>=target).sort((a,b)=>a.sec-b.sec),base=(candidates[0]||[...rows].sort((a,b)=>b.sec-a.sec)[0])?.score;
    return base?{period,home:current[0]-base[0],away:current[1]-base[1],minutes:round((Math.min(target,duration)-now)/60)}:null;
  }
  function eventText(e){return [e?.period_label||('Q'+(e?.period||'')),e?.clock,e?.team||e?.side,e?.player,e?.description||e?.type].filter(Boolean).join(' · ');}
  function recentEvents(G,limit=8){
    return eventList(G).map((e,i)=>({...e,_i:i,_s:clockSeconds(e.clock)})).filter(e=>Number(e.period)>0)
      .sort((a,b)=>Number(b.period)-Number(a.period)||(a._s??9999)-(b._s??9999)||b._i-a._i).slice(0,limit);
  }
  function matchesSide(e,side,G){if(e?.side===side)return true;const t=String(e?.team||'').trim().toLowerCase(),n=String(teamName(G,side)||'').trim().toLowerCase();return !!t&&!!n&&(t===n||t.includes(n)||n.includes(t));}
  function isTurnover(e){return /turnover|strata|איבוד|איב׳|to\b/i.test([e?.type,e?.description].join(' '));}
  function isOreb(e){return /offensive.?rebound|off.?reb|zb[ií]o?rka.*atak|ריב.*התק/i.test([e?.type,e?.description].join(' '));}
  function pbpExamples(G,side,predicate,limit=3){return recentEvents(G,30).filter(e=>matchesSide(e,side,G)&&predicate(e)).slice(0,limit).map(eventText);}

  function signalSet(G,focus='home'){
    const opp=other(focus),f=factorMap(G),signals=[],run=recentRun(G,5),focusRun=run?.[focus]??0,oppRun=run?.[opp]??0;
    const add=(id,severity,title,evidence,check,support=[],counter=[])=>signals.push({id,severity,title,evidence,check,support,counter});
    if(run&&oppRun-focusRun>=8)add('run',oppRun-focusRun>=10?'SEVERE':'MODERATE','Opponent scoring run',`${teamName(G,opp)} +${oppRun-focusRun} run margin in the current ~${run.minutes || 5} minute window.`,'Verify whether the run comes from turnovers, second possessions or shot-making before changing coverage.',recentEvents(G,6).map(eventText),[]);
    const tovF=f['TOV%']?.[focus],tovO=f['TOV%']?.[opp];
    if(tovF!=null&&tovO!=null&&tovF>=20&&tovF-tovO>=5)add('tov',tovF>=25?'SEVERE':'MODERATE','Ball-security pressure',`${teamName(G,focus)} ${round(tovF)}% TOV% vs ${round(tovO)}%.`,'Classify the turnovers first: pressure, passing, handling or offensive foul.',pbpExamples(G,focus,isTurnover),pbpExamples(G,opp,isTurnover));
    const orbO=f['ORB%']?.[opp],orbF=f['ORB%']?.[focus];
    if(orbO!=null&&orbF!=null&&orbO>=35&&orbO-orbF>=7)add('orb',orbO>=42?'SEVERE':'MODERATE','Defensive glass under pressure',`${teamName(G,opp)} ${round(orbO)}% ORB% vs ${round(orbF)}%.`,'Check which misses create second possessions and who is responsible for the box-out.',pbpExamples(G,opp,isOreb),pbpExamples(G,focus,isOreb));
    const efgO=f['eFG%']?.[opp],efgF=f['eFG%']?.[focus];
    if(efgO!=null&&efgF!=null&&efgO>=60&&efgO-efgF>=8)add('efg',efgO>=68?'SEVERE':'MODERATE','Opponent shooting efficiency spike',`${teamName(G,opp)} ${round(efgO)}% eFG% vs ${round(efgF)}%.`,'Separate rim/open-shot quality from difficult makes before changing the defensive plan.',[],[]);
    const ftrO=f['FTr']?.[opp],ftrF=f['FTr']?.[focus];
    if(ftrO!=null&&ftrF!=null&&ftrO>=35&&ftrO-ftrF>=10)add('ftr','MODERATE','Free-throw pressure',`${teamName(G,opp)} FTr ${round(ftrO)} vs ${round(ftrF)}.`,'Check foul type and location; do not treat every free throw as the same defensive problem.',[],[]);
    return signals;
  }

  function confidence(G){const f=factorMap(G),available=['eFG%','TOV%','ORB%','FTr'].filter(k=>f[k]?.home!=null&&f[k]?.away!=null).length,n=eventList(G).length;if(n>=30&&available>=3)return 'HIGH';if(n>=12&&available>=2)return 'MEDIUM';return 'LOW';}
  function decision(G,focus='home'){
    const signals=signalSet(G,focus),severe=signals.filter(s=>s.severity==='SEVERE'),moderate=signals.filter(s=>s.severity==='MODERATE');let label='STAY';
    if(severe.length>=2||(severe.length>=1&&moderate.length>=1))label='CONSIDER CHANGE';else if(severe.length>=1||moderate.length>=2)label='WATCH';
    const top=[...severe,...moderate].slice(0,2),why=top.length?top.map(s=>s.title).join(' + '):'No independent live threshold currently supports a change.',next=top.length?top.map(s=>s.check).slice(0,2):['Keep the current plan and verify shot quality on the next two defensive possessions.','Track ball security and second possessions before escalating.'];
    const support=top.flatMap(s=>[s.evidence,...s.support]).filter(Boolean).slice(0,8),counter=top.flatMap(s=>s.counter).filter(Boolean).slice(0,6);
    if(!counter.length)counter.push('No verified counter-signal is strong enough yet. Re-check after two possessions or the next refresh.');
    return {label,confidence:confidence(G),why,nextTwo:next,signals,support,counter,sample:eventList(G).length};
  }

  const templates=[
    {id:'possession-battle',title:'We can win the possession battle',eval:(G,focus)=>{const f=factorMap(G),opp=other(focus),a=f['TOV%']?.[focus],b=f['TOV%']?.[opp],c=f['ORB%']?.[focus],d=f['ORB%']?.[opp];if([a,b,c,d].some(v=>v==null))return result('INSUFFICIENT','Need TOV% and ORB% for both teams.','Wait for a larger verified sample.');const edge=(b-a)+(c-d);return edge>=8?result('SUPPORTED',`Combined possession edge +${round(edge)} pts from TOV% + ORB%.`,'Refute if the combined edge falls below +2.',[`TOV% ${round(a)} vs ${round(b)}`,`ORB% ${round(c)} vs ${round(d)}`],[`Opponent still has ${round(d)}% ORB%.`]):edge<=-8?result('REFUTED',`Combined possession edge ${round(edge)} pts.`,'Upgrade if the combined edge recovers above +2.',[],[`TOV% ${round(a)} vs ${round(b)}`,`ORB% ${round(c)} vs ${round(d)}`]):result('INSUFFICIENT',`Combined possession edge ${round(edge)} pts is not decisive.`,'Supported at +8; refuted at -8.');}},
    {id:'glass-pressure',title:'Opponent is hurting us on the offensive glass',eval:(G,focus)=>{const f=factorMap(G),opp=other(focus),o=f['ORB%']?.[opp],a=f['ORB%']?.[focus];if(o==null||a==null)return result('INSUFFICIENT','ORB% sample unavailable.','Supported if opponent ORB% reaches 35% with a clear edge.');if(o>=35&&o-a>=7)return result('SUPPORTED',`${teamName(G,opp)} ${round(o)}% ORB%, +${round(o-a)} pts.`,`Downgrade if opponent ORB% falls below 30% or the gap below 4.`,pbpExamples(G,opp,isOreb),pbpExamples(G,focus,isOreb));if(o<=25)return result('REFUTED',`${teamName(G,opp)} only ${round(o)}% ORB%.`,'Re-open if opponent ORB% rises to 35%.',[],pbpExamples(G,opp,isOreb));return result('INSUFFICIENT',`${teamName(G,opp)} ${round(o)}% ORB%.`,'Supported at ≥35% with ≥7-point edge.');}},
    {id:'ball-security',title:'Ball security is a pressure point',eval:(G,focus)=>{const f=factorMap(G),opp=other(focus),a=f['TOV%']?.[focus],b=f['TOV%']?.[opp];if(a==null||b==null)return result('INSUFFICIENT','TOV% sample unavailable.','Supported if our TOV% reaches 20% and is 5+ pts worse.');if(a>=20&&a-b>=5)return result('SUPPORTED',`${teamName(G,focus)} ${round(a)}% TOV%, +${round(a-b)} pts worse.`,`Downgrade if TOV% drops below 17% or gap below 3.`,pbpExamples(G,focus,isTurnover),pbpExamples(G,opp,isTurnover));if(a<=14&&a<=b)return result('REFUTED',`${teamName(G,focus)} ${round(a)}% TOV% is currently controlled.`,'Re-open if TOV% reaches 20%.',[],pbpExamples(G,focus,isTurnover));return result('INSUFFICIENT',`${teamName(G,focus)} ${round(a)}% TOV%.`,'Supported at ≥20% with ≥5-point disadvantage.');}},
    {id:'shotmaking-gap',title:'Opponent shot-making is driving the scoreboard gap',eval:(G,focus)=>{const f=factorMap(G),opp=other(focus),o=f['eFG%']?.[opp],a=f['eFG%']?.[focus];if(o==null||a==null)return result('INSUFFICIENT','eFG% sample unavailable.','Supported if opponent eFG% reaches 60% with an 8+ point edge.');if(o>=60&&o-a>=8)return result('SUPPORTED',`${teamName(G,opp)} ${round(o)}% eFG%, +${round(o-a)} pts.`,`Downgrade if eFG gap falls below 5 pts.`,[`Opponent eFG% ${round(o)}%`],[`Our eFG% ${round(a)}%`]);if(o<50)return result('REFUTED',`${teamName(G,opp)} ${round(o)}% eFG% is not a shooting spike.`,'Re-open at ≥60% with a clear edge.');return result('INSUFFICIENT',`${teamName(G,opp)} ${round(o)}% eFG%.`,'Supported at ≥60% and ≥8-point edge.');}},
    {id:'ft-pressure',title:'Free-throw pressure is changing the game',eval:(G,focus)=>{const f=factorMap(G),opp=other(focus),o=f['FTr']?.[opp],a=f['FTr']?.[focus];if(o==null||a==null)return result('INSUFFICIENT','FTr sample unavailable.','Supported if opponent FTr reaches 35 with a 10+ point edge.');if(o>=35&&o-a>=10)return result('SUPPORTED',`${teamName(G,opp)} FTr ${round(o)}, +${round(o-a)}.`,'Downgrade if the FTr gap falls below 6.',[`Opponent FTr ${round(o)}`],[`Our FTr ${round(a)}`]);if(o<20)return result('REFUTED',`${teamName(G,opp)} FTr ${round(o)} is low.`,'Re-open at FTr ≥35 with a clear edge.');return result('INSUFFICIENT',`${teamName(G,opp)} FTr ${round(o)}.`,'Supported at ≥35 with ≥10-point edge.');}}
  ];
  function result(status,evidence,changeMind,support=[],counter=[]){return {status,evidence,changeMind,support,counter};}
  function evaluateHypotheses(G,focus='home',custom=[]){return [...templates.map(t=>({...t,...t.eval(G,focus),automatic:true})),...custom.map((x,i)=>({id:x.id||'custom-'+i,title:x.title,status:'MANUAL CHECK',evidence:'Custom tactical hypotheses require analyst/video tagging before CourtIQ can score them.',changeMind:'Tag supporting and contradicting possessions, then review the evidence balance.',support:[],counter:[],automatic:false}))];}
  function storageKey(source){return STORE+':'+String(source||'unknown').replace(/[^a-z0-9]+/gi,'_').slice(-120);}
  function loadCustom(source){try{const x=JSON.parse(root.localStorage?.getItem(storageKey(source))||'[]');return Array.isArray(x)?x:[];}catch(_){return[];}}
  function saveCustom(source,rows){try{root.localStorage?.setItem(storageKey(source),JSON.stringify(rows.slice(0,12)));}catch(_){}return rows;}
  function addCustom(source,title){const text=String(title||'').trim();if(!text)return loadCustom(source);const rows=loadCustom(source);rows.push({id:'h-'+Date.now(),title:text});return saveCustom(source,rows);}
  function removeCustom(source,id){return saveCustom(source,loadCustom(source).filter(x=>x.id!==id));}

  function listHtml(items,empty){return items?.length?`<ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:`<p>${esc(empty)}</p>`;}
  function renderDecision(G,focus){const d=decision(G,focus),cls=d.label.toLowerCase().replace(/\s+/g,'-');return `<section class="cqDecision" data-cq-decision><div class="cqDecisionTop"><div><small>COACH DECISION ENGINE · V185</small><h3>${esc(teamName(G,focus))}</h3></div><span class="cqDecisionBadge ${cls}">${esc(d.label)}</span></div><div class="cqDecisionGrid"><article><small>WHY NOW</small><b>${esc(d.why)}</b><span>${d.sample} verified PBP events · confidence ${esc(d.confidence)}</span></article><article><small>NEXT 2 POSSESSIONS</small>${listHtml(d.nextTwo,'Keep observing.')}</article></div><div class="cqEvidenceButtons"><button type="button" data-cq-toggle="support">SHOW EVIDENCE</button><button type="button" data-cq-toggle="counter">SHOW COUNTER-EVIDENCE</button></div><div class="cqEvidenceDrawer" data-cq-drawer="support" hidden><b>Evidence supporting the current decision state</b>${listHtml(d.support,'No possession-level evidence available yet.')}</div><div class="cqEvidenceDrawer" data-cq-drawer="counter" hidden><b>Evidence that could argue against escalation</b>${listHtml(d.counter,'No counter-evidence available yet.')}</div><p class="cqDecisionNote">Decision labels are decision-support states, not tactical causation. CONSIDER CHANGE means corroborated live signals justify a coach check — not an automatic tactical instruction.</p></section>`;}
  function renderHypotheses(G,focus,source){const rows=evaluateHypotheses(G,focus,loadCustom(source));return `<section class="cqHypotheses" data-cq-hypotheses><div class="cqHypHead"><div><small>HYPOTHESIS TRACKER</small><h3>Pregame ideas → live verdict</h3></div><span>${rows.filter(x=>x.status==='SUPPORTED').length} supported · ${rows.filter(x=>x.status==='REFUTED').length} refuted</span></div><div class="cqHypGrid">${rows.map(x=>`<article class="cqHypCard ${String(x.status).toLowerCase().replace(/\s+/g,'-')}"><div><span>${esc(x.status)}</span>${!x.automatic?`<button type="button" data-cq-remove="${esc(x.id)}" aria-label="Remove hypothesis">×</button>`:''}</div><h4>${esc(x.title)}</h4><b>${esc(x.evidence)}</b><p><strong>What would change my mind?</strong> ${esc(x.changeMind)}</p><details><summary>Evidence balance</summary><div class="cqEvidenceSplit"><div><small>FOR</small>${listHtml(x.support,'No tagged support yet.')}</div><div><small>AGAINST</small>${listHtml(x.counter,'No tagged counter-evidence yet.')}</div></div></details></article>`).join('')}</div><form class="cqHypForm"><input maxlength="140" placeholder="Add a tactical hypothesis to test…"><button type="submit">ADD HYPOTHESIS</button></form><p class="cqDecisionNote">Automatic hypotheses use verified stats/PBP thresholds. Custom tactical hypotheses remain MANUAL CHECK until possession/video tags support scoring them.</p></section>`;}
  function renderWorkspace(G,focus='home',source=''){return renderDecision(G,focus)+renderHypotheses(G,focus,source);}
  function bindPanel(modal,G,focus,source){
    const body=modal.querySelector('.lbBody');if(!body)return;body.querySelectorAll('[data-cq-decision],[data-cq-hypotheses]').forEach(x=>x.remove());const score=body.querySelector('.lbScore'),wrap=document.createElement('div');wrap.className='cqDecisionWorkspace';wrap.innerHTML=renderWorkspace(G,focus,source);score?.after(wrap)||body.prepend(wrap);
    wrap.querySelectorAll('[data-cq-toggle]').forEach(btn=>btn.addEventListener('click',()=>{const key=btn.getAttribute('data-cq-toggle'),drawer=wrap.querySelector(`[data-cq-drawer="${key}"]`);if(drawer)drawer.hidden=!drawer.hidden;}));
    wrap.querySelector('.cqHypForm')?.addEventListener('submit',e=>{e.preventDefault();const input=e.currentTarget.querySelector('input');addCustom(source,input.value);bindPanel(modal,G,focus,source);});
    wrap.querySelectorAll('[data-cq-remove]').forEach(btn=>btn.addEventListener('click',()=>{removeCustom(source,btn.getAttribute('data-cq-remove'));bindPanel(modal,G,focus,source);}));
  }

  const liveState=new WeakMap();
  async function refreshModal(modal,force=false){
    if(!modal?.isConnected||!root.CourtIQLiveBench?.preview)return;const status=modal.querySelector('.lbStatus'),text=String(status?.textContent||''),url=String(modal.querySelector('.lbUrl')?.value||'').trim();if(!url||(!force&&!/^LIVE SNAPSHOT/i.test(text)))return;
    const st=liveState.get(modal)||{stamp:'',token:0,game:null};if(!force&&st.stamp===text&&modal.querySelector('[data-cq-decision]'))return;st.stamp=text;const token=++st.token;liveState.set(modal,st);
    try{const result=await root.CourtIQLiveBench.preview(url);if(token!==st.token||!modal.isConnected)return;st.game=result?.ui||null;if(!st.game)return;const focus=modal.querySelector('.lbFocus')?.value||'home';bindPanel(modal,st.game,focus,url);}catch(_){/* Decision layer must never break Live Bench. */}
  }
  function bindModal(modal){if(modal.dataset.cqDecisionBound==='1')return;modal.dataset.cqDecisionBound='1';const status=modal.querySelector('.lbStatus');if(status&&root.MutationObserver)new MutationObserver(()=>refreshModal(modal)).observe(status,{childList:true,subtree:true,characterData:true});modal.querySelector('.lbFocus')?.addEventListener('change',()=>{const st=liveState.get(modal);if(st?.game)bindPanel(modal,st.game,modal.querySelector('.lbFocus')?.value||'home',modal.querySelector('.lbUrl')?.value||'');else refreshModal(modal,true);});refreshModal(modal);
  }
  function scan(){if(!root.document)return;document.querySelectorAll('.liveBenchModal').forEach(bindModal);}
  function install(){scan();if(root.MutationObserver)new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});}

  const api={eventList,factorMap,latestEvent,recentRun,signalSet,confidence,decision,evaluateHypotheses,loadCustom,saveCustom,addCustom,removeCustom,renderDecision,renderHypotheses,renderWorkspace,bindPanel,install};
  root.CourtIQDecisionIntelligence=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root.document){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();}
})(typeof window!=='undefined'?window:globalThis);
