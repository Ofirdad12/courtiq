const assert=require('assert');
const rapm=require('../rapm-engine.js');

function ids(team){return Array.from({length:6},(_,i)=>`${team}::${team}${i+1}`)}
const A=ids('A'),B=ids('B');
const o=new Map([...A,...B].map(p=>[p,0]));
const dAllowed=new Map([...A,...B].map(p=>[p,0]));
o.set('A::A6',8);o.set('A::A1',-3);dAllowed.set('A::A6',-4);dAllowed.set('A::A1',3);
o.set('B::B6',5);dAllowed.set('B::B6',-2);

const stints=[];
for(let game=1;game<=10;game++){
  for(let r=0;r<6;r++){
    const home=A.filter((_,i)=>i!==r),away=B.filter((_,i)=>i!==(r+game)%6),poss=10;
    const homeRate=105+home.reduce((s,p)=>s+o.get(p),0)+away.reduce((s,p)=>s+dAllowed.get(p),0);
    const awayRate=105+away.reduce((s,p)=>s+o.get(p),0)+home.reduce((s,p)=>s+dAllowed.get(p),0);
    stints.push({gameId:String(game),homePlayers:home,awayPlayers:away,homeLabels:home.map(x=>x.split('::')[1]),awayLabels:away.map(x=>x.split('::')[1]),homePoints:homeRate*poss/100,awayPoints:awayRate*poss/100,homePossessions:poss,awayPossessions:poss});
  }
}

const model=rapm.fit(stints,{lambda:100,minGames:8,minStints:30,minPossessions:700});
assert.strictEqual(model.status,'READY');
assert.strictEqual(model.coverage.games,10);
assert.strictEqual(model.coverage.stints,60);
assert.ok(Number.isFinite(model.diagnostics.weightedRMSE));
const a6=model.players.find(p=>p.id==='A::A6');
const a1=model.players.find(p=>p.id==='A::A1');
assert.ok(a6&&a1);
assert.ok(a6.oRAPM>a1.oRAPM,'positive offensive signal should survive ridge adjustment');
assert.ok(a6.dRAPM>a1.dRAPM,'better defensive signal should be positive after sign conversion');
assert.ok(a6.totalRAPM>a1.totalRAPM,'total RAPM should rank stronger synthetic player above weaker one');

const noPoss=rapm.extractGame({id:1,home:'H',away:'A',rapmStints:[{homePlayers:['h1','h2','h3','h4','h5'],awayPlayers:['a1','a2','a3','a4','a5'],homePoints:2,awayPoints:0}]});
assert.deepStrictEqual(noPoss,[],'stints without explicit possessions must never enter RAPM');

const direct=rapm.extractGame({id:2,home:'Home',away:'Away',rapmStints:[{homePlayers:['h1','h2','h3','h4','h5'],awayPlayers:['a1','a2','a3','a4','a5'],homePoints:5,awayPoints:3,homePossessions:4,awayPossessions:4}]});
assert.strictEqual(direct.length,1);
assert.strictEqual(direct[0].homePlayers[0],'Home::h1');
assert.strictEqual(direct[0].homePossessions,4);

const blocked=rapm.fit(direct);
assert.strictEqual(blocked.status,'NOT_READY');
assert.ok(blocked.reasons.length>0);
console.log('RAPM engine tests passed');