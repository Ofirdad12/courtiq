const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync('plan-usage-v216.js','utf8');
const context={window:{},console};
vm.runInNewContext(source,context,{filename:'plan-usage-v216.js'});
const P=context.window.CourtIQPlanUsageCore;
assert(P,'CourtIQPlanUsageCore should be exposed');

let u=P.usageState({monthly_game_limit:20,games_used:7,can_import_game:true});
assert.strictEqual(u.limit,20);
assert.strictEqual(u.used,7);
assert.strictEqual(u.remaining,13);
assert(Math.abs(u.ratio-.35)<1e-9);
assert.strictEqual(u.canImport,true);

u=P.usageState({monthly_game_limit:20,games_used:25,can_import_game:false});
assert.strictEqual(u.remaining,0);
assert.strictEqual(u.ratio,1);
assert.strictEqual(u.canImport,false);

u=P.usageState({monthly_game_limit:null,games_used:999,can_import_game:true});
assert.strictEqual(u.unlimited,true);
assert.strictEqual(u.limit,null);
assert.strictEqual(u.remaining,null);

assert.strictEqual(P.statusLabel('trialing'),'TRIAL');
assert.strictEqual(P.statusLabel('past_due'),'PAST DUE');
assert.strictEqual(P.statusLabel('active'),'ACTIVE');

console.log('plan usage v216 tests passed');
