/* CourtIQ Basketball Intelligence layer.
 * Deterministic decision support built on verified box score / PBP evidence.
 * Tactical causation is never inferred from box-score data alone.
 */
(function(root){
  'use strict';
  const base=root.CourtIQGameIntelligence;
  if(!base)return;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>{if(v==null||String(v).trim()==='')return null;const x=Number(String(v).replace(/%$/,''));return Number.isFinite(x)?x:null;};
  const pct=(a,b)=>b>0?100*a/b:null;
  const r1=v=>Number.isFinite(v)?Math.round(v*10)/10:null;
  const fmt=(v,suffix='')=>Number.isFinite(v)?r1(v)+suffix:'—';
  const sideName=(G,side)=>G?.[side]||side;
  const opposite=side=>side==='home'?'away':'home';

  function rawSide(G,side){
    const raw=G?.raw?.[side];
    if(raw)return raw;
    const stats=Array.isArray(G?.stats)?G.stats:[];
    const idx=side==='home'?1:2,out={};
    const map={'Points':'points','Offensive Rebounds':'oreb','Defensive Rebounds':'dreb','Turnovers':'tov','Assists':'ast'};
    for(const row of stats){
      if(!Array.isArray(row))continue;
      const key=map[row[0]];if(key)out[key]=num(row[idx]);
      if(['2P','3P','FT','FG'].includes(row[0])){
        const m=String(row[idx]??'').match(/(\d+)\s*[\/-]\s*(\d+)/);if(!m)continue;
        const [made,attempts]=[Number(m[1]),Number(m[2])];
        if(row[0]==='2P'){out.two_pm=made;out.two_pa=attempts;}
        if(row[0]==='3P'){out.three_pm=made;out.three_pa=attempts;}
        if(row[0]==='FT'){out.ftm=made;out.fta=attempts;}
        if(row[0]==='FG'){out.fgm=made;out.fga=attempts;}
      }
    }
    if(out.fga==null&&out.two_pa!=null&&out.three_pa!=null)out.fga=out.two_pa+out.three_pa;
    if(out.fgm==null&&out.two_pm!=null&&out.three_pm!=null)out.fgm=out.two_pm+out.three_pm;
    return out;
  }

  function factorMap(G){
    const out={};
    (G?.factors||[]).forEach(row=>{if(Array.isArray(row)&&row.length>=3)out[row[0]]={home:num(row[1]),away:num(row[2])};});
    return out;
  }

  function gameSignals(G,focus='home'){
    if(!['home','away'].includes(focus))focus='home';
    const opp=opposite(focus),r=rawSide(G,opp),f=factorMap(G),fga=num(r.fga)??((num(r.two_pa)||0)+(num(r.three_pa)||0)),threePa=num(r.three_pa),ast=num(r.ast),tov=num(r.tov);
    const signals=[];
    const push=(key,label,value,evidence,meaning,priority=0)=>signals.push({key,label,value,evidence,meaning,priority,sample:'1 GAME',confidence:'GAME SIGNAL'});
    const threeRate=fga>0&&threePa!=null?pct(threePa,fga):null;
    if(threeRate!=null)push('3PAR','3-point attempt rate',r1(threeRate),`${threePa}/${fga} FGA were 3PA`,threeRate>=45?'High perimeter shot volume in this game. Verify shot creation and coverage on video.':'Perimeter volume was not extreme in this game.',Math.abs(threeRate-40));
    const efg=f['eFG%']?.[opp];if(efg!=null)push('eFG%','Shot efficiency',efg,`${fmt(efg,'%')} eFG%`,efg>=55?'Efficient shot conversion. Separate shot quality from shot-making before choosing an adjustment.':'Efficiency was contained relative to a 55% review threshold.',Math.abs(efg-52));
    const tovPct=f['TOV%']?.[opp];if(tovPct!=null)push('TOV%','Ball security',tovPct,`${fmt(tovPct,'%')} TOV%`,tovPct<=14?'Opponent protected possessions well in this game.':'Opponent gave away possessions at a reviewable rate.',Math.abs(tovPct-16));
    const orb=f['ORB%']?.[opp];if(orb!=null)push('ORB%','Offensive glass',orb,`${fmt(orb,'%')} ORB%`,orb>=30?'Opponent created notable offensive-rebound pressure.':'Offensive rebounding was not a dominant statistical signal.',Math.abs(orb-28));
    const ftr=f['FTr']?.[opp];if(ftr!=null)push('FTr','Free-throw pressure',ftr,`${fmt(ftr,'%')} FTr`,ftr>=35?'Opponent reached the line frequently relative to field-goal volume.':'Free-throw pressure was moderate or low.',Math.abs(ftr-30));
    if(ast!=null&&tov!=null){const ratio=tov?ast/tov:(ast?Infinity:0);push('ASTTO','Creation security',Number.isFinite(ratio)?r1(ratio):99,`${ast} AST / ${tov} TOV`,ratio>=2?'Strong assist-to-turnover relationship in this game.':'Creation came with meaningful turnover cost.',Number.isFinite(ratio)?Math.abs(ratio-1.5)*6:12);}
    return {focus,opponent:opp,team:sideName(G,opp),signals:signals.sort((a,b)=>b.priority-a.priority).slice(0,5)};
  }

  function lineupGroups(G,side='home'){
    let derived;
    try{derived=root.CourtIQLineupEngine?.derive(G);}catch(_){derived=null;}
    const stints=derived?.lineupStints||[],quality=derived?.quality||{};
    const map=new Map();
    stints.filter(s=>s.side===side&&Array.isArray(s.players)&&s.players.length===5).forEach(s=>{
      const players=[...s.players].sort((a,b)=>String(a).localeCompare(String(b))),key=players.join('||');
      const x=map.get(key)||{players,seconds:0,pointsFor:0,pointsAgainst:0,fgm:0,fga:0,threePm:0,tov:0,stints:0};
      x.seconds+=num(s.seconds)||0;x.pointsFor+=num(s.pointsFor)||0;x.pointsAgainst+=num(s.pointsAgainst)||0;x.fgm+=num(s.fgm)||0;x.fga+=num(s.fga)||0;x.threePm+=num(s.threePm)||0;x.tov+=num(s.tov)||0;x.stints++;map.set(key,x);
    });
    const rows=[...map.values()].filter(x=>x.seconds>=30).map(x=>{
      const minutes=x.seconds/60,net40=minutes>0?(x.pointsFor-x.pointsAgainst)*40/minutes:null,efg=x.fga>0?pct(x.fgm+.5*x.threePm,x.fga):null,tov40=minutes>0?x.tov*40/minutes:null;
      const sample=x.seconds>=300?'HIGHER':x.seconds>=120?'MEDIUM':'LOW';
      return {...x,minutes:r1(minutes),net40:r1(net40),efg:r1(efg),tov40:r1(tov40),sample};
    }).sort((a,b)=>(b.seconds-a.seconds)||((b.net40??-999)-(a.net40??-999)));
    return {rows,quality};
  }

  function bestLineup(G,side='home'){
    const {rows,quality}=lineupGroups(G,side);if(!rows.length)return {row:null,quality};
    const eligible=rows.filter(x=>x.seconds>=120);const pool=eligible.length?eligible:rows;
    const row=[...pool].sort((a,b)=>(b.net40??-999)-(a.net40??-999)||b.seconds-a.seconds)[0];
    return {row,quality};
  }

  function playerVolume(G,side='home'){
    const rows=(G?.players?.[side]||[]).map(p=>{const fga=num(p.fga)??((num(p.two_pa)||0)+(num(p.three_pa)||0));return {...p,_fga:fga,_pts:num(p.points)||0};}).filter(p=>p._fga!=null);
    return rows.sort((a,b)=>b._fga-a._fga||b._pts-a._pts)[0]||null;
  }

  function decisionCards(G,focus='home'){
    const sig=gameSignals(G,focus),cards=[];
    for(const s of sig.signals.slice(0,3)){
      let decision='Review this signal before changing the game plan.',trigger='If the same pattern appears again early, escalate the review.';
      if(s.key==='TOV%'){decision=s.value<=14?'Pressure the opponent’s ball security with video/PBP evidence before increasing risk.':'Protect transition opportunities created by opponent turnovers.';trigger='Track live turnover rate and turnover type, not only the total.';}
      if(s.key==='ORB%'){decision=s.value>=30?'Prioritize a rebounding/transition balance review.':'Keep normal rebounding rules unless video shows missed assignments.';trigger='Track opponent OREB chances and who is involved in the crash.';}
      if(s.key==='eFG%'){decision=s.value>=55?'Audit shot quality conceded before changing coverage.':'Do not overreact to makes/misses alone; verify shot quality.';trigger='Track rim attempts, open 3s and late-clock attempts if PBP/video supports it.';}
      if(s.key==='3PAR'){decision=s.value>=45?'Prepare a perimeter-volume review and identify where the 3PA came from.':'No automatic perimeter adjustment from this game alone.';trigger='Track 3PA rate and location/creator on video.';}
      if(s.key==='FTr'){decision=s.value>=35?'Review foul-drawing possessions and defender discipline.':'Keep free-throw pressure on the watchlist, not as a primary adjustment.';trigger='Track shooting fouls and paint attacks separately.';}
      cards.push({title:s.label,evidence:s.evidence,decision,trigger,confidence:s.confidence});
    }
    return cards;
  }

  function ask(G,focus,question){
    const q=String(question||'').trim().toLowerCase();if(!q)return 'Ask about lineups, turnovers, shooting, rebounding, starters, a player, or what to watch.';
    const opp=opposite(focus),fm=factorMap(G),r=rawSide(G,focus),or=rawSide(G,opp);
    if(/lineup|five|חמיש|הרכב/.test(q)){
      const b=bestLineup(G,focus);if(!b.row)return 'No certified five-player lineup sample is available from the current play-by-play.';
      return `${sideName(G,focus)}: best available lineup sample by point margin per 40 is ${b.row.players.join(', ')} · ${b.row.minutes} min · ${b.row.pointsFor}-${b.row.pointsAgainst} · ${fmt(b.row.net40)} net pts/40. Sample: ${b.row.sample}. This is descriptive, not proof of chemistry.`;
    }
    if(/turnover|tov|איבוד/.test(q))return `${sideName(G,focus)}: ${num(r.tov)??'—'} turnovers${fm['TOV%']?.[focus]!=null?` · ${fmt(fm['TOV%'][focus],'%')} TOV%`:''}. ${sideName(G,opp)}: ${num(or.tov)??'—'} turnovers${fm['TOV%']?.[opp]!=null?` · ${fmt(fm['TOV%'][opp],'%')} TOV%`:''}. Review turnover type before assigning a tactical cause.`;
    if(/three|3p|שלש|שלוש/.test(q)){
      const fga=num(r.fga)??((num(r.two_pa)||0)+(num(r.three_pa)||0)),pa=num(r.three_pa),pm=num(r.three_pm);return `${sideName(G,focus)}: ${pm??'—'}/${pa??'—'} from 3. ${fga>0&&pa!=null?`${fmt(pct(pa,fga),'%')} of FGA were 3PA.`:''}`;
    }
    if(/rebound|orb|ריבאונד/.test(q))return `${sideName(G,focus)} ORB%: ${fm['ORB%']?.[focus]!=null?fmt(fm['ORB%'][focus],'%'):'—'} · ${sideName(G,opp)} ORB%: ${fm['ORB%']?.[opp]!=null?fmt(fm['ORB%'][opp],'%'):'—'}. Use video to separate scheme, effort and matchup effects.`;
    if(/starter|פתח|חמישייה פותחת/.test(q)){
      const s=base.starters?.(G,focus);return s?.names?.length===5?`${sideName(G,focus)} starters (${s.source}): ${s.names.join(', ')}.`:'Starting five is not verified for this game.';
    }
    if(/player|shot most|volume|שחק|זרק/.test(q)){
      const p=playerVolume(G,focus);return p?`${p.name} had the highest verified field-goal attempt volume for ${sideName(G,focus)}: ${p._fga} FGA and ${p._pts} points. Attempt volume alone does not establish role or impact.`:'Verified player shooting rows are not available.';
    }
    if(/watch|decision|coach|מה לבדוק|מה לראות|החלט/.test(q)){
      const cards=decisionCards(G,focus);return cards.length?cards.map((x,i)=>`${i+1}. ${x.title}: ${x.evidence}. ${x.trigger}`).join(' '):'No decision-support signal is available from the verified data.';
    }
    if(/opponent|יריב|נטי/.test(q)){
      const s=gameSignals(G,focus);return s.signals.slice(0,3).map((x,i)=>`${i+1}. ${x.label}: ${x.evidence}. ${x.meaning}`).join(' ');
    }
    return 'I can answer deterministically from this game about: best available lineup, turnovers, 3-point volume, rebounding, starters, player shot volume, opponent signals, and what the coach should watch. Tactical “why” questions still need PBP/video evidence.';
  }

  function signalCards(signals){
    return signals.map((s,i)=>`<article class="biCard"><div class="biCardTop"><span>${i+1}</span><small>${esc(s.confidence)}</small></div><h4>${esc(s.label)}</h4><b>${esc(s.evidence)}</b><p>${esc(s.meaning)}</p><em>${esc(s.sample)} · VIDEO/PBP FOR CAUSATION</em></article>`).join('');
  }

  function lineupHtml(G,focus){
    const x=lineupGroups(G,focus);if(!x.rows.length)return '<div class="biEmpty"><b>NO CERTIFIED LINEUP SAMPLE</b><span>Complete play-by-play with verified on-court five-player intervals is required.</span></div>';
    return x.rows.slice(0,5).map((r,i)=>`<article class="biLineup"><div class="biRank">${i+1}</div><div><b>${r.players.map(esc).join(' · ')}</b><small>${r.minutes} min · ${r.stints} stint${r.stints===1?'':'s'} · SAMPLE ${r.sample}</small></div><div class="biLineupMetrics"><span><small>PF–PA</small><b>${r.pointsFor}–${r.pointsAgainst}</b></span><span><small>NET /40</small><b>${fmt(r.net40)}</b></span><span><small>eFG%</small><b>${fmt(r.efg,'%')}</b></span><span><small>TOV /40</small><b>${fmt(r.tov40)}</b></span></div></article>`).join('')+`<p class="metricNote">Lineup Chemistry is presented as a factual evidence profile, not an arbitrary composite score. PBP status: ${esc(x.quality?.status||'UNKNOWN')}.</p>`;
  }

  function decisionsHtml(G,focus){const rows=decisionCards(G,focus);return rows.length?rows.map((d,i)=>`<article class="biDecision"><header><span>DECISION ${i+1}</span><small>${esc(d.confidence)}</small></header><h4>${esc(d.title)}</h4><b>${esc(d.evidence)}</b><p><strong>Decision test:</strong> ${esc(d.decision)}</p><p><strong>Live trigger:</strong> ${esc(d.trigger)}</p></article>`).join(''):'<div class="biEmpty"><b>INSUFFICIENT VERIFIED DATA</b><span>Import a complete official box score to build decision tests.</span></div>';}

  function renderAddon(G,focus='home',interactive=true){
    if(!G)return '';
    if(!['home','away'].includes(focus))focus='home';
    const s=gameSignals(G,focus);
    return `<section class="basketballIntelV1" data-bi-focus="${focus}">
      <div class="biHero"><div><small>COURTIQ · BASKETBALL INTELLIGENCE</small><h3>Evidence → Tendencies → Decisions</h3><p>Game-level facts are separated from season tendencies and tactical causation.</p></div>${interactive?`<label>FOCUS TEAM<select class="biFocus"><option value="home" ${focus==='home'?'selected':''}>${esc(G.home)}</option><option value="away" ${focus==='away'?'selected':''}>${esc(G.away)}</option></select></label>`:''}</div>
      <div class="biSection"><div class="sectionhead"><div><small>01 · OPPONENT SIGNALS</small><h3>${esc(s.team)} · what showed up in this game</h3></div><span class="intelBadge biSeasonBadge">1 GAME · NOT A SEASON TENDENCY</span></div><div class="biGrid biSignals">${signalCards(s.signals)}</div><div class="biSeasonIntel" aria-live="polite"></div></div>
      <div class="biSection"><div class="sectionhead"><div><small>02 · COACH DECISION CENTER</small><h3>Decision tests · not automatic prescriptions</h3></div><span class="intelBadge">VERIFY → DECIDE</span></div><div class="biGrid biDecisions">${decisionsHtml(G,focus)}</div></div>
      <div class="biSection"><div class="sectionhead"><div><small>03 · LINEUP CHEMISTRY</small><h3>${esc(sideName(G,focus))} · certified five-player evidence</h3></div><span class="intelBadge">PBP ONLY</span></div><div class="biLineups">${lineupHtml(G,focus)}</div></div>
      <div class="biSection biAsk"><div class="sectionhead"><div><small>04 · ASK COURTIQ</small><h3>Ask the current game</h3></div><span class="intelBadge">DETERMINISTIC V1</span></div>${interactive?`<div class="biAskBar"><input class="biAskInput" type="text" placeholder="e.g. best lineup / turnovers / מה לבדוק"><button type="button" class="importBtn biAskRun">ASK</button></div><div class="biAskChips"><button type="button" data-bi-q="best lineup">Best lineup</button><button type="button" data-bi-q="opponent tendencies">Opponent signals</button><button type="button" data-bi-q="turnovers">Turnovers</button><button type="button" data-bi-q="what should coach watch">What to watch</button></div>`:''}<div class="biAnswer" aria-live="polite">Ask a question using verified game data. CourtIQ will say when the evidence is insufficient.</div></div>
    </section>`;
  }

  async function loadSeasonIntel(G,focus,card){
    const box=card.querySelector('.biSeasonIntel'),badge=card.querySelector('.biSeasonBadge');if(!box)return;
    const data=root.CourtIQData,opp=sideName(G,opposite(focus));
    if(!data?.opponentScout||!data?.isSignedIn?.()){box.innerHTML='<p class="metricNote">Season layer unavailable in this session. Showing current-game signals only.</p>';return;}
    box.innerHTML='<p class="metricNote">Checking saved season memory…</p>';
    try{
      const s=await data.opponentScout(G.comp||G.competition||'',opp),q=s?.quality||{},t=(s?.tendencies||[]).filter(x=>x.season!=null&&x.last5!=null).sort((a,b)=>Math.abs(Number(b.delta||0))-Math.abs(Number(a.delta||0))).slice(0,3);
      if(!t.length){box.innerHTML='<p class="metricNote">No multi-game tendency has enough verified saved data yet.</p>';return;}
      if(badge)badge.textContent=`${s.games||0} GAMES · ${q.status||'SEASON MEMORY'}`;
      box.innerHTML='<div class="biSeasonTitle"><b>SEASON MEMORY · VERIFIED TREND LAYER</b><span>Last 5 vs season</span></div><div class="biGrid">'+t.map(x=>`<article class="biCard"><small>${esc(x.area||'TREND')}</small><h4>${esc(x.area||'Trend')}</h4><b>Last 5 ${esc(x.last5)} · Season ${esc(x.season)}</b><p>Δ ${Number(x.delta)>=0?'+':''}${esc(x.delta)} · ${esc(x.sample_games||s.games||0)} game sample</p><em>MULTI-GAME SIGNAL · VERIFY CONTEXT</em></article>`).join('')+'</div>';
    }catch(e){box.innerHTML='<p class="metricNote">Season memory could not be loaded: '+esc(e.message||'unknown error')+'</p>';}
  }

  function mountAddon(G,scope=root.document){
    if(!scope?.querySelectorAll)return;
    scope.querySelectorAll('.basketballIntelV1').forEach(card=>{
      if(card.dataset.biMounted==='1')return;card.dataset.biMounted='1';
      let focus=card.dataset.biFocus||'home';
      const rerender=next=>{focus=next;const fresh=document.createElement('div');fresh.innerHTML=renderAddon(G,focus,true);const replacement=fresh.firstElementChild;card.replaceWith(replacement);mountAddon(G,scope);};
      const select=card.querySelector('.biFocus');if(select)select.onchange=()=>rerender(select.value);
      const input=card.querySelector('.biAskInput'),answer=card.querySelector('.biAnswer');
      const run=q=>{if(input&&q!=null)input.value=q;if(answer)answer.textContent=ask(G,focus,input?.value||q||'');};
      card.querySelector('.biAskRun')?.addEventListener('click',()=>run());
      input?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();run();}});
      card.querySelectorAll('[data-bi-q]').forEach(btn=>btn.addEventListener('click',()=>run(btn.dataset.biQ)));
      loadSeasonIntel(G,focus,card);
    });
  }

  const originalRender=base.render.bind(base),originalMount=base.mount.bind(base);
  function render(G,side='',interactive=true){return originalRender(G,side,interactive)+renderAddon(G,['home','away'].includes(side)?side:'home',interactive);}
  function mount(G,scope=root.document,...args){const out=originalMount(G,scope,...args);mountAddon(G,scope);return out;}

  root.CourtIQGameIntelligence={...base,render,mount,gameSignals,lineupGroups,bestLineup,decisionCards,ask,renderAddon,mountAddon};
})(typeof window!=='undefined'?window:globalThis);
