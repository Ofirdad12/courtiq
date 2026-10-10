const assert=require('assert');
const S=require('../scouting-stability-v227.js');
function row({venue='HOME',result='WIN',pf=80,pa=70,efg=55,three=36,tov=14,orb=30,date='2026-10-01',opponent='X'}={}){return {venue,result,close:Math.abs(pf-pa)<=5,pf,pa,margin:pf-pa,efg,three,tov,orb,ftr:25,date,opponent};}
{
 const rows=[row({venue:'HOME'}),row({venue:'HOME',pf:84}),row({venue:'AWAY',result:'LOSS',pf:70,pa:76}),row({venue:'AWAY',result:'LOSS',pf:72,pa:78})];
 const cards=S.splitCards(rows);assert(cards.find(x=>x.key==='HOME').games===2);assert(cards.find(x=>x.key==='AWAY').games===2);
 const c=S.contrast(rows,'HOME','AWAY');assert(c);assert(c.diffs.some(x=>x.key==='pf'));
}
{
 const rows=[row({pf:80,pa:70,efg:55,three:36,tov:14,orb:30}),row({pf:81,pa:71,efg:54,three:35,tov:15,orb:31}),row({pf:79,pa:69,efg:56,three:37,tov:13,orb:29}),row({pf:80,pa:70,efg:55,three:36,tov:14,orb:30}),row({pf:82,pa:72,efg:55,three:36,tov:14,orb:30})];
 const s=S.stability(rows);assert.equal(s.overall,'STABLE');assert(s.metrics.length>=4);
}
{
 const rows=[row({date:'1',pf:80}),row({date:'2',pf:81}),row({date:'3',pf:79}),row({date:'4',pf:80}),row({date:'5',pf:110,opponent:'OUT'})];
 const o=S.outliers(rows);assert(o.some(x=>x.date==='5'&&x.key==='pf'));
}
{
 const rows=[row(),row(),row(),row()];assert.deepEqual(S.outliers(rows),[]);assert.equal(S.stability(rows).overall,'SMALL SAMPLE');
}
console.log('scouting-stability-v227 tests passed');
