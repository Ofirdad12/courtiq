/* CourtIQ Play-by-Play Command Center v180 · evidence-first event intelligence. */
(function(root){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const categories={shot:'Field-goal attempts',free_throw:'Free throws',turnover:'Turnovers',rebound:'Rebounds',assist:'Assists',steal:'Steals',block:'Blocks',foul:'Fouls',substitution:'Substitutions',other:'Other / unclassified'};
  const aliases={shot:['2m','2a','3m','3a','fgm','fga','2pm','2pa','3pm','3pa','twopm','twopa','threepm','threepa','2ptmade','2ptmissed','3ptmade','3ptmissed','shot'],free_throw:['1m','1a','ftm','fta','ft','freethrowmade','freethrowmissed','freethrow'],turnover:['to','tov','turnover'],rebound:['off','def','oreb','dreb','reb','rebound','offensiverebound','defensiverebound'],assist:['ast','assist'],steal:['stl','steal'],block:['blk','block'],foul:['pf','pfa','foul'],substitution:['in','out','sub','substitution','playerin','playerout']};

  function category(e){
    const t=String(e?.type||e?.event_type||'').toLowerCase().replace(/[\s_-]/g,'');
    for(const [key,values] of Object.entries(aliases))if(values.includes(t))return key;
    const d=String(e?.description||e?.action||'').toLowerCase();
    if(/free[ -]?throw|עונשין/.test(d))return 'free_throw';
    if(/turnover|איבוד/.test(d))return 'turnover';
    if(/rebound|ריבאונד/.test(d))return 'rebound';
    if(/substitut|enters the game|leaves the game|חילוף|נכנס למגרש|יצא מהמגרש/.test(d))return 'substitution';
    if(/assist|אסיסט/.test(d))return 'assist';
    if(/steal|חטיפה/.test(d))return 'steal';
    if(/block|חסימה/.test(d))return 'block';
    if(/foul|עבירה/.test(d))return 'foul';
    if(/\b[23][ -]?(?:pt|point)|layup|dunk|jumper|זריקה|קליעה.*[23] נק/.test(d))return 'shot';
    return 'other';
  }
  function side(G,e){if(['home','away'].includes(e?.side))return e.side;const team=String(e?.team||'').trim();return team&&team===G.home?'home':team&&team===G.away?'away':'unknown';}
  function events(G){const rows=G?.playByPlay??G?.play_by_play;return Array.isArray(rows)?rows.filter(e=>e&&typeof e==='object'&&!Array.isArray(e)):[];}
  function periodLength(period){return Number(period)<=4?600:300;}
  function clock(period,value){const q=Number(period);if(!Number.isInteger(q)||q<1||!/^\d{1,2}:[0-5]\d$/.test(String(value||'')))return null;const [m,s]=String(value).split(':').map(Number),n=m*60+s;return n<=periodLength(q)?n:null;}
  function elapsed(period,value){const q=Number(period),remain=clock(q,value);if(remain==null)return null;let before=0;for(let p=1;p<q;p++)before+=periodLength(p);return before+(periodLength(q)-remain);}
  function periodLabel(period){const p=Number(period);return !Number.isInteger(p)||p<1?'—':p<=4?'Q'+p:'OT'+(p-4);}
  function chronological(G){const rows=events(G).slice(),timed=rows.map((e,i)=>({i,t:elapsed(e.period,e.clock)})).filter(x=>x.t!=null);if(timed.length<2)return rows;return timed[0].t>timed[timed.length-1].t?rows.reverse():rows;}

  function numeric(v){const n=Number(v);return Number.isFinite(n)&&n>=0?n:null;}
  function scoreOf(e){
    const h=numeric(e?.home_score??e?.homeScore),a=numeric(e?.away_score??e?.awayScore);if(h!=null&&a!=null)return {home:h,away:a};
    const s=e?.score;
    if(Array.isArray(s)&&s.length>=2){const ah=numeric(s[0]),aa=numeric(s[1]);if(ah!=null&&aa!=null)return {home:ah,away:aa};}
    if(s&&typeof s==='object'){const oh=numeric(s.home??s.home_score??s.homeScore),oa=numeric(s.away??s.away_score??s.awayScore);if(oh!=null&&oa!=null)return {home:oh,away:oa};}
    const m=String(s??'').match(/(\d{1,3})\s*[-:–]\s*(\d{1,3})/);return m?{home:Number(m[1]),away:Number(m[2])}:null;
  }
  function scoreSnapshots(G){return chronological(G).map((event,index)=>({event,index,score:scoreOf(event),period:Number(event.period),clock:event.clock})).filter(x=>x.score);}
  function scoreDeltas(G){
    const snaps=scoreSnapshots(G),out=[];if(!snaps.length)return out;let prev=null;
    for(const snap of snaps){
      const cur=snap.score;
      if(!prev){if(cur.home+cur.away<=4)prev={home:0,away:0};else{prev=cur;continue;}}
      const dh=cur.home-prev.home,da=cur.away-prev.away;
      if(dh<0||da<0||dh>4||da>4){prev=cur;continue;}
      if((dh>0) !== (da>0))out.push({...snap,side:dh>0?'home':'away',points:dh||da,margin:cur.home-cur.away});
      prev=cur;
    }
    return out;
  }
  function leadChanges(G){
    let prevSign=0,count=0;const changes=[];
    for(const snap of scoreSnapshots(G)){const margin=snap.score.home-snap.score.away,sign=Math.sign(margin);if(!sign)continue;if(prevSign&&sign!==prevSign){count++;changes.push({...snap,leader:sign>0?'home':'away',margin});}prevSign=sign;}
    return {count,changes};
  }
  function detectRuns(G,minPoints=6){
    const deltas=scoreDeltas(G),runs=[];let run=null;
    const finish=()=>{if(run&&run.points>=minPoints)runs.push(run);run=null;};
    for(const d of deltas){
      if(run&&Number(d.period)!==Number(run.period))finish();
      if(!run||run.side!==d.side){finish();run={side:d.side,points:d.points,period:d.period,startClock:d.clock,endClock:d.clock,startEvent:d.event,endEvent:d.event,startScore:d.score,endScore:d.score};}
      else{run.points+=d.points;run.endClock=d.clock;run.endEvent=d.event;run.endScore=d.score;}
    }
    finish();return runs.sort((a,b)=>b.points-a.points||Number(a.period)-Number(b.period));
  }
  function isOffensiveRebound(e){const t=String(e?.type||e?.event_type||'').toLowerCase().replace(/[\s_-]/g,'');const d=String(e?.description||e?.action||'').toLowerCase();return ['off','oreb','offensiverebound'].includes(t)||/offensive rebound|ריבאונד התקפה/.test(d);}
  function isDefensiveRebound(e){const t=String(e?.type||e?.event_type||'').toLowerCase().replace(/[\s_-]/g,'');const d=String(e?.description||e?.action||'').toLowerCase();return ['def','dreb','defensiverebound'].includes(t)||/defensive rebound|ריבאונד הגנה/.test(d);}
  function isClutchEvent(e){const p=Number(e?.period),t=clock(p,e?.clock),s=scoreOf(e);return p>=4&&t!=null&&t<=120&&s&&Math.abs(s.home-s.away)<=5;}
  function statCounts(G){
    const out={home:{turnover:0,oreb:0,steal:0,assist:0},away:{turnover:0,oreb:0,steal:0,assist:0},unknown:{turnover:0,oreb:0,steal:0,assist:0}};
    for(const e of events(G)){const s=side(G,e);if(category(e)==='turnover')out[s].turnover++;if(isOffensiveRebound(e))out[s].oreb++;if(category(e)==='steal')out[s].steal++;if(category(e)==='assist')out[s].assist++;}
    return out;
  }
  function turnoverBursts(G,windowSeconds=180,minCount=2){
    const rows=chronological(G).filter(e=>category(e)==='turnover'&&['home','away'].includes(side(G,e))&&elapsed(e.period,e.clock)!=null),found=[];
    for(const team of ['home','away']){
      const teamRows=rows.filter(e=>side(G,e)===team);
      for(let i=0;i<teamRows.length;i++){
        const start=teamRows[i],startT=elapsed(start.period,start.clock);let end=start,count=1;
        for(let j=i+1;j<teamRows.length;j++){const e=teamRows[j],t=elapsed(e.period,e.clock);if(Number(e.period)!==Number(start.period)||t-startT>windowSeconds)break;end=e;count++;}
        if(count>=minCount)found.push({side:team,count,period:Number(start.period),startClock:start.clock,endClock:end.clock,startEvent:start,endEvent:end});
      }
    }
    const dedup=[];for(const x of found.sort((a,b)=>b.count-a.count)){if(!dedup.some(y=>y.side===x.side&&y.period===x.period&&y.startClock===x.startClock))dedup.push(x);}return dedup.slice(0,4);
  }
  function playerPulse(G){
    const map=new Map(),scoring=new Map(scoreDeltas(G).map(x=>[x.event,x]));
    for(const e of chronological(G)){const player=String(e.player||'').trim();if(!player)continue;const row=map.get(player)||{player,team:side(G,e),points:0,turnovers:0,assists:0,steals:0,oreb:0,shots:0,events:0};row.events++;const c=category(e);if(c==='turnover')row.turnovers++;if(c==='assist')row.assists++;if(c==='steal')row.steals++;if(c==='shot')row.shots++;if(isOffensiveRebound(e))row.oreb++;const s=scoring.get(e);if(s)row.points+=s.points;if(row.team==='unknown'&&side(G,e)!=='unknown')row.team=side(G,e);map.set(player,row);}
    return [...map.values()].sort((a,b)=>(b.points+b.assists+b.steals+b.oreb+b.turnovers)-(a.points+a.assists+a.steals+a.oreb+a.turnovers)||b.events-a.events||a.player.localeCompare(b.player));
  }
  function pressureWindow(G){const rows=chronological(G).filter(isClutchEvent);if(!rows.length)return null;const counts={events:rows.length,turnovers:rows.filter(e=>category(e)==='turnover').length,shots:rows.filter(e=>category(e)==='shot').length,freeThrows:rows.filter(e=>category(e)==='free_throw').length};return {rows,counts,start:rows[0],end:rows[rows.length-1]};}
  function turningPoints(G){
    const moments=[];
    detectRuns(G,6).slice(0,3).forEach(r=>moments.push({kind:'run',side:r.side,period:r.period,startClock:r.startClock,endClock:r.endClock,title:(r.side==='home'?G.home:G.away)+' '+r.points+'–0 run',evidence:periodLabel(r.period)+' '+r.startClock+' → '+r.endClock}));
    turnoverBursts(G).slice(0,2).forEach(b=>moments.push({kind:'turnover',side:b.side,period:b.period,startClock:b.startClock,endClock:b.endClock,title:b.count+' turnovers in a short window · '+(b.side==='home'?G.home:G.away),evidence:periodLabel(b.period)+' '+b.startClock+' → '+b.endClock}));
    leadChanges(G).changes.slice(-2).forEach(c=>moments.push({kind:'lead',side:c.leader,period:c.period,startClock:c.clock,endClock:c.clock,title:'Lead change · '+(c.leader==='home'?G.home:G.away),evidence:periodLabel(c.period)+' '+c.clock+' · '+c.score.home+'–'+c.score.away}));
    return moments.slice(0,6);
  }
  function coachInsights(G){
    const counts=statCounts(G),runs=detectRuns(G,6),leads=leadChanges(G),clutch=pressureWindow(G),cards=[];
    if(runs.length){const r=runs[0],name=r.side==='home'?G.home:G.away;cards.push({level:r.points>=10?'ATTENTION':'INFO',title:'Largest verified scoring run',evidence:name+' '+r.points+'–0 · '+periodLabel(r.period)+' '+r.startClock+' → '+r.endClock,coachCheck:'Review the possessions inside the run before assigning tactical cause.',intent:'run',moment:r});}
    const tovGap=counts.home.turnover-counts.away.turnover;if(Math.abs(tovGap)>=2){const burden=tovGap>0?'home':'away',name=burden==='home'?G.home:G.away;cards.push({level:Math.abs(tovGap)>=4?'ATTENTION':'WATCH',title:'Ball-security pressure in the event feed',evidence:name+' has '+counts[burden].turnover+' recorded turnovers vs '+counts[burden==='home'?'away':'home'].turnover,coachCheck:'Classify the turnover types before changing spacing, handler or pressure response.',intent:'turnover',side:burden});}
    const orbGap=counts.home.oreb-counts.away.oreb;if(Math.abs(orbGap)>=2){const edge=orbGap>0?'home':'away',name=edge==='home'?G.home:G.away;cards.push({level:'WATCH',title:'Second-possession signal',evidence:name+' has '+counts[edge].oreb+' recorded offensive-rebound events vs '+counts[edge==='home'?'away':'home'].oreb,coachCheck:'Verify crash assignments and long-rebound context on video.',intent:'oreb',side:edge});}
    if(leads.count>=3)cards.push({level:'INFO',title:'High game-flow volatility',evidence:leads.count+' verified lead changes from source score snapshots',coachCheck:'Use the timeline to identify which possessions repeatedly changed control.',intent:'lead'});
    if(clutch)cards.push({level:'INFO',title:'Close-game pressure window available',evidence:clutch.counts.events+' source events recorded with ≤2:00 and score margin ≤5',coachCheck:'Review decisions, turnovers and shot events in this window possession by possession.',intent:'clutch'});
    if(!cards.length)cards.push({level:'INFO',title:'No large event-feed signal yet',evidence:'No 6–0 run, ≥2 turnover gap, ≥2 OREB-event gap or close-game pressure window crossed the current thresholds.',coachCheck:'Keep the play-by-play as evidence. Avoid forcing a tactical conclusion from a quiet or incomplete feed.',intent:'reset'});
    return cards.slice(0,4);
  }
  function brief(G){const counts=statCounts(G),runs=detectRuns(G,6),leads=leadChanges(G),clutch=pressureWindow(G),lines=['Play-by-Play brief · '+(G.home||'Home')+' vs '+(G.away||'Away')];if(runs[0]){const r=runs[0];lines.push('• Largest verified run: '+(r.side==='home'?G.home:G.away)+' '+r.points+'–0 ('+periodLabel(r.period)+' '+r.startClock+'–'+r.endClock+')');}else lines.push('• No verified 6–0 scoring run found in available score snapshots.');lines.push('• Recorded turnovers: '+(G.home||'Home')+' '+counts.home.turnover+' · '+(G.away||'Away')+' '+counts.away.turnover);lines.push('• Recorded offensive rebounds: '+(G.home||'Home')+' '+counts.home.oreb+' · '+(G.away||'Away')+' '+counts.away.oreb);lines.push('• Lead changes from score snapshots: '+leads.count);if(clutch)lines.push('• Close-game window: '+clutch.counts.events+' source events at ≤2:00 with margin ≤5.');lines.push('Evidence note: event-feed patterns do not establish tactical causation without video/context.');return lines.join('\n');}

  function filter(G,options={}){
    const scoringSet=options.quick==='scoring'?new Set(scoreDeltas(G).map(x=>x.event)):null;
    const runSet=options.quick==='runs'?(()=>{const set=new Set();for(const r of detectRuns(G,6)){for(const e of chronological(G)){if(Number(e.period)!==Number(r.period))continue;const t=clock(e.period,e.clock),start=clock(r.period,r.startClock),end=clock(r.period,r.endClock);if(t!=null&&start!=null&&end!=null&&t<=start&&t>=end)set.add(e);}}return set;})():null;
    return events(G).filter(e=>{
      if(options.window){const w=options.window,start=clock(w.period,w.startClock),end=clock(w.period,w.endClock),t=clock(e.period,e.clock);if(start==null||end==null||start<end||Number(e.period)!==Number(w.period)||t==null||t>start||t<end)return false;}
      if(options.period&&String(e.period)!==String(options.period))return false;
      if(options.side&&side(G,e)!==options.side)return false;
      if(options.player&&String(e.player||'').trim()!==options.player)return false;
      if(options.type&&category(e)!==options.type)return false;
      if(options.quick==='scoring'&&!scoringSet.has(e))return false;
      if(options.quick==='oreb'&&!isOffensiveRebound(e))return false;
      if(options.quick==='clutch'&&!isClutchEvent(e))return false;
      if(options.quick==='runs'&&!runSet.has(e))return false;
      const search=String(options.search||'').trim().toLowerCase();
      return !search||[e.player,e.team,e.description,e.action,e.clock,e.period_label,e.score].filter(v=>v!=null).join(' ').toLowerCase().includes(search);
    });
  }
  function source(G){try{const u=new URL(G.sourceUrl||G.source_url);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch(_){return null;}}
  const options=(values,first)=>'<option value="">'+first+'</option>'+values.map(([v,label])=>'<option value="'+esc(v)+'">'+esc(label)+'</option>').join('');
  function summaryHtml(G){const rows=events(G),snaps=scoreSnapshots(G),runs=detectRuns(G,6),leads=leadChanges(G),clutch=pressureWindow(G);return '<div class="pbpKpis"><article><small>SOURCE EVENTS</small><b>'+rows.length+'</b><span>recorded feed</span></article><article><small>SCORE SNAPSHOTS</small><b>'+snaps.length+'</b><span>usable for game flow</span></article><article><small>SCORING RUNS</small><b>'+runs.length+'</b><span>verified ≥6–0</span></article><article><small>LEAD CHANGES</small><b>'+leads.count+'</b><span>from score snapshots</span></article><article><small>CLUTCH WINDOW</small><b>'+(clutch?clutch.counts.events:'—')+'</b><span>'+(clutch?'events at ≤2:00 / margin ≤5':'not available')+'</span></article></div>';}
  function insightsHtml(G){return '<div class="pbpInsightGrid">'+coachInsights(G).map((x,i)=>'<article class="pbpInsight pbp-'+esc(String(x.level).toLowerCase())+'"><div><small>'+esc(x.level)+' · SIGNAL '+(i+1)+'</small><h4>'+esc(x.title)+'</h4></div><b>'+esc(x.evidence)+'</b><p><strong>Coach check:</strong> '+esc(x.coachCheck)+'</p><button type="button" class="pbpInsightBtn" data-pbp-intent="'+esc(x.intent)+'" data-pbp-insight="'+i+'">SHOW EVIDENCE</button></article>').join('')+'</div>';}
  function momentsHtml(G){const moments=turningPoints(G);return moments.length?'<div class="pbpMoments">'+moments.map((m,i)=>'<button type="button" data-pbp-moment="'+i+'"><small>'+esc(m.kind.toUpperCase())+'</small><b>'+esc(m.title)+'</b><span>'+esc(m.evidence)+'</span></button>').join('')+'</div>':'<div class="pbpEmptySignal"><b>No turning-point threshold crossed.</b><span>The feed stays available for event-level review.</span></div>';}
  function playerPulseHtml(G){const rows=playerPulse(G).slice(0,8);return rows.length?'<div class="pbpPlayerPulse">'+rows.map(p=>'<button type="button" data-pbp-player="'+esc(p.player)+'"><div><small>'+esc(p.team==='home'?G.home:p.team==='away'?G.away:'TEAM UNKNOWN')+'</small><b>'+esc(p.player)+'</b></div><span>'+p.points+' PTS · '+p.assists+' AST · '+p.turnovers+' TO · '+p.oreb+' OREB</span></button>').join('')+'</div>':'<div class="pbpEmptySignal"><b>No player-linked events found.</b><span>The source feed may not provide player attribution.</span></div>';}
  function render(G){
    const rows=events(G),periods=[...new Set(rows.map(e=>Number(e.period)).filter(p=>Number.isInteger(p)&&p>0))].sort((a,b)=>a-b),players=[...new Set(rows.map(e=>String(e.player||'').trim()).filter(Boolean))].sort(),url=source(G);
    return '<section class="gameViewPanel pbpExplorer" data-game-view="play"><div class="viewTitle"><div><small>EVENT INTELLIGENCE · V180</small><h3>Play-by-Play Command Center</h3></div><span>'+rows.length+' source events</span></div>'+(rows.length?summaryHtml(G)+'<div class="pbpSectionHead"><div><small>COACH SIGNALS</small><h4>What the event feed says now</h4></div><button type="button" class="importBtn pbpCopyBrief">COPY PBP BRIEF</button></div>'+insightsHtml(G)+'<div class="pbpSectionHead"><div><small>GAME FLOW</small><h4>Turning points & pressure windows</h4></div><span>Click any moment to isolate its evidence</span></div>'+momentsHtml(G)+'<div class="pbpSectionHead"><div><small>PLAYER EVENT PULSE</small><h4>Who is appearing in the key actions</h4></div><span>Raw event counts · not plus/minus</span></div>'+playerPulseHtml(G)+'<div class="pbpQuick"><button type="button" data-pbp-quick="scoring">SCORING EVENTS</button><button type="button" data-pbp-quick="runs">SCORING RUNS</button><button type="button" data-pbp-quick="turnover">TURNOVERS</button><button type="button" data-pbp-quick="oreb">OFF. REBOUNDS</button><button type="button" data-pbp-quick="clutch">CLUTCH ≤2:00</button></div><div class="pbpFilters"><label>Period<select class="pbpPeriod">'+options(periods.map(p=>[p,periodLabel(p)]),'All periods')+'</select></label><label>Team<select class="pbpSide">'+options([['home',G.home],['away',G.away],['unknown','Team not identified']],'Both teams')+'</select></label><label>Player<select class="pbpPlayer">'+options(players.map(p=>[p,p]),'All players')+'</select></label><label>Play type<select class="pbpType">'+options(Object.entries(categories),'All types')+'</select></label><label>Search plays<input class="pbpSearch" type="search" placeholder="Player, action, score or clock"></label><button type="button" class="importBtn pbpReset">RESET FILTERS</button></div><div class="pbpWindow" hidden></div><div class="pbpMeta"><b class="pbpCount" role="status"></b><button type="button" class="importBtn pbpAutoTag">TAG FILTERED EVENTS</button></div><p class="metricNote">Game-flow signals use only recorded source events and score snapshots. They are evidence for review, not proof of tactical causation. Video times remain estimates until a sync anchor is set.</p><div class="card pbpCard"><div class="playerScroll"><table class="stats pbpTable"><thead><tr><th>Period</th><th>Clock</th><th>Score</th><th>Team</th><th>Player</th><th>Play</th></tr></thead><tbody></tbody></table></div></div>':'<div class="card emptyView"><b>No play-by-play is available in this game record.</b><span>Re-import the game when its source publishes an event feed. Box-score totals cannot supply an event timeline.</span>'+(url?'<a href="'+esc(url)+'" target="_blank" rel="noopener">Open game source</a>':'')+'</div>')+'<p class="pbpActionStatus" role="status"></p></section>';
  }

  const controllers=new WeakMap();
  function mount(G,scope=root.document){
    const el=scope?.querySelector('.pbpExplorer');if(!el)return;
    const rows=events(G),status=el.querySelector('.pbpActionStatus');
    if(!rows.length){const control={focus:()=>{status.textContent='Related plays need a source event feed. No events have been inferred from the box score.';}};controllers.set(el,control);return control;}
    const fields={period:el.querySelector('.pbpPeriod'),side:el.querySelector('.pbpSide'),player:el.querySelector('.pbpPlayer'),type:el.querySelector('.pbpType'),search:el.querySelector('.pbpSearch')};
    const insights=coachInsights(G),moments=turningPoints(G);let activeWindow=null,quick='';
    const selectedOptions=()=>({...Object.fromEntries(Object.entries(fields).map(([k,input])=>[k,input.value])),window:activeWindow,quick});
    const quickButtons=()=>[...el.querySelectorAll('[data-pbp-quick]')];
    const setQuick=value=>{quick=value||'';quickButtons().forEach(b=>b.classList.toggle('active',b.dataset.pbpQuick===quick));};
    const draw=()=>{
      const selected=filter(G,selectedOptions()),scoringMap=new Map(scoreDeltas(G).map(x=>[x.event,x]));
      el.querySelector('.pbpCount').textContent=selected.length+' / '+rows.length+' events shown'+(quick?' · '+quick.toUpperCase():'');
      el.querySelector('tbody').innerHTML=selected.length?selected.map(e=>{
        const video=root.CourtIQVideo?.videoForPbp?.(e.period,e.clock),team=e.team||G[side(G,e)]||'—',delta=scoringMap.get(e),badges=[];if(delta)badges.push('+'+delta.points+' '+(delta.side==='home'?G.home:G.away));if(isOffensiveRebound(e))badges.push('OREB');if(isClutchEvent(e))badges.push('CLUTCH');
        return '<tr><td>'+esc(e.period_label||periodLabel(e.period))+'</td><td>'+esc(e.clock||'—')+'</td><td>'+esc(e.score||((scoreOf(e))?scoreOf(e).home+'–'+scoreOf(e).away:'—'))+'</td><td>'+esc(team)+'</td><td>'+esc(e.player||'—')+'</td><td>'+esc(e.description||e.action||e.type||'—')+' <small class="pbpCategory">'+esc(categories[category(e)])+'</small>'+(badges.length?' <span class="pbpBadges">'+badges.map(b=>'<i>'+esc(b)+'</i>').join('')+'</span>':'')+(video&&/^https:\/\//.test(video.url)?' <a href="'+esc(video.url)+'" target="_blank" rel="noopener">VIDEO · ESTIMATED</a>':'')+'</td></tr>';
      }).join(''):'<tr><td colspan="6">No source events match these filters. Try another team, period, player, quick filter or play type.</td></tr>';
    };
    const reset=()=>{activeWindow=null;setQuick('');el.querySelector('.pbpWindow').hidden=true;Object.values(fields).forEach(input=>input.value='');status.textContent='';};
    const showWindow=w=>{activeWindow=w;fields.period.value=String(w.period);const box=el.querySelector('.pbpWindow');box.hidden=false;box.innerHTML='<b>Evidence window · '+esc(periodLabel(w.period))+' '+esc(w.startClock)+' – '+esc(w.endClock)+'</b><p>Both teams remain available for context. Boundary events and tactical cause require video review.</p><button type="button" class="importBtn pbpRemoveWindow">REMOVE CLOCK WINDOW</button>';box.querySelector('button').onclick=()=>{activeWindow=null;box.hidden=true;draw();};};
    Object.values(fields).forEach(input=>{input.onchange=draw;});fields.search.oninput=draw;
    el.querySelector('.pbpReset').onclick=()=>{reset();draw();};
    quickButtons().forEach(btn=>btn.onclick=()=>{activeWindow=null;el.querySelector('.pbpWindow').hidden=true;Object.values(fields).forEach(input=>input.value='');const q=btn.dataset.pbpQuick;if(q==='turnover'){setQuick('');fields.type.value='turnover';}else setQuick(quick===q?'':q);draw();status.textContent=q==='clutch'?'Close-game source events shown only where score margin is ≤5 and clock is ≤2:00.':'Quick evidence filter applied.';});
    el.querySelectorAll('[data-pbp-player]').forEach(btn=>btn.onclick=()=>{reset();fields.player.value=btn.dataset.pbpPlayer||'';draw();status.textContent='Player-linked source events shown. This is an event pulse, not a plus/minus or causal impact measure.';});
    el.querySelectorAll('[data-pbp-moment]').forEach(btn=>btn.onclick=()=>{const m=moments[Number(btn.dataset.pbpMoment)];if(!m)return;reset();if(m.side)fields.side.value=m.side;showWindow({period:m.period,startClock:m.startClock,endClock:m.endClock});draw();status.textContent='Turning-point evidence isolated from the source feed. Review the possessions before assigning tactical cause.';});
    el.querySelectorAll('[data-pbp-insight]').forEach(btn=>btn.onclick=()=>{const x=insights[Number(btn.dataset.pbpInsight)];if(!x)return;reset();if(x.intent==='run'&&x.moment){fields.side.value=x.moment.side;showWindow({period:x.moment.period,startClock:x.moment.startClock,endClock:x.moment.endClock});}else if(x.intent==='turnover'){fields.type.value='turnover';fields.side.value=x.side||'';}else if(x.intent==='oreb'){setQuick('oreb');fields.side.value=x.side||'';}else if(x.intent==='clutch')setQuick('clutch');else if(x.intent==='lead'){const c=leadChanges(G).changes.slice(-1)[0];if(c)showWindow({period:c.period,startClock:c.clock,endClock:c.clock});}draw();status.textContent='Evidence for this coach signal is now isolated below.';});
    el.querySelector('.pbpCopyBrief').onclick=async()=>{const text=brief(G);try{if(root.navigator?.clipboard?.writeText){await root.navigator.clipboard.writeText(text);status.textContent='Play-by-Play coach brief copied.';}else status.textContent=text;}catch(_){status.textContent=text;}};
    el.querySelector('.pbpAutoTag').onclick=()=>{try{const selected=filter(G,selectedOptions());if(!selected.length){status.textContent='No events match the filters.';return;}const result=root.CourtIQVideo?.importPbp?.(selected);status.textContent=!result?'Video engine is unavailable.':result.reason==='video'?'Load this game’s video in VIDEO IMPORT first.':result.added+' source events tagged for this game. These remain events, not full possessions.';}catch(err){status.textContent=err.message;}};
    const control={focus:(factor,team)=>{reset();fields.type.value=({'eFG%':'shot','TOV%':'turnover','ORB%':'rebound',FTr:'free_throw'})[factor]||'';fields.side.value=['home','away'].includes(team)?team:'';draw();status.textContent=factor==='ORB%'?'Rebound events shown. Review descriptions to distinguish offensive and defensive rebounds.':'Related source events shown for '+factor+'. Review video before attributing tactical causes.';},focusInterval:w=>{reset();showWindow(w);draw();status.textContent='Events within the selected lineup segment clock window. This does not establish tactical causation.';},draw};
    controllers.set(el,control);draw();return control;
  }
  function focus(scope,factor,team){const el=scope?.querySelector('.pbpExplorer');controllers.get(el)?.focus(factor,team);}
  function focusInterval(scope,window){const el=scope?.querySelector('.pbpExplorer'),control=controllers.get(el);if(control?.focusInterval)control.focusInterval(window);else control?.focus();}
  const api={category,side,events,clock,elapsed,chronological,scoreOf,scoreSnapshots,scoreDeltas,leadChanges,detectRuns,isOffensiveRebound,isDefensiveRebound,isClutchEvent,statCounts,turnoverBursts,playerPulse,pressureWindow,turningPoints,coachInsights,brief,filter,render,mount,focus,focusInterval};
  root.CourtIQPlayByPlay=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
