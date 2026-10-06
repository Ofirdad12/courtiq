/* CourtIQ Live Bench v181 · read-only in-game decision support + auto-synced PBP intelligence. */
(function(root){
  'use strict';
  const SUPABASE_URL='https://lgzfmoioecixmnivtqan.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_LTCc5iEgOzrH7t8bxvxwOA_aWsHoY8l';
  const SESSION_KEY='courtiq_supabase_session';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const num=v=>{const x=Number(String(v??'').replace(/%$/,''));return Number.isFinite(x)?x:null;};
  const clockSeconds=v=>{const m=String(v||'').match(/(\d+):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null;};
  const score=v=>{const m=String(v||'').match(/(\d+)\s*[-:–]\s*(\d+)/);return m?[Number(m[1]),Number(m[2])]:null;};
  const eventList=G=>Array.isArray(G?.playByPlay)?G.playByPlay:Array.isArray(G?.play_by_play)?G.play_by_play:[];
  const factorMap=G=>Object.fromEntries((G?.factors||[]).filter(Array.isArray).map(r=>[r[0],{home:num(r[1]),away:num(r[2])}]));
  const readSession=()=>{try{return JSON.parse(root.localStorage?.getItem(SESSION_KEY)||'null');}catch(_){return null;}};
  const sideName=(G,s)=>G?.[s]||s;
  const other=s=>s==='home'?'away':'home';

  function latestEvent(G){
    return eventList(G).map((e,i)=>({...e,_i:i,_s:clockSeconds(e.clock)})).filter(e=>Number(e.period)>0&&e._s!=null)
      .sort((a,b)=>Number(b.period)-Number(a.period)||a._s-b._s||b._i-a._i)[0]||null;
  }
  function scoreOrientation(G){
    const rows=eventList(G).map(e=>score(e.score)).filter(Boolean);if(!rows.length)return null;
    const s=rows[rows.length-1],hs=num(G.hs),as=num(G.as);if(hs==null||as==null)return null;
    if(s[0]===hs&&s[1]===as)return 0;if(s[1]===hs&&s[0]===as)return 1;return null;
  }
  function normalizedScore(pair,orientation){return !pair?null:orientation===1?[pair[1],pair[0]]:orientation===0?pair:null;}
  function recentRun(G,minutes=5){
    const latest=latestEvent(G),orientation=scoreOrientation(G);if(!latest||orientation==null)return null;
    const period=Number(latest.period),now=clockSeconds(latest.clock);if(now==null)return null;
    const duration=period<=4?600:300,target=Math.min(duration,now+minutes*60);
    const rows=eventList(G).filter(e=>Number(e.period)===period&&score(e.score)&&clockSeconds(e.clock)!=null)
      .map(e=>({sec:clockSeconds(e.clock),score:normalizedScore(score(e.score),orientation)}));
    if(!rows.length)return null;
    const current=normalizedScore(score(latest.score),orientation)||[num(G.hs)||0,num(G.as)||0];
    const candidates=rows.filter(x=>x.sec>=target).sort((a,b)=>a.sec-b.sec);
    const base=(candidates[0]||[...rows].sort((a,b)=>b.sec-a.sec)[0])?.score;if(!base)return null;
    return {period,minutes:Math.max(0,Math.round((Math.min(target,duration)-now)/60*10)/10),home:current[0]-base[0],away:current[1]-base[1],current,base};
  }
  function latestCertifiedLineup(G,side){
    let d;try{d=root.CourtIQLineupEngine?.derive?.(G);}catch(_){return null;}
    const rows=(d?.lineupStints||[]).filter(x=>x.side===side&&Array.isArray(x.players)&&x.players.length===5);
    if(!rows.length)return {row:null,quality:d?.quality||{}};
    const row=[...rows].sort((a,b)=>Number(b.period)-Number(a.period)||(clockSeconds(a.endClock)??9999)-(clockSeconds(b.endClock)??9999))[0];
    return {row,quality:d?.quality||{}};
  }
  function snapshot(G,focus='home'){
    const e=latestEvent(G),f=factorMap(G),lh=latestCertifiedLineup(G,'home'),la=latestCertifiedLineup(G,'away');
    return {hs:num(G.hs)||0,as:num(G.as)||0,eventCount:eventList(G).length,period:Number(e?.period||0),clock:String(e?.clock||''),focus,factors:Object.fromEntries(Object.entries(f).map(([k,v])=>[k,v?.[focus]??null])),homeLineup:lh?.row?.players||null,awayLineup:la?.row?.players||null,homeQuality:lh?.quality?.status||'UNKNOWN',awayQuality:la?.quality?.status||'UNKNOWN'};
  }
  const sameFive=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===5&&b.length===5&&[...a].sort().join('|')===[...b].sort().join('|');
  function compareSnapshots(prev,next){
    if(!prev)return [{kind:'baseline',text:'Baseline snapshot created. Changes will appear after the next refresh.'}];
    const out=[],dh=next.hs-prev.hs,da=next.as-prev.as,de=next.eventCount-prev.eventCount;
    if(dh||da)out.push({kind:'score',text:`Score since last refresh: home ${dh>=0?'+':''}${dh} · away ${da>=0?'+':''}${da}.`});
    if(de>0)out.push({kind:'events',text:`${de} new play-by-play event${de===1?'':'s'} received.`});
    if(prev.period!==next.period||prev.clock!==next.clock)out.push({kind:'clock',text:`Feed moved to ${next.period>4?'OT'+(next.period-4):'Q'+next.period} ${next.clock||'—'}.`});
    if(prev.homeLineup&&next.homeLineup&&!sameFive(prev.homeLineup,next.homeLineup))out.push({kind:'lineup',side:'home',text:'Home latest certified five changed.'});
    if(prev.awayLineup&&next.awayLineup&&!sameFive(prev.awayLineup,next.awayLineup))out.push({kind:'lineup',side:'away',text:'Away latest certified five changed.'});
    for(const key of ['eFG%','TOV%','ORB%','FTr']){const a=prev.factors?.[key],b=next.factors?.[key];if(a!=null&&b!=null&&Math.abs(b-a)>=1)out.push({kind:'factor',factor:key,text:`${key}: ${(b-a)>=0?'+':''}${Math.round((b-a)*10)/10} pts since previous snapshot.`});}
    return out.length?out:[{kind:'steady',text:'No material statistical change since the previous valid snapshot.'}];
  }
  function fallbackPriorities(G,focus){
    const opp=other(focus),f=factorMap(G),cards=[];
    const add=(title,evidence,watch)=>cards.push({title,evidence,trigger:watch});
    if(f['TOV%']?.[focus]!=null)add('Ball security',`${sideName(G,focus)} ${f['TOV%'][focus]}% TOV%`,'Track turnover type and whether it creates transition.');
    if(f['ORB%']?.[opp]!=null)add('Defensive glass',`${sideName(G,opp)} ${f['ORB%'][opp]}% ORB%`,'Track opponent crashers and missed box-outs.');
    if(f['eFG%']?.[opp]!=null)add('Shot quality allowed',`${sideName(G,opp)} ${f['eFG%'][opp]}% eFG%`,'Separate open/rim attempts from difficult makes before changing coverage.');
    return cards.slice(0,3);
  }
  function priorities(G,focus){try{return root.CourtIQGameIntelligence?.decisionCards?.(G,focus)||fallbackPriorities(G,focus);}catch(_){return fallbackPriorities(G,focus);}}

  async function preview(url,retry=true){
    const session=readSession();if(!session?.access_token)throw new Error('Sign in to CourtIQ before starting Live Bench.');
    const res=await fetch(SUPABASE_URL+'/functions/v1/live-game-preview',{method:'POST',headers:{apikey:PUBLISHABLE_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({url})});
    let body=null;try{body=await res.json();}catch(_){}
    if(res.status===401&&retry&&root.CourtIQData?.refreshSession){const fresh=await root.CourtIQData.refreshSession();if(fresh)return preview(url,false);}
    if(!res.ok)throw new Error(body?.error||body?.message||'Live preview failed.');return body;
  }

  function renderLineup(G,side){const x=latestCertifiedLineup(G,side),r=x?.row,q=x?.quality||{};if(!r)return `<div class="lbEmpty"><b>Lineup unavailable</b><span>PBP does not yet establish five players with enough certainty.</span></div>`;return `<div class="lbLineup"><b>${r.players.map(esc).join(' · ')}</b><span>${sideName(G,side)} · latest certified interval · ${esc(q.status||'UNKNOWN')}</span></div>`;}
  function renderChanges(changes){return changes.map(x=>`<div class="lbChange lb-${esc(x.kind)}"><span>•</span><p>${esc(x.text)}</p></div>`).join('');}
  function renderPriorities(G,focus){const rows=priorities(G,focus);return rows.length?rows.slice(0,3).map((x,i)=>`<article><small>TIMEOUT CHECK ${i+1}</small><h4>${esc(x.title)}</h4><b>${esc(x.evidence||'Verified game signal')}</b><p>${esc(x.trigger||x.decision||'Verify the underlying possessions before adjusting.')}</p></article>`).join(''):'<div class="lbEmpty"><b>No priority signal yet</b><span>More verified game data is needed.</span></div>';}
  function renderRun(G){const r=recentRun(G,5);if(!r)return '<div class="lbEmpty"><b>5-minute run unavailable</b><span>A verified score sequence in play-by-play is required.</span></div>';return `<div class="lbRun"><span>${esc(sideName(G,'home'))}<b>${r.home>=0?'+':''}${r.home}</b></span><em>last ~${r.minutes} min · ${r.period>4?'OT'+(r.period-4):'Q'+r.period}</em><span>${esc(sideName(G,'away'))}<b>${r.away>=0?'+':''}${r.away}</b></span></div>`;}
  function coachBrief(G,focus,prevGame){try{return root.CourtIQLiveCoachIntelligence?.coachBrief?.(G,focus,prevGame)||{alerts:[],team:[],players:[]};}catch(_){return {alerts:[],team:[],players:[]};}}
  function renderAlerts(rows){if(!rows?.length)return '<div class="lbNoAlert"><b>NO ACTIVE ALERT</b><span>No live threshold currently requires escalation.</span></div>';return rows.map(x=>`<article class="lbAlert lbAlert-${esc(String(x.severity||'WATCH').toLowerCase())}"><div><small>${esc(x.severity||'WATCH')} · ${esc(x.scope||'TEAM')}</small><h4>${esc(x.title)}</h4></div><b>${esc(x.evidence)}</b><p>${esc(x.coachCheck)}</p></article>`).join('');}
  function renderConclusionCards(rows,kind){if(!rows?.length)return '<div class="lbEmpty"><b>No conclusion yet</b><span>More verified live data is required.</span></div>';return rows.map(x=>`<article class="lbConclusion"><div class="lbConclusionTop"><small>${esc(x.level||'INFO')}${kind==='player'?' · '+esc(x.player||'PLAYER'):''}</small><span>${esc(x.sample||'live sample')}</span></div><h4>${esc(x.title)}</h4><b>${esc(x.evidence)}</b><p><strong>Coach check:</strong> ${esc(x.coachCheck)}</p></article>`).join('');}
  function renderLivePbp(G){
    const count=eventList(G).length,engine=root.CourtIQPlayByPlay;
    if(!count)return '<section class="lbLivePbp"><div class="lbHead"><small>LIVE PBP · AUTO-SYNC</small><h3>Play-by-Play Command Center</h3></div><div class="lbEmpty"><b>No live PBP events yet</b><span>The panel will populate automatically when the official source publishes events.</span></div></section>';
    if(!engine?.render)return '<section class="lbLivePbp"><div class="lbHead"><small>LIVE PBP · AUTO-SYNC</small><h3>Play-by-Play Command Center</h3></div><div class="lbEmpty"><b>PBP engine unavailable</b><span>Refresh CourtIQ to load the event-intelligence module.</span></div></section>';
    try{return `<section class="lbLivePbp"><div class="lbLivePbpTop"><div class="lbHead"><small>LIVE PBP · AUTO-SYNC</small><h3>Play-by-Play Command Center</h3></div><span>${count} events · recalculated every valid refresh</span></div><div class="lbPbpMount">${engine.render(G)}</div><p class="metricNote">Runs, lead changes, turnover bursts, clutch windows and player pulse are recalculated from the newest valid live snapshot. Tactical causation still requires possession/video context.</p></section>`;}catch(_){return '<section class="lbLivePbp"><div class="lbEmpty"><b>Live PBP could not render</b><span>The rest of Live Bench remains available and the previous valid snapshot is kept.</span></div></section>';}
  }
  function mountLivePbp(G,scope){const host=scope?.querySelector?.('.lbPbpMount');if(!host||!root.CourtIQPlayByPlay?.mount)return null;try{return root.CourtIQPlayByPlay.mount(G,host);}catch(_){return null;}}

  function open(){
    if(!root.document)return;document.querySelector('.liveBenchModal')?.remove();
    const modal=document.createElement('div');modal.className='modal liveBenchModal';let game=null,prev=null,prevGame=null,timer=null,busy=false,focus='home';
    const stop=()=>{if(timer){clearInterval(timer);timer=null;}modal.querySelector('.lbAuto')?.classList.remove('active');const s=modal.querySelector('.lbAutoState');if(s)s.textContent='AUTO OFF';};
    modal.innerHTML=`<div class="modalCard liveBenchCard"><button class="modalX">×</button><div class="lbHero"><div><small>COURTIQ · LIVE BENCH V181</small><h2>In-Game Decision Desk</h2><p>Read-only live preview with auto-synced Play-by-Play intelligence.</p></div><span class="lbLiveDot">● LIVE PREVIEW</span></div><div class="lbControls"><input class="lbUrl" type="url" placeholder="Official IBBA or FIBA LiveStats / Genius Sports game URL"><select class="lbFocus" disabled><option value="home">Home</option><option value="away">Away</option></select><select class="lbInterval"><option value="30">30 sec</option><option value="45" selected>45 sec</option><option value="60">60 sec</option><option value="90">90 sec</option></select><button class="runImport lbRefresh">REFRESH NOW</button><button class="importBtn lbAuto">START AUTO</button><span class="lbAutoState">AUTO OFF</span></div><div class="lbStatus">Paste the official live game URL, then refresh.</div><div class="lbBody"><div class="lbEmpty"><b>Waiting for live data</b><span>Supported: IBBA + FIBA LiveStats / Genius Sports.</span></div></div></div>`;
    document.body.appendChild(modal);const url=modal.querySelector('.lbUrl'),body=modal.querySelector('.lbBody'),status=modal.querySelector('.lbStatus'),focusSel=modal.querySelector('.lbFocus'),auto=modal.querySelector('.lbAuto');
    const active=root.CourtIQActiveGame;if(active?.sourceUrl)url.value=active.sourceUrl;
    const draw=(changes=[])=>{if(!game)return;const e=latestEvent(game),q=e?.period?(e.period>4?'OT'+(e.period-4):'Q'+e.period):'—',cards=renderPriorities(game,focus),brief=coachBrief(game,focus,prevGame);focusSel.disabled=false;focusSel.innerHTML=`<option value="home" ${focus==='home'?'selected':''}>${esc(game.home)}</option><option value="away" ${focus==='away'?'selected':''}>${esc(game.away)}</option>`;body.innerHTML=`<section class="lbScore"><div><small>${esc(q)} · ${esc(e?.clock||'—')}</small><h3>${esc(game.home)} <b>${esc(game.hs)}–${esc(game.as)}</b> ${esc(game.away)}</h3><span>${eventList(game).length} PBP events · ${esc(game.live?.provider||'LIVE SOURCE')}</span></div><div class="lbQuality"><small>SNAPSHOT</small><b>${esc(game.live?.quality||'VALID')}</b><span>not final · not saved</span></div></section><section class="lbAlertSection"><div class="lbHead"><small>TIMEOUT ALERT ENGINE</small><h3>What needs attention now</h3></div><div class="lbAlerts">${renderAlerts(brief.alerts)}</div><p class="metricNote">Alerts are threshold-based signals. They do not claim tactical causation without possession context.</p></section><div class="lbGrid"><section><div class="lbHead"><small>WHAT CHANGED</small><h3>Since last refresh</h3></div>${renderChanges(changes)}</section><section><div class="lbHead"><small>MOMENTUM WINDOW</small><h3>Recent score run</h3></div>${renderRun(game)}</section></div><section class="lbCoachConclusions"><div class="lbHead"><small>COACH CONCLUSIONS · TEAM</small><h3>${esc(sideName(game,focus))}</h3></div><div class="lbConclusionGrid">${renderConclusionCards(brief.team,'team')}</div></section><section class="lbCoachConclusions"><div class="lbHead"><small>COACH CONCLUSIONS · PLAYERS</small><h3>Individual live signals</h3></div><div class="lbConclusionGrid lbPlayerGrid">${renderConclusionCards(brief.players,'player')}</div><p class="metricNote">Player conclusions use the current live sample and recent snapshot changes. They are not projections and should be checked against role, matchup and video.</p></section>${renderLivePbp(game)}<section><div class="lbHead"><small>ON-COURT EVIDENCE</small><h3>Latest certified five</h3></div><div class="lbGrid">${renderLineup(game,'home')}${renderLineup(game,'away')}</div></section><section><div class="lbHead"><small>NEXT TIMEOUT</small><h3>3 things to verify</h3></div><div class="lbPriorities">${cards}</div><p class="metricNote">These are decision tests from verified live data, not tactical causes. Use video/PBP context before changing coverage or assignments.</p></section><section class="lbAsk"><div class="lbHead"><small>ASK COURTIQ LIVE</small><h3>Ask the current snapshot</h3></div><div class="lbAskBar"><input class="lbAskInput" placeholder="best lineup / turnovers / what should coach watch"><button class="importBtn lbAskRun">ASK</button></div><div class="lbAnswer">Answers use only the current verified snapshot.</div></section>`;
      mountLivePbp(game,body);
      const askInput=body.querySelector('.lbAskInput'),answer=body.querySelector('.lbAnswer');const ask=()=>{try{answer.textContent=root.CourtIQGameIntelligence?.ask?.(game,focus,askInput.value)||'Ask CourtIQ is unavailable in this build.';}catch(e){answer.textContent=e.message;}};body.querySelector('.lbAskRun')?.addEventListener('click',ask);askInput?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();ask();}});
    };
    const sync=async()=>{if(busy)return;const source=url.value.trim();if(!source){status.textContent='Paste an official live game URL first.';return;}busy=true;status.textContent='Refreshing official live source…';try{const result=await preview(source),next=result.ui,nextSnap=snapshot(next,focus),changes=compareSnapshots(prev,nextSnap),priorGame=game;prevGame=priorGame;game=next;prev=nextSnap;draw(changes);status.textContent=`LIVE SNAPSHOT · ${new Date(result.refreshed_at||Date.now()).toLocaleTimeString()} · ${eventList(game).length} PBP events · read-only`; }catch(e){status.textContent='LIVE DATA · '+e.message+' Previous valid snapshot is kept.';}finally{busy=false;}};
    modal.querySelector('.lbRefresh').onclick=sync;auto.onclick=()=>{if(timer){stop();auto.textContent='START AUTO';return;}const seconds=Math.max(30,Number(modal.querySelector('.lbInterval').value)||45);sync();timer=setInterval(sync,seconds*1000);auto.classList.add('active');auto.textContent='STOP AUTO';modal.querySelector('.lbAutoState').textContent='AUTO '+seconds+'s';};
    focusSel.onchange=()=>{focus=focusSel.value;prev=game?snapshot(game,focus):null;prevGame=null;draw([{kind:'focus',text:'Focus team changed. A new comparison baseline was created.'}]);};
    modal.querySelector('.modalX').onclick=()=>{stop();modal.remove();};modal.onclick=e=>{if(e.target===modal){stop();modal.remove();}};
  }
  function ensureButton(){if(!root.document||document.getElementById('liveBenchBtn'))return;const btn=document.createElement('button');btn.id='liveBenchBtn';btn.type='button';btn.className='liveBenchLaunch';btn.innerHTML='<span>●</span> LIVE BENCH';btn.onclick=open;const host=document.querySelector('.pills')||document.querySelector('.clubbar')||document.body;host.appendChild(btn);}
  function install(){ensureButton();const app=document.getElementById('app');if(app&&root.MutationObserver)new MutationObserver(()=>ensureButton()).observe(app,{childList:true,subtree:true});}
  const api={clockSeconds,score,eventList,latestEvent,scoreOrientation,recentRun,snapshot,compareSnapshots,latestCertifiedLineup,priorities,coachBrief,renderLivePbp,mountLivePbp,preview,open,install};root.CourtIQLiveBench=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root.document){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();}
})(typeof window!=='undefined'?window:globalThis);