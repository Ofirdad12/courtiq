const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync('opponent-workspace-v222.js','utf8');
const sandbox={console,window:{},document:undefined};
vm.createContext(sandbox);vm.runInContext(src,sandbox);
const Core=sandbox.window.CourtIQOpponentWorkspace.Core;
function ok(v,m){if(!v)throw new Error(m)}
const teams=Core.candidateTeams([{home:'A',away:'B'},{home:'A',away:'C'},{home:'B',away:'A'}]);
ok(teams[0].name==='A'&&teams[0].games===3,'team frequency ordering failed');
const split=Core.splitDecisions([{title:'איפה לבדוק אותם בהתקפה',action:'בדיקה'},{title:'ריבאונד',action:'להגן על הריבאונד'}]);
ok(split.attack.length===1&&split.defend.length===1,'decision split failed');
const trend=Core.trendSignals({ready:true,deltas:{pf:5,pa:-2,efg:8,three:3,tov:-4,oreb:1}});
ok(trend.length===4&&trend[0].key==='efg','trend ranking failed');
ok(Core.sampleBand(2).level==='THIN'&&Core.sampleBand(3).level==='USABLE'&&Core.sampleBand(5).level==='STRONG','sample bands failed');
const S={teamGames:(games,team)=>games.filter(g=>g.home===team||g.away===team)};
const scoped=Core.scopeGames([{home:'A',away:'B',comp:'X'},{home:'A',away:'C',comp:'Y'},{home:'D',away:'A',comp:'X'}],'A','X','3',S);
ok(scoped.length===2&&scoped.every(g=>g.comp==='X'),'scope filter failed');
console.log('opponent-workspace-v222 tests passed');
