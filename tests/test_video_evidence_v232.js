const assert=require('assert');
const V=require('../video-evidence-v232.js');
{
 const u=V.clipUrl('https://www.youtube.com/watch?v=abc',75);assert(u.includes('t=75s'));
 const g=V.clipUrl('https://video.example.com/game.mp4',12,20);assert(g.includes('#t=12,20'));
 assert.equal(V.clipUrl('http://unsafe.example.com/x',10),'');
}
{
 assert.equal(V.formatTime(0),'0:00');assert.equal(V.formatTime(75),'1:15');
}
{
 const rows=[{claim_key:'shooting',polarity:'supports'},{claim_key:'shooting',polarity:'supports'},{claim_key:'shooting',polarity:'counterexample'},{claim_key:'turnovers',polarity:'supports'}];
 const c=V.counts(rows,'shooting');assert.equal(c.supports,2);assert.equal(c.counterexample,1);assert.equal(V.balanceLabel(c),'BALANCED EVIDENCE');
 const s=V.summarize(rows);assert.equal(s.turnovers.supports,1);assert.equal(s.rebounding.total,0);
}
{
 assert.equal(V.roleCanAdd({role:'admin'}),true);assert.equal(V.roleCanAdd({role:'analyst'}),true);assert.equal(V.roleCanAdd({role:'coach'}),false);
}
{
 const ev=V.evidenceFor([{game_id:1},{game_id:2},{game_id:3}],[1,3]);assert.deepEqual(ev.map(x=>x.game_id),[1,3]);
}
console.log('video-evidence-v232 tests passed');
