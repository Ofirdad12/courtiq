// Run with Node 24+ and cheerio@1.0.0 available in NODE_PATH.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {stripTypeScriptTypes} = require('node:module');
const cheerio = require('cheerio');
const source = fs.readFileSync(__dirname + '/../supabase/functions/import-ibba-game/index.ts', 'utf8');
const prefix = source.slice(0, source.indexOf('Deno.serve(')).replace(/^import .*;\n/gm, '');
const api = vm.runInNewContext(stripTypeScriptTypes(prefix) + '\n({ibbaMinutesValue,ibbaPlayerData,validateTeam,advancedPlayer,num})', {console, URL, Response});
assert.equal(api.ibbaMinutesValue('00:33:37'), 33.6);
assert.equal(api.ibbaMinutesValue('01:02:30'), 62.5);
assert.equal(api.ibbaMinutesValue('00:00:00'), 0);
assert.equal(api.ibbaMinutesValue('33:50'), 33.5); // legacy decimal format
assert.throws(() => api.num('-'), /Expected numeric/); // required stats remain strict
const row = (pm) => `<table><tr data-player-id="1"><td class="data-number">4</td><td class="data-name">Test</td>${Object.entries({min:'00:33:37',pts:'2',fgs:'1-2',threeps:'0-0',fts:'0-0',def:'1',off:'0',stl:'0',to:'0',ast:'0',blk:'0',rate:'2',pm}).map(([k,v])=>`<td data-key="${k}">${v}</td>`).join('')}</tr></table>`;
// Substitute totals only in the small unit fixture; real-page totals are validated below.
const unit = vm.runInNewContext(stripTypeScriptTypes(prefix) + '\nteamTotal=()=>({}); ({ibbaPlayerData})', {console, URL, Response});
for (const pm of ['-', '–', '—', '']) {
 const $=cheerio.load(row(pm));assert.equal(unit.ibbaPlayerData($, $('table')[0]).players[0].plus_minus,null);
}
for (const pm of ['0','-12','7']) {
 const $=cheerio.load(row(pm));assert.equal(unit.ibbaPlayerData($, $('table')[0]).players[0].plus_minus,Number(pm));
}
if(process.argv[2]){
 const $=cheerio.load(fs.readFileSync(process.argv[2],'utf8'));
 const tables=$('table').toArray().filter(t=>$(t).find('td[data-key="pts"]').length);
 assert.equal(tables.length,2);
 const sides=tables.map(t=>api.ibbaPlayerData($,t));
 assert.deepEqual(sides.map(s=>s.total.points),[65,28]);
 for(const [i,s] of sides.entries()){
  assert.equal(api.validateTeam(s.total,'team').status,'passed');
  assert.equal(s.players.reduce((a,p)=>a+p.points,0),[57,28][i]);
  // The official home rows sum to 57, while its total is 65: keep the quality gate in REVIEW.
  assert.equal(s.players.reduce((a,p)=>a+p.points,0)===s.total.points,i===1);
  assert(s.players.some(p=>p.minutes>0));
  assert(s.players.every(p=>p.plus_minus===null));
  for(const p of s.players){const a=api.advancedPlayer(p,s.total,sides[1-i].total);assert(Number.isFinite(a.points_per_40));assert.equal(a.plus_minus,null);}
 }
 console.log('Live fixture 782265: 65–28; team totals validate; home player sum 57 differs from 65 (REVIEW required); minutes and missing +/- pass.');
}
console.log('IBBA regression checks passed.');
