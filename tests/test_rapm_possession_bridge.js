const assert=require('node:assert/strict');
require('../lineup-engine');
require('../possession-engine');
require('../rapm-engine');
const bridge=require('../rapm-possession-bridge');

const H=['H1','H2','H3','H4','H5'],A=['A1','A2','A3','A4','A5'];
const roster=names=>names.map((name,i)=>({name,starter:i<5}));
const e=(clock,side,player,type,score)=>({period:1,clock,side,player,type,score});
function game(id){return {id,home:'Home',away:'Away',hs:4,as:2,status:'live',players:{home:roster(H),away:roster(A)},playByPlay:[
 e('10:00','home','H1','jumpball','0-0'),e('09:40','home','H1','fgm','2-0'),e('09:20','away','A1','fga','2-0'),e('09:18','home','H2','dreb','2-0'),e('09:00','home','H3','turnover','2-0'),e('08:40','away','A2','fgm','2-2'),e('08:20','home','H4','fgm','4-2'),e('08:00','away','A3','turnover','4-2')
]};}

const rows=[game('g1'),game('g2')];
const extracted=bridge.extractGames(rows);
assert.equal(extracted.coverage.games,2);
assert.equal(extracted.coverage.gamesFromPossessionEngine,2);
assert.equal(extracted.coverage.gamesWithPossessionStints,2);
assert.equal(extracted.coverage.certifiedPossessions,12);
assert.equal(extracted.stints.length,2);
assert.equal(extracted.coverage.totalPossessions,12);

const model=globalThis.CourtIQRAPM.fitGames(rows,{force:true,minGames:1,minStints:1,minPossessions:1});
assert.equal(model.status,'READY');
assert.equal(model.sourceCoverage.gamesFromPossessionEngine,2);
assert.equal(model.coverage.players,10);
assert.ok(model.players.some(p=>p.name==='H1'));
console.log('RAPM bridge: official PBP -> certified possessions -> paired 5v5 stints -> ridge model passed.');