(function(root){
  'use strict';
  if(!root.CourtIQGameIntelligence)return;
  const base=root.CourtIQGameIntelligence;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n=v=>{const x=Number(String(v??'').replace(/%$/,''));return Number.isFinite(x)?x:null;};
  const meta={
    'eFG%':{label:'Shot efficiency',better:'higher',action:'Review shot quality, contest level and whether the same looks are repeatable.'},
    'TOV%':{label:'Ball security',better:'lower',action:'Review turnover type, handler and pressure source before choosing an adjustment.'},
    'ORB%':{label:'Offensive glass',better:'higher',action:'Review crash/retreat balance and which matchups created extra possessions.'},
    'FTr':{label:'Free-throw pressure',better:'higher',action:'Review paint touches, closeouts and foul-drawing actions behind the rate.'}
  };
  const round=(x,d=1)=>Number.isFinite(x)?Number(x.toFixed(d)):null;
  function factorData(G,side){
    if(!['home','away'].includes(side))return [];
    const opp=side==='home'?'away':'home';
    return (G.factors||[]).filter(r=>meta[r[0]]).map(r=>{
      const key=r[0], own=n(r[side==='home'?1:2]), other=n(r[side==='home'?2:1]), m=meta[key];
      if(own==null||other==null)return null;
      const good=m.better==='lower'?own<other:own>other;
      return {key,label:m.label,own,other,gap:Math.abs(own-other),good,action:m.action,team:G[side],opponent:G[opp]};
    }).filter(Boolean).sort((a,b)=>b.gap-a.gap);
  }
  function savedGames(){
    try{
      if(typeof games==='undefined')return [];
      return Object.values(games).filter(g=>g&&g._dbId&&g.home&&g.away);
    }catch(_){return [];}
  }
  function metricFromGame(g,team,key){
    const side=g.home===team?'home':g.away===team?'away':null;if(!side)return null;
    const row=(g.factors||[]).find(r=>r[0]===key);if(!row)return null;
    return n(row[side==='home'?1:2]);
  }
  function trendData(G,side){
    if(!['home','away'].includes(side))return {games:0,items:[]};
    const team=G[side], rows=savedGames().filter(g=>(g.home===team||g.away===team)&&(!G.comp||!g.comp||g.comp===G.comp));
    const recent=rows.slice(-5), prior=rows.slice(-10,-5), avg=(arr,key)=>{const v=arr.map(g=>metricFromGame(g,team,key)).filter(Number.isFinite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;};
    const items=Object.keys(meta).map(key=>{const a=avg(recent,key),b=avg(prior,key);if(a==null)return null;const delta=b==null?null:a-b;return {key,label:meta[key].label,recent:round(a),prior:round(b),delta:round(delta),sample:recent.length};}).filter(Boolean);
    return {games:rows.length,items:items.sort((a,b)=>Math.abs(b.delta||0)-Math.abs(a.delta||0))};
  }
  function lineupData(G,side){
    if(!['home','away'].includes(side)||!root.CourtIQLineupEngine?.derive)return {status:'UNAVAILABLE',rows:[]};
    try{
      const d=root.CourtIQLineupEngine.derive(G), q=d?.quality||{}, stints=(d?.lineupStints||[]).filter(x=>x.side===side);
      if(!stints.length)return {status:q.status||'UNAVAILABLE',rows:[],quality:q};
      const map=new Map();
      for(const s of stints){
        const key=[...(s.players||[])].sort((a,b)=>a.localeCompare(b)).join('||');if(!key)continue;
        const r=map.get(key)||{players:s.players||[],seconds:0,pf:0,pa:0,stints:0};
        r.seconds+=Number(s.seconds||0);r.pf+=Number(s.pointsFor||0);r.pa+=Number(s.pointsAgainst||0);r.stints++;map.set(key,r);
      }
      const rows=[...map.values()].filter(r=>r.seconds>=60).map(r=>({...r,margin:r.pf-r.pa,margin40:round((r.pf-r.pa)*2400/r.seconds),minutes:round(r.seconds/60)})).sort((a,b)=>b.margin40-a.margin40);
      return {status:q.status||'PARTIAL',rows,quality:q};
    }catch(e){return {status:'UNAVAILABLE',rows:[],error:e.message};}
  }
  function decisionData(G,side){
    if(!['home','away'].includes(side))return [];
    const f=factorData(G,side), negatives=f.filter(x=>!x.good), positives=f.filter(x=>x.good), out=[];
    if(negatives[0])out.push({type:'PRIORITY',title:'First review priority',headline:negatives[0].label,evidence:`${negatives[0].own}% vs ${negatives[0].other}%`,action:negatives[0].action,view:'team',factor:negatives[0].key});
    if(positives[0])out.push({type:'KEEP',title:'Protect this advantage',headline:positives[0].label,evidence:`${positives[0].own}% vs ${positives[0].other}%`,action:'Verify on video what created this edge and whether it can be reproduced against the next opponent.',view:'team',factor:positives[0].key});
    const lineups=lineupData(G,side).rows;
    if(lineups[0])out.push({type:'LINEUP',title:'Lineup signal',headline:lineups[0].players.join(' · '),evidence:`${lineups[0].minutes} min · ${lineups[0].margin>=0?'+':''}${lineups[0].margin} points · ${lineups[0].margin40>=0?'+':''}${lineups[0].margin40}/40`,action:'Treat this as a descriptive lineup signal. Review opponent quality, game state and possessions before changing the rotation.',view:'lineups'});
    return out;
  }
  function sampleLabel(count){return count>=5?'STRONGER SAMPLE':count>=3?'MEDIUM SAMPLE':count>=1?'SMALL SAMPLE':'NO SEASON SAMPLE';}
  function panelHtml(G,side){
    if(!['home','away'].includes(side))return '<section class="coachDecisionCenter"><div class="sectionhead"><div><small>COURTIQ · DECISION INTELLIGENCE</small><h3>Coach Decision Center</h3></div><span class="intelBadge">SELECT FOCUS TEAM</span></div><p>Choose a focus team above to connect game evidence, lineup signals and saved-season tendencies.</p></section>';
    const decisions=decisionData(G,side), trends=trendData(G,side), lineups=lineupData(G,side), topTrend=trends.items[0], team=G[side];
    return '<section class="coachDecisionCenter" data-side="'+side+'"><div class="sectionhead"><div><small>COURTIQ · DECISION INTELLIGENCE</small><h3>Coach Decision Center · '+esc(team)+'</h3></div><span class="intelBadge">'+esc(sampleLabel(trends.games))+' · '+trends.games+' SAVED GAMES</span></div>'+
      '<div class="decisionGrid">'+(decisions.length?decisions.map((d,i)=>'<article><small>'+esc(d.type)+' · DECISION '+(i+1)+'</small><h4>'+esc(d.title)+'</h4><b>'+esc(d.headline)+'</b><p>'+esc(d.evidence)+'</p><em>'+esc(d.action)+'</em><button type="button" class="importBtn decisionOpen" data-view="'+esc(d.view)+'"'+(d.factor?' data-factor="'+esc(d.factor)+'"':'')+'>OPEN EVIDENCE</button></article>').join(''):'<article><h4>Insufficient verified evidence</h4><p>Import a complete box score or play-by-play feed before CourtIQ creates coaching priorities.</p></article>')+'</div>'+
      '<div class="decisionLower"><article class="tendencyCard"><small>OPPONENT / TEAM TENDENCY MEMORY</small><h4>'+(topTrend?esc(topTrend.label):'Season tendency not ready')+'</h4>'+(topTrend?'<p>Last sample: <b>'+topTrend.recent+'%</b>'+(topTrend.prior!=null?' · previous sample '+topTrend.prior+'% · Δ '+(topTrend.delta>=0?'+':'')+topTrend.delta:'')+'</p><em>'+esc(sampleLabel(topTrend.sample))+' · descriptive only</em>':'<p>Need saved official games for a multi-game tendency.</p>')+'</article>'+
      '<article class="lineupCard"><small>LINEUP CHEMISTRY SIGNAL</small>'+(lineups.rows[0]?'<h4>'+esc(lineups.rows[0].players.join(' · '))+'</h4><p>'+lineups.rows[0].minutes+' min · '+(lineups.rows[0].margin>=0?'+':'')+lineups.rows[0].margin+' raw point margin</p><em>Status: '+esc(lineups.status)+' · minimum 60 seconds shown</em>':'<h4>Lineup sample unavailable</h4><p>Complete, reconciled play-by-play is required. CourtIQ will not invent five-player units.</p>')+'</article></div>'+
      '<div class="askCourtIQ"><div><small>ASK COURTIQ · DETERMINISTIC V1</small><h4>Ask about this game</h4></div><div class="askRow"><input class="askCourtIQInput" type="text" placeholder="e.g. What is our biggest problem? / מה ההרכב הטוב?" aria-label="Ask CourtIQ"><button type="button" class="importBtn askCourtIQRun">ASK</button></div><div class="askChips"><button type="button" data-q="advantage">BIGGEST ADVANTAGE</button><button type="button" data-q="problem">FIRST PROBLEM</button><button type="button" data-q="lineup">BEST LINEUP SIGNAL</button><button type="button" data-q="trend">STRONGEST TREND</button></div><div class="askCourtIQAnswer" aria-live="polite">Answers are generated only from verified game data and stored samples.</div></div></section>';
  }
  function answer(G,side,q){
    const text=String(q||'').toLowerCase(), f=factorData(G,side), l=lineupData(G,side).rows, t=trendData(G,side), positive=f.find(x=>x.good), negative=f.find(x=>!x.good);
    if(/lineup|הרכב/.test(text))return l[0]?`Top lineup signal: ${l[0].players.join(' · ')} — ${l[0].minutes} minutes, ${l[0].margin>=0?'+':''}${l[0].margin} raw point margin. Review context before changing the rotation.`:'No certified lineup sample is available. Complete play-by-play is required.';
    if(/trend|tendency|מגמה/.test(text)){const x=t.items[0];return x?`${x.label}: ${x.recent}% in the latest saved sample${x.prior!=null?`, vs ${x.prior}% previously (${x.delta>=0?'+':''}${x.delta})`:''}. ${sampleLabel(x.sample)}.`:'No multi-game tendency is available yet.';}
    if(/advantage|strength|יתרון|חוזק/.test(text))return positive?`Biggest measured advantage: ${positive.label}, ${positive.own}% vs ${positive.other}% (${positive.gap.toFixed(1)} pp gap). Verify the possessions on video before treating it as a repeatable tactical edge.`:'No clear Four-Factor advantage is available.';
    if(/problem|weak|review|חולש|בעיה|לבדוק/.test(text))return negative?`First review priority: ${negative.label}, ${negative.own}% vs ${negative.other}% (${negative.gap.toFixed(1)} pp gap). ${negative.action}`:'No clear Four-Factor disadvantage is available.';
    return 'Try asking about the biggest advantage, first problem, best lineup signal or strongest trend. CourtIQ v1 will not answer beyond the verified data currently loaded.';
  }
  function enhanceCard(G,card,onEvidence,onPlanEvidence){
    if(!card||card.querySelector('.coachDecisionCenter'))return;
    const side=card.querySelector('.briefFocus')?.value||'';
    const holder=root.document.createElement('div');holder.innerHTML=panelHtml(G,side);const panel=holder.firstElementChild;if(!panel)return;
    const qa=card.querySelector('.qaSummary');(qa||card.lastElementChild)?.insertAdjacentElement(qa?'beforebegin':'afterend',panel);
    panel.querySelectorAll('.decisionOpen').forEach(btn=>btn.onclick=()=>{
      if(btn.dataset.factor&&onEvidence)onEvidence(btn.dataset.factor);
      else if(onPlanEvidence)onPlanEvidence(btn.dataset.view);
      else card.querySelector('.briefStatus')&&(card.querySelector('.briefStatus').textContent='Open '+btn.dataset.view+' evidence in the game workspace.');
    });
    const input=panel.querySelector('.askCourtIQInput'),out=panel.querySelector('.askCourtIQAnswer');
    const run=q=>{out.textContent=answer(G,side,q);};
    panel.querySelector('.askCourtIQRun')?.addEventListener('click',()=>run(input.value));
    input?.addEventListener('keydown',e=>{if(e.key==='Enter')run(input.value);});
    panel.querySelectorAll('[data-q]').forEach(btn=>btn.onclick=()=>run(btn.dataset.q));
  }
  const oldMount=base.mount.bind(base);
  base.mount=function(G,scope=root.document,onEvidence,onPlays,onPlanEvidence){
    const result=oldMount(G,scope,onEvidence,onPlays,onPlanEvidence);
    const cards=[...(scope?.querySelectorAll?.('.gameIntelV2')||[])];
    cards.forEach(card=>{
      const ensure=()=>enhanceCard(G,card,onEvidence,onPlanEvidence);ensure();
      const obs=new MutationObserver(()=>{if(!card.querySelector('.coachDecisionCenter'))ensure();});
      obs.observe(card,{childList:true,subtree:false});
    });
    return result;
  };
  base.decisionData=decisionData;base.trendData=trendData;base.lineupData=lineupData;base.ask=answer;
})(typeof window!=='undefined'?window:globalThis);
