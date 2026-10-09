(function(){
  'use strict';

  const VIEW='data-science';
  const VERSION='1.0.0';

  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  const num=value=>{
    const n=Number(String(value??'').replace('%',''));
    return Number.isFinite(n)?n:null;
  };
  const fmt=(value,digits=1)=>Number.isFinite(value)?value.toFixed(digits):'—';
  const pct=(value,digits=1)=>Number.isFinite(value)?value.toFixed(digits)+'%':'—';
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

  function factorMap(G){
    const out={};
    (G?.factors||[]).forEach(row=>{
      if(!Array.isArray(row)||row.length<3)return;
      out[String(row[0]).toLowerCase()]={home:num(row[1]),away:num(row[2])};
    });
    return out;
  }

  function metricMap(G){
    const out={};
    (G?.metrics||[]).forEach(row=>{
      if(!Array.isArray(row)||row.length<3)return;
      out[String(row[0]).toLowerCase()]={home:num(row[1]),away:num(row[2]),rawHome:row[1],rawAway:row[2]};
    });
    return out;
  }

  function readTeamMetrics(G){
    const calc=G?.calculated||{};
    const metrics=metricMap(G);
    const factors=factorMap(G);
    const home=calc.home||{};
    const away=calc.away||{};
    const pick=(obj,key,fallback)=>Number.isFinite(num(obj?.[key]))?num(obj[key]):fallback;
    return {
      home:{
        ortg:pick(home,'ortg',metrics['offensive rating']?.home),
        drtg:pick(home,'drtg',metrics['defensive rating']?.home),
        net:pick(home,'net_rating',metrics['net rating']?.home),
        pace:pick(home,'pace',metrics['pace']?.home),
        efg:pick(home,'efg',factors['efg%']?.home),
        tov:pick(home,'tov',factors['tov%']?.home),
        orb:pick(home,'orb',factors['orb%']?.home),
        ftr:pick(home,'ftr',factors['ftr']?.home),
        ts:pick(home,'ts',null)
      },
      away:{
        ortg:pick(away,'ortg',metrics['offensive rating']?.away),
        drtg:pick(away,'drtg',metrics['defensive rating']?.away),
        net:pick(away,'net_rating',metrics['net rating']?.away),
        pace:pick(away,'pace',metrics['pace']?.away),
        efg:pick(away,'efg',factors['efg%']?.away),
        tov:pick(away,'tov',factors['tov%']?.away),
        orb:pick(away,'orb',factors['orb%']?.away),
        ftr:pick(away,'ftr',factors['ftr']?.away),
        ts:pick(away,'ts',null)
      }
    };
  }

  function edgeModel(G){
    const t=readTeamMetrics(G);
    const diffs={
      efg:(t.home.efg??0)-(t.away.efg??0),
      tov:(t.away.tov??0)-(t.home.tov??0),
      orb:(t.home.orb??0)-(t.away.orb??0),
      ftr:(t.home.ftr??0)-(t.away.ftr??0)
    };
    const raw=diffs.efg*0.40+diffs.tov*0.25+diffs.orb*0.20+diffs.ftr*0.15;
    const score=clamp(50+raw,0,100);
    return {score,diffs,metrics:t};
  }

  function dataReadiness(G){
    const hasPlayers=Boolean(G?.players?.home?.length&&G?.players?.away?.length);
    const hasPbp=Boolean(G?.pbp?.length||G?.playByPlay?.length||G?._pbp?.length);
    const hasLineups=Boolean(G?.lineups?.length||G?._lineups?.length||G?.lineupStints?.length);
    const saved=Boolean(G?._dbId);
    const official=Boolean(G?.sourceUrl||G?.sourceLabel);
    const gameCount=num(G?.seasonGameCount)||num(G?._seasonGames)||null;
    return {hasPlayers,hasPbp,hasLineups,saved,official,gameCount};
  }

  function readinessCard(label,status,text,tone){
    return `<article class="ds-readiness ${tone||''}"><div><b>${esc(label)}</b><span class="ds-status">${esc(status)}</span></div><p>${esc(text)}</p></article>`;
  }

  function featureRows(G){
    const t=readTeamMetrics(G);
    const rows=[
      ['eFG%',t.home.efg,t.away.efg,'Shot-value efficiency'],
      ['TOV%',t.home.tov,t.away.tov,'Possession protection'],
      ['ORB%',t.home.orb,t.away.orb,'Extra-possession creation'],
      ['FTr',t.home.ftr,t.away.ftr,'Free-throw pressure'],
      ['ORtg',t.home.ortg,t.away.ortg,'Points per 100 possessions'],
      ['Net Rating',t.home.net,t.away.net,'Scoring margin per 100 possessions'],
      ['Pace',t.home.pace,t.away.pace,'Possession environment']
    ];
    return rows.filter(r=>Number.isFinite(r[1])||Number.isFinite(r[2])).map(([name,h,a,meaning])=>
      `<tr><td><b>${esc(name)}</b><small>${esc(meaning)}</small></td><td>${fmt(h)}</td><td>${fmt(a)}</td><td>${Number.isFinite(h)&&Number.isFinite(a)?fmt(h-a):'—'}</td></tr>`
    ).join('');
  }

  function coachTranslation(G,model){
    const home=G?.home||'Home';
    const d=model.diffs;
    const signals=[
      {name:'Shot quality / conversion',value:d.efg,positive:d.efg>=0,copy:`${home} eFG edge: ${fmt(d.efg)} pts`},
      {name:'Possession security',value:d.tov,positive:d.tov>=0,copy:`TOV% advantage: ${fmt(d.tov)} pts`},
      {name:'Offensive glass',value:d.orb,positive:d.orb>=0,copy:`ORB% edge: ${fmt(d.orb)} pts`},
      {name:'Rim / FT pressure',value:d.ftr,positive:d.ftr>=0,copy:`FTr edge: ${fmt(d.ftr)} pts`}
    ].sort((a,b)=>Math.abs(b.value)-Math.abs(a.value));
    return signals.slice(0,3).map((s,i)=>`<div class="ds-coach-line"><span>${i+1}</span><div><b>${esc(s.name)}</b><p>${esc(s.copy)}. ${s.positive?'This supported the home-team profile.':'This favored the opponent and deserves review.'}</p></div></div>`).join('');
  }

  function playerFeatureSummary(G){
    const players=[...(G?.players?.home||[]),...(G?.players?.away||[])];
    if(!players.length){
      return `<div class="ds-empty">Player feature engineering becomes available after a complete official player box score is imported.</div>`;
    }
    const ranked=players
      .filter(p=>Number(p.minutes||0)>0)
      .map(p=>({
        name:p.name||'Player',
        team:(G.players.home||[]).includes(p)?G.home:G.away,
        ts:num(p.ts),efg:num(p.efg),playEnd:num(p.play_end_share),per40:num(p.points_per_40),astTo:num(p.ast_to)
      }))
      .sort((a,b)=>(b.playEnd??0)-(a.playEnd??0))
      .slice(0,5);
    return `<div class="ds-player-list">${ranked.map(p=>`<div class="ds-player-row"><div><b>${esc(p.name)}</b><small>${esc(p.team)}</small></div><span>TS ${pct(p.ts)}</span><span>eFG ${pct(p.efg)}</span><span>Play-end ${pct(p.playEnd)}</span><span>PTS/40 ${fmt(p.per40)}</span></div>`).join('')}</div>`;
  }

  function render(G){
    const model=edgeModel(G);
    const ready=dataReadiness(G);
    const score=model.score;
    const lean=score>=52?G.home:score<=48?G.away:'Balanced';
    const rapmReady=ready.hasPbp&&ready.hasLineups;
    const seasonReady=ready.gameCount&&ready.gameCount>=8;
    return `<section class="gameViewPanel basketballDataScience" data-game-view="${VIEW}" hidden>
      <div class="ds-hero">
        <div>
          <small>BASKETBALL DATA SCIENCE · COURTIQ LAB</small>
          <h3>From official data to explainable basketball models</h3>
          <p>Feature engineering, sample-aware impact analysis, model readiness and coach-facing decisions — without fabricating unavailable metrics.</p>
        </div>
        <div class="ds-badge"><span>DATA → MODEL → DECISION</span><b>v${VERSION}</b></div>
      </div>

      <div class="ds-grid ds-grid-4">
        <article class="ds-card ds-score-card">
          <small>FOUR-FACTOR EDGE SIGNAL</small>
          <strong>${fmt(score,0)}</strong>
          <span>/100 · ${esc(lean)}</span>
          <div class="ds-meter"><i style="width:${fmt(score,0)}%"></i></div>
          <p>Transparent heuristic for this game only — not a trained win-probability model.</p>
        </article>
        <article class="ds-card"><small>SHOT EFFICIENCY</small><strong>${fmt(model.metrics.home.efg)}</strong><span>eFG% · ${esc(G.home||'Home')}</span><p>${esc(G.away||'Away')}: ${fmt(model.metrics.away.efg)}%</p></article>
        <article class="ds-card"><small>POSSESSION CONTROL</small><strong>${fmt(model.diffs.tov)}</strong><span>TOV% edge</span><p>Positive = home team protected possessions better.</p></article>
        <article class="ds-card"><small>MODEL CONFIDENCE</small><strong>${ready.hasPbp?'PBP':'BOX'}</strong><span>${ready.hasPbp?'event-level data':'box-score level'}</span><p>${ready.hasLineups?'Lineup stints detected.':'Lineup-level causal models need more data.'}</p></article>
      </div>

      <div class="ds-grid ds-grid-2">
        <article class="ds-panel">
          <div class="ds-heading"><div><small>FEATURE ENGINEERING</small><h4>Basketball model inputs</h4></div><span>Explainable</span></div>
          <div class="ds-table-wrap"><table class="ds-table"><thead><tr><th>Feature</th><th>${esc(G.home||'Home')}</th><th>${esc(G.away||'Away')}</th><th>Δ</th></tr></thead><tbody>${featureRows(G)||'<tr><td colspan="4">Import a complete game to generate model features.</td></tr>'}</tbody></table></div>
        </article>

        <article class="ds-panel">
          <div class="ds-heading"><div><small>ADVANCED IMPACT MODELS</small><h4>EPM / RAPM readiness</h4></div><span>No fake metrics</span></div>
          <div class="ds-readiness-list">
            ${readinessCard('RAPM',rapmReady&&seasonReady?'READY TO ESTIMATE':'NOT YET',rapmReady?'Lineup possessions are available; a stable estimate still requires a meaningful multi-game sample.':'Requires possession-level lineup stints plus a multi-game sample.',rapmReady?'good':'warn')}
            ${readinessCard('EPM','REFERENCE / EXTERNAL MODEL','EPM is a model-based impact metric. CourtIQ should ingest a licensed/source value or train its own documented model rather than infer EPM from one box score.','neutral')}
            ${readinessCard('On/Off',ready.hasLineups?'PIPELINE READY':'NEEDS LINEUPS',ready.hasLineups?'Lineup stints detected; CourtIQ can aggregate on/off splits across the season.':'Requires reliable substitutions or lineup stints from play-by-play.','')}
            ${readinessCard('Prediction',seasonReady?'SEASON SAMPLE':'BUILDING SAMPLE',seasonReady?'Enough season history is signaled for rolling forecasts with validation.':'Collect multiple games before presenting next-game forecasts as reliable.','')}
          </div>
        </article>
      </div>

      <div class="ds-grid ds-grid-2">
        <article class="ds-panel">
          <div class="ds-heading"><div><small>PLAYER DATA SCIENCE</small><h4>Engineered player features</h4></div><span>Single-game context</span></div>
          ${playerFeatureSummary(G)}
          <p class="ds-footnote">Use these as features, not final talent grades. Stable player evaluation requires role, opponent, lineup and sample-size context.</p>
        </article>
        <article class="ds-panel">
          <div class="ds-heading"><div><small>COACH TRANSLATION</small><h4>What the model says to investigate</h4></div><span>Decision support</span></div>
          <div class="ds-coach-list">${coachTranslation(G,model)}</div>
          <div class="ds-rule">Model signal ≠ tactical cause. Use video and play-by-play to verify why the edge happened.</div>
        </article>
      </div>

      <article class="ds-panel ds-pipeline">
        <div class="ds-heading"><div><small>COURTIQ DATA SCIENCE PIPELINE</small><h4>Professional workflow</h4></div><span>Repeatable</span></div>
        <div class="ds-steps">
          <div><b>01</b><span>Official Data</span><small>Box score · PBP · lineups</small></div>
          <i>→</i><div><b>02</b><span>Feature Engineering</span><small>TS · eFG · Four Factors · roles</small></div>
          <i>→</i><div><b>03</b><span>Context</span><small>Opponent · lineup · sample size</small></div>
          <i>→</i><div><b>04</b><span>Models</span><small>Impact · forecast · anomaly</small></div>
          <i>→</i><div><b>05</b><span>Coach Decision</span><small>What to keep · change · verify</small></div>
        </div>
      </article>
    </section>`;
  }

  function activateDataScience(tabs,panel){
    document.querySelectorAll('[data-game-view]').forEach(el=>{el.hidden=el!==panel;});
    tabs.querySelectorAll('[data-game-tab]').forEach(el=>el.classList.toggle('active',el.dataset.gameTab===VIEW));
    panel.hidden=false;
    panel.scrollIntoView({block:'start',behavior:'smooth'});
  }

  function install(){
    const tabs=document.querySelector('.tabs');
    const overview=document.querySelector('.kpis');
    const G=window.CourtIQActiveGame;
    if(!tabs||!overview||!G)return false;

    let panel=document.querySelector(`[data-game-view="${VIEW}"]`);
    if(!panel){
      overview.insertAdjacentHTML('beforebegin',render(G));
      panel=document.querySelector(`[data-game-view="${VIEW}"]`);
    }

    let button=tabs.querySelector(`[data-game-tab="${VIEW}"]`);
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.dataset.gameTab=VIEW;
      button.textContent='Data Science';
      const engine=tabs.querySelector('[data-game-tab="engine"]');
      if(engine?.nextSibling) tabs.insertBefore(button,engine.nextSibling); else tabs.appendChild(button);
    }
    button.onclick=()=>activateDataScience(tabs,panel);

    const pills=document.querySelector('.pills');
    if(pills&&!pills.querySelector('[data-open-data-science]')){
      const quick=document.createElement('button');
      quick.type='button';
      quick.className='importBtn primaryAction';
      quick.dataset.openDataScience='1';
      quick.textContent='DATA SCIENCE';
      quick.onclick=()=>activateDataScience(tabs,panel);
      pills.prepend(quick);
    }
    return true;
  }

  let scheduled=false;
  const schedule=()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;install();});
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();

  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.CourtIQBasketballDataScience={render,install,version:VERSION};
})();
