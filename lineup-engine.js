/* Reconstruct only supported on-court intervals from an official PBP feed.
 * No possession estimates; quarter starts require five identified players.
 */
(function(root){
  "use strict";
  const sides=["home","away"];
  const norm=v=>String(v??"").normalize("NFKC").replace(/[׳’'`".]/g,"").replace(/\s+/g," ").trim().toLowerCase();
  const clock=v=>{const m=String(v??"").match(/^(\d{1,2}):([0-5]\d)$/);return m?Number(m[1])*60+Number(m[2]):null;};
  const score=v=>{const m=String(v??"").match(/^(\d+)\s*[-:–]\s*(\d+)$/);return m?[Number(m[1]),Number(m[2])]:null;};
  const five=v=>Array.isArray(v)&&v.length===5&&v.every(x=>typeof x==="string"&&x.trim())&&new Set(v.map(norm)).size===5;
  function kind(e){
    const t=norm(e.type||e.actionType||"").replace(/[-_\s]/g,""),d=norm(e.description||e.action||"");
    if(["subin","substitutionin","substitutionon","in"].includes(t)||/שחק[ןנית]* נכנס|נכנסה|substitution in|sub in|enters the game|wchodzi/.test(d))return "in";
    if(["subout","substitutionout","substitutionoff","out"].includes(t)||/שחק[ןנית]* יוצא|יצאה|substitution out|sub out|leaves the game|schodzi/.test(d))return "out";
    if(["threepm","3pm","3ptmade","3fgm"].includes(t))return "3m";
    if(["threepa","3pa","3ptmissed","3fga"].includes(t))return "3a";
    if(["fgm","2pm","2ptmade","2fgm"].includes(t))return Number(e.value)===3||/3 נק|3pt|3-point/.test(d)?"3m":"2m";
    if(["fga","2pa","2ptmissed","2fga"].includes(t))return Number(e.value)===3||/3 נק|3pt|3-point/.test(d)?"3a":"2a";
    if(["ftm","freethrowmade"].includes(t))return "1m";
    if(["fta","freethrowmissed"].includes(t))return "1a";
    if(/(?:קליעה|החטיא|made|missed|makes|misses).*(?:3 נק|3pt|3-point)/.test(d))return /החטיא|miss/.test(d)?"3a":"3m";
    if(/(?:קליעה|החטיא|made|missed|makes|misses).*(?:2 נק|2pt|2-point)/.test(d))return /החטיא|miss/.test(d)?"2a":"2m";
    if(/קליעת עונשין|free throw.*(?:made|makes)|(?:makes|made).*free throw/.test(d))return "1m";
    if(/זריקת עונשין|free throw.*miss|miss.*free throw/.test(d))return "1a";
    if(["to","tov","turnover"].includes(t)||/איבוד כדור|turnover/.test(d))return "to";
    if(["ast","def","off","stl","pf","pfa","blk","jumpball","assist","rebound","steal","block","foul"].includes(t)||/ריבאונד|אסיסט|חטיפה|עבירה אישית|סחט עבירה|חסימה|rebound|assist|steal|block|personal foul/.test(d))return "court";
    return "other";
  }
  function derive(G){
    const raw=G.playByPlay||G.play_by_play||[],warnings=[],stints=[];
    const result={version:1,coordinateSystem:"FIBA_METERS_HALF",lineupStints:stints,shots:[],quality:{source:"PLAY_BY_PLAY",events:Array.isArray(raw)?raw.length:0,coverageSeconds:{home:0,away:0},expectedSeconds:0,warnings,status:"NO_PBP",scoreOrder:null}};
    const q=result.quality;
    if(!Array.isArray(raw)||!raw.length)return result;
    const rosters=Object.fromEntries(sides.map(s=>[s,new Map((G.players?.[s]||[]).map(p=>[norm(p.name),p.name]))]));
    const resolve=(s,v)=>rosters[s].get(norm(v))||(!rosters[s].size&&typeof v==="string"&&v.trim()?v.trim():null);
    const periodLength=p=>p<=4?600:300;
    const events=raw.map((e,i)=>({...e,_i:i,period:Number(e.period),remaining:clock(e.clock),side:sides.includes(e.side)?e.side:e.team===G.home?"home":e.team===G.away?"away":null,_kind:kind(e)}));
    const usable=events.filter(e=>Number.isInteger(e.period)&&e.period>0&&e.remaining!=null&&e.remaining<=periodLength(e.period));
    if(usable.length!==events.length)warnings.push((events.length-usable.length)+" events lack valid period/clock; their intervals are not certified.");
    if(events.some(e=>!usable.includes(e)&&e._kind!=="other")){q.status="INVALID_TIMELINE";warnings.push("An on-court or substitution event has no valid timestamp. Re-import a complete timeline.");return result;}
    usable.sort((a,b)=>a.period-b.period||b.remaining-a.remaining||a._i-b._i);
    if(!usable.length){q.status="INVALID_TIMELINE";return result;}
    // Infer orientation using the team attached to scoring events, then final totals.
    let prior=[0,0],votes=[0,0];
    usable.forEach(e=>{const next=score(e.score);if(!next)return;const delta=next.map((v,i)=>v-prior[i]);if(e.side&&/^[123]m$/.test(e._kind)&&delta.filter(x=>x>0).length===1&&delta.every(x=>x>=0)){const ix=delta[0]>0?0:1;votes[ix===(e.side==="home"?0:1)?0:1]++;}prior=next;});
    let order=G.scoreOrder==="home-away"?0:G.scoreOrder==="away-home"?1:null;
    if(order==null&&Math.max(...votes)>=2&&Math.max(...votes)/Math.max(1,votes[0]+votes[1])>=.9)order=votes[0]>votes[1]?0:1;
    const last=usable.map(e=>score(e.score)).filter(Boolean).at(-1),final=[Number(G.hs),Number(G.as)];
    if(order==null&&last&&final.every(Number.isFinite)&&final[0]!==final[1]){if(last[0]===final[0]&&last[1]===final[1])order=0;else if(last[1]===final[0]&&last[0]===final[1])order=1;}
    const actionTotals=sides.map(side=>usable.filter(e=>e.side===side&&/^[123]m$/.test(e._kind)).reduce((sum,e)=>sum+Number(e._kind[0]),0));
    const useActions=final.every(Number.isFinite)&&actionTotals.every((v,i)=>v===final[i])&&actionTotals.some(v=>v>0);
    q.scoringMode=useActions?"RECONCILED_SCORING_EVENTS":"SCORE_SNAPSHOTS";
    if(order==null&&!useActions){q.status="AMBIGUOUS_SCORE";warnings.push("Home/away score order could not be verified. No lineup scoring is published.");return result;}
    q.scoreOrder=order==null?"not_required":order===0?"home-away":"away-home";
    const readScore=e=>{const v=score(e.score);return v?(order===0?v:[v[1],v[0]]):null;};
    let currentScore=[0,0],serial=0;
    const maxPeriod=Math.max(...usable.map(e=>e.period));
    q.expectedSeconds=Array.from({length:maxPeriod},(_,i)=>periodLength(i+1)).reduce((a,b)=>a+b,0);
    const isFinal=(useActions||last&&final.every(Number.isFinite)&&(order===0?last:[...last].reverse()).every((v,i)=>v===final[i]))&&maxPeriod>=4&&!/live|in.progress/i.test(G.status||"");
    let allScoresReliable=true;
    for(let period=1;period<=maxPeriod;period++){
      const feed=usable.filter(e=>e.period===period),duration=periodLength(period);
      if(!feed.length){warnings.push("Q"+period+": no events; quarter omitted.");continue;}
      const state={},open={};
      const flush=(side,end)=>{
        const r=open[side];if(!r)return;
        r.seconds=end-r.startSecond;r.endClock=fmtClock(duration-end);
        if(r.seconds>0||r.pointsFor||r.pointsAgainst||r.fga||r.tov){
          q.coverageSeconds[side]+=r.seconds;delete r.startSecond;stints.push(r);
        }open[side]=null;
      };
      const begin=(side,time)=>{
        if(!five(state[side])){open[side]=null;return;}
        open[side]={id:"pbp-"+period+"-"+side+"-"+(++serial),side,players:[...state[side]],period,startClock:fmtClock(duration-time),startSecond:time,seconds:0,pointsFor:0,pointsAgainst:0,possessions:null,opponentPossessions:null,fgm:0,fga:0,threePm:0,tov:0};
      };
      for(const side of sides){
        const firstSeen=new Set(),required=new Set();
        for(const e of feed){if(e.side!==side||e._kind==="other")continue;const p=resolve(side,e.player);if(!p||firstSeen.has(p))continue;firstSeen.add(p);if(e._kind!=="in")required.add(p);}
        const starters=(G.players?.[side]||[]).filter(p=>p.starter===true).map(p=>p.name);
        const provided=G.periodLineups?.[period]?.[side];
        state[side]=five(provided)?provided.map(p=>resolve(side,p)||p):period===1&&five(starters)?starters:required.size===5?[...required]:null;
        if(!five(state[side]))warnings.push("Q"+period+" "+side+": initial five are not established; intervals omitted until an explicit lineup snapshot.");
        // First-quarter starter markers anchor tip-off. Later quarters need the feed from the boundary.
        const firstTime=duration-feed[0].remaining;
        const boundary=period===1&&five(starters)||firstTime===0;
        begin(side,boundary?0:firstTime);
        if(!boundary&&firstTime>0)warnings.push("Q"+period+" "+side+": opening "+firstTime+" seconds excluded (no quarter-boundary event).");
      }
      let index=0;
      while(index<feed.length){
        const e=feed[index],time=duration-e.remaining;
        // Explicit provider snapshots can restore a previously unknown lineup.
        for(const side of sides){
          const ps=e.lineups?.[side]||e[side+"Lineup"]||(e.side===side?e.lineup:null);
          if(five(ps)){const canonical=ps.map(p=>resolve(side,p)||p);if(!five(state[side])||norm([...state[side]].sort().join("|"))!==norm([...canonical].sort().join("|"))){flush(side,time);state[side]=canonical;begin(side,time);}}
        }
        if(e._kind==="in"||e._kind==="out"){
          const batch=[];let next=index;
          while(next<feed.length&&feed[next].remaining===e.remaining&&["in","out"].includes(feed[next]._kind)){batch.push(feed[next++]);}
          for(const side of sides){
            const subs=batch.filter(s=>s.side===side);if(!subs.length)continue;
            flush(side,time);
            const outs=subs.filter(s=>s._kind==="out").map(s=>resolve(side,s.player)),ins=subs.filter(s=>s._kind==="in").map(s=>resolve(side,s.player));
            const valid=five(state[side])&&outs.length===ins.length&&outs.every(p=>p&&state[side].includes(p))&&ins.every(p=>p&&!state[side].includes(p))&&new Set(outs).size===outs.length&&new Set(ins).size===ins.length;
            if(valid)state[side]=state[side].filter(p=>!outs.includes(p)).concat(ins);
            else{state[side]=null;warnings.push("Q"+period+" "+e.clock+" "+side+": incomplete or inconsistent substitution batch; later intervals omitted.");}
            begin(side,time);
          }
          // Substitution rows do not establish new scoring. Unexpected jumps invalidate the sample.
          if(!useActions)for(const s of batch){const snap=readScore(s);if(snap&&snap.some((v,i)=>v!==currentScore[i])){allScoresReliable=false;warnings.push("Score changed on a substitution row at Q"+period+" "+e.clock+". Scoring attribution unavailable.");currentScore=snap;}}
          index=next;continue;
        }
        if(e.side&&e._kind!=="other"){
          const p=resolve(e.side,e.player);
          if(p&&five(state[e.side])&&!state[e.side].includes(p)){flush(e.side,time);state[e.side]=null;warnings.push("Q"+period+" "+e.clock+" "+e.side+": action by off-court player; lineup becomes unknown.");}
        }
        const snap=readScore(e);
        if(useActions){
          const value=/^[123]m$/.test(e._kind)&&e.side?Number(e._kind[0]):0;
          if(value)for(const side of sides){const r=open[side];if(r){if(side===e.side)r.pointsFor+=value;else r.pointsAgainst+=value;}}
        }else if(snap){
          const delta=snap.map((v,i)=>v-currentScore[i]);
          if(delta.some(v=>v<0||v>3)||delta.filter(v=>v>0).length>1){allScoresReliable=false;warnings.push("Unresolved score correction / missing scoring sequence at Q"+period+" "+e.clock+".");}
          else for(const side of sides){const r=open[side];if(r){const i=side==="home"?0:1;r.pointsFor+=delta[i];r.pointsAgainst+=delta[1-i];}}
          currentScore=snap;
        }else if(/^[123]m$/.test(e._kind)){allScoresReliable=false;warnings.push("Scoring event without score snapshot at Q"+period+" "+e.clock+".");}
        const r=e.side?open[e.side]:null;
        if(r&&/^[23][ma]$/.test(e._kind)){r.fga++;if(e._kind.endsWith("m")){r.fgm++;if(e._kind==="3m")r.threePm++;}}
        if(r&&e._kind==="to")r.tov++;
        index++;
      }
      const end=period<maxPeriod||isFinal?duration:duration-feed.at(-1).remaining;
      for(const side of sides)flush(side,end);
    }
    if(!allScoresReliable){stints.length=0;q.coverageSeconds={home:0,away:0};q.status="UNRELIABLE_SCORE";return result;}
    // The timeline must agree with the final box score before it is called complete.
    const totals=Object.fromEntries(sides.map(s=>[s,stints.filter(r=>r.side===s).reduce((a,r)=>({seconds:a.seconds+r.seconds,pf:a.pf+r.pointsFor,pa:a.pa+r.pointsAgainst}),{seconds:0,pf:0,pa:0})]));
    const reconciled=sides.every((s,i)=>totals[s].seconds===q.expectedSeconds&&totals[s].pf===final[i]&&totals[s].pa===final[1-i]);
    q.status=reconciled&&usable.length===events.length&&isFinal?"COMPLETE":"PARTIAL";
    q.totals=totals;
    q.playerMinutes=sides.flatMap(side=>{
      const measured=new Map();
      stints.filter(r=>r.side===side).forEach(r=>r.players.forEach(p=>measured.set(p,(measured.get(p)||0)+r.seconds/60)));
      return (G.players?.[side]||[]).filter(p=>Number.isFinite(p.minutes)).map(p=>({side,player:p.name,box:p.minutes,pbp:measured.get(p.name)||0,delta:(measured.get(p.name)||0)-p.minutes}));
    });
    const differences=q.playerMinutes.filter(p=>Math.abs(p.delta)>.11);
    if(differences.length)warnings.push(differences.length+" player minute totals differ from the imported box score by more than 0.11 min. Shared minutes use PBP clocks; review the minute audit below.");
    // Shot/turnover counts are published only when their source totals reconcile.
    for(const side of sides){
      const ps=G.players?.[side]||[];
      const expectedFga=ps.length&&ps.every(p=>Number.isFinite(p.fga)||Number.isFinite(p.two_pa)&&Number.isFinite(p.three_pa))?ps.reduce((sum,p)=>sum+(p.fga??p.two_pa+p.three_pa),0):null;
      const actualFga=usable.filter(e=>e.side===side&&/^[23][ma]$/.test(e._kind)).length;
      const expectedTov=ps.length&&ps.every(p=>Number.isFinite(p.tov))?ps.reduce((sum,p)=>sum+p.tov,0):null;
      const actualTov=usable.filter(e=>e.side===side&&e._kind==="to").length;
      stints.filter(r=>r.side===side).forEach(r=>{if(!useActions||expectedFga==null||expectedFga!==actualFga){r.fgm=null;r.fga=null;r.threePm=null;}if(expectedTov==null||expectedTov!==actualTov)r.tov=null;});
    }
    return result;
  }
  function fmtClock(seconds){return String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");}
  const api={derive,kind};
  root.CourtIQLineupEngine=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
