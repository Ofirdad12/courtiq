/* CourtIQ Possession Engine
 * Reconstructs event-level possessions from official play-by-play and certifies
 * them only when scoring + 5v5 lineup context are supported by the source.
 */
(function(root){
  'use strict';
  const VERSION='1.0.0';
  let lineupApi=root.CourtIQLineupEngine||null;
  if(!lineupApi&&typeof module!=='undefined'&&module.exports){try{lineupApi=require('./lineup-engine')}catch(_){}}

  const sides=['home','away'];
  const other=s=>s==='home'?'away':'home';
  const norm=v=>String(v??'').normalize('NFKC').replace(/\s+/g,' ').trim();
  const low=v=>norm(v).toLowerCase();
  const finite=v=>Number.isFinite(Number(v))?Number(v):null;
  const periodLength=p=>Number(p)<=4?600:300;
  const clock=v=>{const m=String(v??'').match(/^(\d{1,2}):([0-5]\d)$/);return m?Number(m[1])*60+Number(m[2]):null;};
  const score=v=>{const m=String(v??'').match(/^(\d+)\s*[-:–]\s*(\d+)$/);return m?[Number(m[1]),Number(m[2])]:null;};
  const validFive=v=>Array.isArray(v)&&v.length===5&&v.every(x=>norm(x))&&new Set(v.map(norm)).size===5;

  function gamePayload(row){
    const p=row?.payload;
    if(!p)return row||{};
    if(typeof p==='string'){try{return {...row,...JSON.parse(p)}}catch(_){return row||{}}}
    return {...row,...p};
  }
  function eventSide(G,e){
    if(sides.includes(e?.side))return e.side;
    const team=norm(e?.team||e?.team_name||e?.teamName);
    const home=norm(G.home||G.home_team),away=norm(G.away||G.away_team);
    if(team&&team===home)return 'home';if(team&&team===away)return 'away';return null;
  }
  function fallbackKind(e){
    const t=low(e?.type||e?.event_type||e?.actionType).replace(/[-_\s]/g,''),d=low(e?.description||e?.action);
    if(['threepm','3pm','3ptmade','3fgm'].includes(t)||/(?:made|makes|קליעה).*(?:3pt|3-point|3 נק)/.test(d))return '3m';
    if(['threepa','3pa','3ptmissed','3fga'].includes(t)||/(?:miss|החטיא).*(?:3pt|3-point|3 נק)/.test(d))return '3a';
    if(['fgm','2pm','2ptmade','2fgm'].includes(t))return Number(e?.value)===3?'3m':'2m';
    if(['fga','2pa','2ptmissed','2fga'].includes(t))return Number(e?.value)===3?'3a':'2a';
    if(['ftm','freethrowmade'].includes(t)||/free throw.*(?:made|makes)|קליעת עונשין/.test(d))return '1m';
    if(['fta','freethrowmissed'].includes(t)||/free throw.*miss|זריקת עונשין.*החטיא/.test(d))return '1a';
    if(['to','tov','turnover'].includes(t)||/turnover|איבוד כדור/.test(d))return 'to';
    if(['subin','substitutionin','substitutionon','in'].includes(t))return 'in';
    if(['subout','substitutionout','substitutionoff','out'].includes(t))return 'out';
    if(/jump.?ball|כדור ביניים/.test(t+' '+d))return 'jump';
    if(/end.*period|period.*end|quarter.*end|סיום רבע/.test(t+' '+d)||['end','periodend','quarterend'].includes(t))return 'end';
    return 'other';
  }
  function kind(e){try{return lineupApi?.kind?.(e)||fallbackKind(e)}catch(_){return fallbackKind(e)}}
  function reboundType(e,currentOffense=null){
    const t=low(e?.type||e?.event_type||e?.actionType).replace(/[-_\s]/g,''),d=low(e?.description||e?.action),s=e._side;
    if(['off','oreb','offensiverebound'].includes(t)||/offensive rebound|ריבאונד התקפה/.test(d))return 'off';
    if(['def','dreb','defensiverebound'].includes(t)||/defensive rebound|ריבאונד הגנה/.test(d))return 'def';
    if(['reb','rebound'].includes(t)||/rebound|ריבאונד/.test(d)){
      if(currentOffense&&s)return s===currentOffense?'off':'def';
      return 'unknown';
    }
    return null;
  }
  function isTechnical(e){return /technical|unsportsmanlike|flagrant|טכנית|בלתי ספורטיבית/.test(low(e?.description||e?.action||e?.type));}
  function isLiveKind(k){return ['2m','2a','3m','3a','1m','1a','to','jump'].includes(k);}

  function rawEvents(G){const a=G?.playByPlay??G?.play_by_play??G?.pbp??G?._pbp;return Array.isArray(a)?a:[];}
  function prepareEvents(G){
    const raw=rawEvents(G),out=[];
    raw.forEach((e,i)=>{
      if(!e||typeof e!=='object'||Array.isArray(e))return;
      const p=finite(e.period),r=clock(e.clock);
      if(!Number.isInteger(p)||p<1||r==null||r>periodLength(p))return;
      out.push({...e,_sourceIndex:i,_period:p,_remain:r,_elapsed:periodLength(p)-r,_side:eventSide(G,e),_kind:kind(e)});
    });
    if(out.length>1){const a=out[0],b=out[out.length-1];if(a._period>b._period||(a._period===b._period&&a._remain<b._remain))out.reverse();}
    return out.map((e,i)=>({...e,_i:i}));
  }

  function finalScore(G){
    const h=finite(G.hs??G.home_score??G?.raw?.home?.points),a=finite(G.as??G.away_score??G?.raw?.away?.points);
    return h!=null&&a!=null?[h,a]:null;
  }
  function directSnapshot(e){
    const h=finite(e.home_score??e.homeScore),a=finite(e.away_score??e.awayScore);if(h!=null&&a!=null)return [h,a];
    const s=e.score;if(Array.isArray(s)&&s.length>=2&&finite(s[0])!=null&&finite(s[1])!=null)return [Number(s[0]),Number(s[1])];
    if(s&&typeof s==='object'){const x=finite(s.home??s.home_score??s.homeScore),y=finite(s.away??s.away_score??s.awayScore);if(x!=null&&y!=null)return [x,y];}
    return score(s);
  }
  function scoringAudit(events,G){
    const final=finalScore(G),action={home:0,away:0};
    for(const e of events)if(e._side&&['1m','2m','3m'].includes(e._kind))action[e._side]+=Number(e._kind[0]);
    if(final&&action.home===final[0]&&action.away===final[1]){
      return {reliable:true,mode:'RECONCILED_SCORING_EVENTS',points:new Map(events.filter(e=>e._side&&['1m','2m','3m'].includes(e._kind)).map(e=>[e._i,{side:e._side,points:Number(e._kind[0])}])),action,final};
    }
    const snaps=events.map(e=>({e,s:directSnapshot(e)})).filter(x=>x.s);
    let orientation=null;
    if(snaps.length&&final){const last=snaps.at(-1).s;if(last[0]===final[0]&&last[1]===final[1])orientation=0;else if(last[1]===final[0]&&last[0]===final[1])orientation=1;}
    if(orientation==null&&snaps.length){
      const votes=[0,0];let prev=[0,0];
      for(const {e,s} of snaps){const d=[s[0]-prev[0],s[1]-prev[1]];if(e._side&&['1m','2m','3m'].includes(e._kind)&&d.every(x=>x>=0)&&d.filter(x=>x>0).length===1){const ix=d[0]>0?0:1;votes[ix===(e._side==='home'?0:1)?0:1]++;}prev=s;}
      if(Math.max(...votes)>=2&&Math.max(...votes)/Math.max(1,votes[0]+votes[1])>=.9)orientation=votes[0]>votes[1]?0:1;
    }
    const points=new Map();let prev=[0,0],invalid=0;
    if(orientation!=null){
      for(const {e,s} of snaps){const cur=orientation===0?s:[s[1],s[0]],d=[cur[0]-prev[0],cur[1]-prev[1]];if(d.some(x=>x<0||x>4)||d.filter(x=>x>0).length>1){invalid++;prev=cur;continue;}if(d[0]>0)points.set(e._i,{side:'home',points:d[0]});if(d[1]>0)points.set(e._i,{side:'away',points:d[1]});prev=cur;}
    }
    const sums={home:0,away:0};for(const v of points.values())sums[v.side]+=v.points;
    const reliable=Boolean(orientation!=null&&(!final||(sums.home===final[0]&&sums.away===final[1]))&&!invalid);
    if(reliable)return {reliable:true,mode:'RECONCILED_SCORE_SNAPSHOTS',points,action,final,orientation};
    const partial=events.some(e=>e._side&&['1m','2m','3m'].includes(e._kind));
    const fallback=new Map(events.filter(e=>e._side&&['1m','2m','3m'].includes(e._kind)).map(e=>[e._i,{side:e._side,points:Number(e._kind[0])}]));
    return {reliable:!final&&partial,mode:!final&&partial?'LIVE_ACTION_EVENTS':'UNRECONCILED_SCORING',points:fallback,action,final,orientation};
  }

  function lineupCoverage(G){
    let result=null;try{result=lineupApi?.derive?.(G)||null}catch(_){}
    const stints=result?.lineupStints||[];
    return {result,stints};
  }
  function coveringLineup(stints,side,pos){
    if(pos.period==null||pos.startRemain==null||pos.endRemain==null)return null;
    const matches=stints.filter(s=>s.side===side&&Number(s.period)===Number(pos.period)&&validFive(s.players)).filter(s=>{
      const a=clock(s.startClock),b=clock(s.endClock);if(a==null||b==null)return false;
      return a>=pos.startRemain&&b<=pos.endRemain;
    });
    if(matches.length!==1)return null;
    return matches[0].players.map(norm);
  }

  function derive(input){
    const G=gamePayload(input),events=prepareEvents(G),audit=scoringAudit(events,G),lineups=lineupCoverage(G),possessions=[],gaps=[];
    const quality={version:VERSION,status:'NO_PBP',events:events.length,rawEvents:rawEvents(G).length,scoreMode:audit.mode,scoringReliable:audit.reliable,lineupStatus:lineups.result?.quality?.status||'NO_LINEUPS',possessions:0,certifiedPossessions:0,uncertifiedPossessions:0,pairedStints:0,homePossessions:0,awayPossessions:0,homePoints:0,awayPoints:0,gaps,warnings:[]};
    if(!events.length)return {version:VERSION,possessions,rapmStints:[],quality};

    let current=null,serial=0;
    const begin=(e,offense,unsafeReason=null)=>{
      current={id:'pos-'+(++serial),period:e._period,offense,startIndex:e._i,endIndex:e._i,startClock:e.clock,endClock:e.clock,startRemain:e._remain,endRemain:e._remain,points:0,attempts:0,freeThrows:0,turnovers:0,offensiveRebounds:0,events:[],pendingEnd:null,unsafeReasons:unsafeReason?[unsafeReason]:[]};
    };
    const addEvent=e=>{if(!current)return;current.events.push(e._sourceIndex);current.endIndex=e._i;current.endClock=e.clock;current.endRemain=e._remain;};
    const addScore=e=>{
      const s=audit.points.get(e._i);if(!s)return;
      if(!current){begin(e,s.side,'scoring event without a possession start');}
      if(current.offense!==s.side){current.unsafeReasons.push('score assigned to the opposite side of the reconstructed possession');return;}
      current.points+=s.points;
    };
    const finish=(endEvent,reason,forcedUnsafe=null)=>{
      if(!current)return;
      if(endEvent){current.endIndex=endEvent._i;current.endClock=endEvent.clock;current.endRemain=endEvent._remain;}
      if(forcedUnsafe)current.unsafeReasons.push(forcedUnsafe);
      current.endReason=reason;
      current.homePlayers=coveringLineup(lineups.stints,'home',current);
      current.awayPlayers=coveringLineup(lineups.stints,'away',current);
      if(!current.homePlayers||!current.awayPlayers)current.unsafeReasons.push('5v5 lineup is not uniquely certified across the full possession');
      if(!audit.reliable)current.unsafeReasons.push('game scoring sequence is not fully reconciled');
      current.certified=current.unsafeReasons.length===0;
      possessions.push(current);
      if(!current.certified)gaps.push({possession:current.id,period:current.period,clock:current.startClock+'–'+current.endClock,reasons:[...new Set(current.unsafeReasons)]});
      current=null;
    };
    const pendingCanContinue=e=>{
      if(!current?.pendingEnd)return false;
      if(['1m','1a'].includes(e._kind)&&e._side===current.offense&&!isTechnical(e))return true;
      if(['in','out','other'].includes(e._kind)&&Number(e._period)===Number(current.period)&&e._remain===current.pendingEnd._remain)return true;
      const d=low(e.description||e.action||e.type);return Number(e._period)===Number(current.period)&&e._remain===current.pendingEnd._remain&&/foul|עבירה|assist|אסיסט|timeout|פסק זמן/.test(d);
    };

    for(const e of events){
      if(current&&Number(e._period)!==Number(current.period))finish(current.pendingEnd||events[current.endIndex]||null,'period_boundary','possession crosses a period boundary');
      if(current?.pendingEnd&&!pendingCanContinue(e)){const end=current.pendingEnd;finish(end,'made_score');}

      const rb=reboundType(e,current?.offense||null),k=e._kind,s=e._side;
      if(k==='end'){
        if(current)finish(e,'period_end');
        continue;
      }
      if(k==='jump'){
        if(current)finish(e,'jump_ball','jump-ball possession change is not certified without an explicit control event');
        continue;
      }
      if(rb){
        if(current){
          addEvent(e);addScore(e);
          const type=rb==='unknown'&&s?(s===current.offense?'off':'def'):rb;
          if(type==='off'){current.offensiveRebounds++;}
          else if(type==='def'){if(!s||s===current.offense)finish(e,'rebound','defensive rebound side is inconsistent with offense');else finish(e,'defensive_rebound');}
          else current.unsafeReasons.push('rebound type cannot be determined');
        }
        continue;
      }

      if(isLiveKind(k)){
        if(!s){if(current)current.unsafeReasons.push('live-ball event has no team side');continue;}
        if(!current)begin(e,s,isTechnical(e)?'technical/unsportsmanlike free throw is not treated as a normal possession':null);
        else if(current.offense!==s){finish(events[current.endIndex]||e,'implicit_change','possession changed sides without a certified terminal event');begin(e,s,'possession started after an implicit side change');}
        addEvent(e);addScore(e);
        if(['2m','2a','3m','3a'].includes(k))current.attempts++;
        if(['1m','1a'].includes(k)){current.freeThrows++;if(isTechnical(e))current.unsafeReasons.push('technical/unsportsmanlike free throw sequence');}
        if(k==='to'){current.turnovers++;finish(e,'turnover');continue;}
        if(['2m','3m'].includes(k)){current.pendingEnd=e;continue;}
        if(k==='1m'){current.pendingEnd=e;continue;}
        if(k==='1a'){current.pendingEnd=null;continue;}
        continue;
      }

      if(current){addEvent(e);addScore(e);}
      else if(audit.points.has(e._i)){const sc=audit.points.get(e._i);begin(e,sc.side,'score snapshot changed on a non-possession event');addEvent(e);addScore(e);current.pendingEnd=e;}
    }
    if(current)finish(current.pendingEnd||events[current.endIndex]||null,current.pendingEnd?'made_score':'feed_end',current.pendingEnd?null:'play-by-play ended before a certified possession terminal event');

    const certified=possessions.filter(p=>p.certified);
    quality.possessions=possessions.length;quality.certifiedPossessions=certified.length;quality.uncertifiedPossessions=possessions.length-certified.length;
    for(const p of certified){quality[p.offense+'Possessions']++;quality[p.offense+'Points']+=p.points;}

    const grouped=new Map();
    for(const p of certified){
      if(!validFive(p.homePlayers)||!validFive(p.awayPlayers))continue;
      const h=[...p.homePlayers].sort(),a=[...p.awayPlayers].sort(),key=[p.period,h.join('|'),a.join('|')].join('::');
      if(!grouped.has(key))grouped.set(key,{period:p.period,homePlayers:h,awayPlayers:a,homePoints:0,awayPoints:0,homePossessions:0,awayPossessions:0,seconds:0,possessionIds:[]});
      const g=grouped.get(key);g[p.offense+'Possessions']++;g[p.offense+'Points']+=p.points;g.possessionIds.push(p.id);
      const dur=Math.max(0,(p.startRemain??0)-(p.endRemain??0));g.seconds+=dur;
    }
    const rapmStints=[...grouped.values()].filter(g=>g.homePossessions>0&&g.awayPossessions>0);
    quality.pairedStints=rapmStints.length;
    const final=finalScore(G),certifiedScoreComplete=final&&quality.homePoints===final[0]&&quality.awayPoints===final[1]&&quality.uncertifiedPossessions===0;
    quality.status=!lineups.stints.length?'NO_LINEUPS':!audit.reliable?'UNRECONCILED_SCORING':quality.uncertifiedPossessions?'PARTIAL':certifiedScoreComplete||!final?'COMPLETE':'PARTIAL';
    if(!audit.reliable)quality.warnings.push('Final score could not be reconciled from the possession event stream; RAPM stints are blocked for this game.');
    if(!lineups.stints.length)quality.warnings.push('No certified 5v5 lineup intervals are available.');
    if(quality.uncertifiedPossessions)quality.warnings.push(quality.uncertifiedPossessions+' reconstructed possessions were excluded from RAPM because their event or lineup context is incomplete.');
    const publishable=audit.reliable&&rapmStints.length>0;
    return {version:VERSION,possessions,rapmStints:publishable?rapmStints:[],quality};
  }

  function attach(game){const result=derive(game);game.possessionData=result;game.possessionStints=result.rapmStints;return result;}
  const api={version:VERSION,derive,attach,prepareEvents,reboundType,scoringAudit};
  root.CourtIQPossessionEngine=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
