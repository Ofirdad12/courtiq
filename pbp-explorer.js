/* Source event filters; these do not infer possessions or tactical causes. */
(function(root){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const categories={shot:'Field-goal attempts',free_throw:'Free throws',turnover:'Turnovers',rebound:'Rebounds',assist:'Assists',steal:'Steals',block:'Blocks',foul:'Fouls',substitution:'Substitutions',other:'Other / unclassified'};
  const aliases={shot:['2m','2a','3m','3a','fgm','fga','2pm','2pa','3pm','3pa','twopm','twopa','threepm','threepa','2ptmade','2ptmissed','3ptmade','3ptmissed','shot'],free_throw:['1m','1a','ftm','fta','ft','freethrowmade','freethrowmissed','freethrow'],turnover:['to','tov','turnover'],rebound:['off','def','oreb','dreb','reb','rebound','offensiverebound','defensiverebound'],assist:['ast','assist'],steal:['stl','steal'],block:['blk','block'],foul:['pf','pfa','foul'],substitution:['in','out','sub','substitution','playerin','playerout']};
  function category(e){
    const t=String(e.type||e.event_type||'').toLowerCase().replace(/[\s_-]/g,'');
    for(const [key,values] of Object.entries(aliases))if(values.includes(t))return key;
    const d=String(e.description||e.action||'').toLowerCase();
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
  function side(G,e){if(['home','away'].includes(e.side))return e.side;const team=String(e.team||'').trim();return team&&team===G.home?'home':team&&team===G.away?'away':'unknown';}
  function events(G){const rows=G.playByPlay??G.play_by_play;return Array.isArray(rows)?rows.filter(e=>e&&typeof e==='object'&&!Array.isArray(e)):[];}
  function clock(period,value){const q=Number(period);if(!Number.isInteger(q)||q<1||!/^\d{1,2}:[0-5]\d$/.test(String(value||'')))return null;const [m,s]=String(value).split(':').map(Number),n=m*60+s;return n<=(q<=4?600:300)?n:null;}
  function filter(G,options={}){return events(G).filter(e=>{
    if(options.window){const w=options.window,start=clock(w.period,w.startClock),end=clock(w.period,w.endClock),t=clock(e.period,e.clock);if(start==null||end==null||start<end||Number(e.period)!==Number(w.period)||t==null||t>start||t<end)return false;}
    if(options.period&&String(e.period)!==String(options.period))return false;
    if(options.side&&side(G,e)!==options.side)return false;
    if(options.player&&String(e.player||'').trim()!==options.player)return false;
    if(options.type&&category(e)!==options.type)return false;
    const search=String(options.search||'').trim().toLowerCase();
    return !search||[e.player,e.team,e.description,e.action,e.clock,e.period_label].filter(v=>v!=null).join(' ').toLowerCase().includes(search);
  });}
  function source(G){try{const u=new URL(G.sourceUrl||G.source_url);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch(_){return null;}}
  const options=(values,first)=>'<option value="">'+first+'</option>'+values.map(([v,label])=>'<option value="'+esc(v)+'">'+esc(label)+'</option>').join('');
  function render(G){
    const rows=events(G),periods=[...new Set(rows.map(e=>Number(e.period)).filter(p=>Number.isInteger(p)&&p>0))].sort((a,b)=>a-b),players=[...new Set(rows.map(e=>String(e.player||'').trim()).filter(Boolean))].sort(),url=source(G);
    return '<section class="gameViewPanel pbpExplorer" data-game-view="play"><div class="viewTitle"><div><small>IMPORTED EVENT FEED</small><h3>Play-by-Play</h3></div><span>'+rows.length+' source events</span></div>'+(rows.length?'<div class="pbpFilters"><label>Period<select class="pbpPeriod">'+options(periods.map(p=>[p,p<=4?'Q'+p:'OT'+(p-4)]),'All periods')+'</select></label><label>Team<select class="pbpSide">'+options([['home',G.home],['away',G.away],['unknown','Team not identified']],'Both teams')+'</select></label><label>Player<select class="pbpPlayer">'+options(players.map(p=>[p,p]),'All players')+'</select></label><label>Play type<select class="pbpType">'+options(Object.entries(categories),'All types')+'</select></label><label>Search plays<input class="pbpSearch" type="search" placeholder="Player, action or clock"></label><button type="button" class="importBtn pbpReset">RESET FILTERS</button></div><div class="pbpWindow" hidden></div><div class="pbpMeta"><b class="pbpCount" role="status"></b><button type="button" class="importBtn pbpAutoTag">TAG FILTERED EVENTS</button></div><p class="metricNote">Source order retained. Categories group recorded events; they do not establish possession totals or tactical causes. Video times are estimates and require a sync anchor for that period.</p><div class="card pbpCard"><div class="playerScroll"><table class="stats pbpTable"><thead><tr><th>Period</th><th>Clock</th><th>Score</th><th>Team</th><th>Player</th><th>Play</th></tr></thead><tbody></tbody></table></div></div>':'<div class="card emptyView"><b>No play-by-play is available in this game record.</b><span>Re-import the game when its source publishes an event feed. Box-score totals cannot supply an event timeline.</span>'+(url?'<a href="'+esc(url)+'" target="_blank" rel="noopener">Open game source</a>':'')+'</div>')+'<p class="pbpActionStatus" role="status"></p></section>';
  }
  const controllers=new WeakMap();
  function mount(G,scope=root.document){
    const el=scope?.querySelector('.pbpExplorer');if(!el)return;
    const rows=events(G),status=el.querySelector('.pbpActionStatus');
    if(!rows.length){const control={focus:()=>{status.textContent='Related plays need a source event feed. No events have been inferred from the box score.';}};controllers.set(el,control);return control;}
    const fields={period:el.querySelector('.pbpPeriod'),side:el.querySelector('.pbpSide'),player:el.querySelector('.pbpPlayer'),type:el.querySelector('.pbpType'),search:el.querySelector('.pbpSearch')};
    let activeWindow=null;
    const selectedOptions=()=>({...Object.fromEntries(Object.entries(fields).map(([k,input])=>[k,input.value])),window:activeWindow});
    const draw=()=>{
      const selected=filter(G,selectedOptions());
      el.querySelector('.pbpCount').textContent=selected.length+' / '+rows.length+' events shown';
      el.querySelector('tbody').innerHTML=selected.length?selected.map(e=>{
        const video=root.CourtIQVideo?.videoForPbp?.(e.period,e.clock),team=e.team||G[side(G,e)]||'—';
        return '<tr><td>'+esc(e.period_label||(e.period?(Number(e.period)>4?'OT'+(Number(e.period)-4):'Q'+e.period):'—'))+'</td><td>'+esc(e.clock||'—')+'</td><td>'+esc(e.score||'—')+'</td><td>'+esc(team)+'</td><td>'+esc(e.player||'—')+'</td><td>'+esc(e.description||e.action||e.type||'—')+' <small class="pbpCategory">'+esc(categories[category(e)])+'</small>'+(video&&/^https:\/\//.test(video.url)?' <a href="'+esc(video.url)+'" target="_blank" rel="noopener">VIDEO · ESTIMATED</a>':'')+'</td></tr>';
      }).join(''):'<tr><td colspan="6">No source events match these filters. Try another team, period or play type.</td></tr>';
    };
    const reset=()=>{activeWindow=null;el.querySelector('.pbpWindow').hidden=true;Object.values(fields).forEach(input=>input.value='');status.textContent='';};
    Object.values(fields).forEach(input=>{input.onchange=draw;});fields.search.oninput=draw;
    el.querySelector('.pbpReset').onclick=()=>{reset();draw();};
    el.querySelector('.pbpAutoTag').onclick=()=>{try{const selected=filter(G,selectedOptions());if(!selected.length){status.textContent='No events match the filters.';return;}const result=root.CourtIQVideo?.importPbp?.(selected);status.textContent=!result?'Video engine is unavailable.':result.reason==='video'?'Load this game’s video in VIDEO IMPORT first.':result.added+' source events tagged for this game. These remain events, not full possessions.';}catch(err){status.textContent=err.message;}};
    const control={focus:(factor,team)=>{reset();fields.type.value=({'eFG%':'shot','TOV%':'turnover','ORB%':'rebound',FTr:'free_throw'})[factor]||'';fields.side.value=['home','away'].includes(team)?team:'';draw();status.textContent=factor==='ORB%'?'Rebound events shown. Review the source descriptions to distinguish offensive and defensive rebounds.':'Related source events shown for '+factor+'. Review video before attributing tactical causes.';},focusInterval:w=>{reset();activeWindow=w;fields.period.value=String(w.period);const box=el.querySelector('.pbpWindow');box.hidden=false;box.innerHTML='<b>Clock window · '+esc(Number(w.period)<=4?'Q'+w.period:'OT'+(Number(w.period)-4))+' '+esc(w.startClock)+' – '+esc(w.endClock)+'</b><p>Both teams shown for context. Boundary events require video review.</p><button type="button" class="importBtn pbpRemoveWindow">REMOVE CLOCK WINDOW</button>';box.querySelector('button').onclick=()=>{activeWindow=null;box.hidden=true;draw();};draw();status.textContent='Events within the selected lineup segment clock window. This does not establish tactical causation.';},draw};
    controllers.set(el,control);draw();return control;
  }
  function focus(scope,factor,team){const el=scope?.querySelector('.pbpExplorer');controllers.get(el)?.focus(factor,team);}
  function focusInterval(scope,window){const el=scope?.querySelector('.pbpExplorer'),control=controllers.get(el);if(control?.focusInterval)control.focusInterval(window);else control?.focus();}
  const api={category,side,events,filter,render,mount,focus,focusInterval};root.CourtIQPlayByPlay=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
