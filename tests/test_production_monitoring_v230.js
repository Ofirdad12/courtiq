const assert=require('assert');
const O=require('../production-monitoring-v230.js');
{
 const s=O.sanitizeMessage('failed Bearer abc.def.ghi https://example.com/path?token=secret sk_test_1234567890123456');
 assert(!s.includes('secret'));assert(!s.includes('sk_test_'));assert(!s.includes('?token='));assert(s.includes('https://example.com/path'));
}
{
 const m=O.safeMeta({line:12,token:'x',url:'https://x?a=b',message:'ok',body:'no'});assert.equal(m.line,12);assert.equal(m.message,'ok');assert.equal(m.token,undefined);assert.equal(m.url,undefined);assert.equal(m.body,undefined);
}
{
 const s=O.summarize({events:[{event_type:'error',occurred_at:new Date().toISOString()},{event_type:'performance',occurred_at:new Date().toISOString(),metadata:{load_ms:900}},{event_type:'performance',occurred_at:new Date().toISOString(),metadata:{load_ms:1100}}],runs:[{status:'success'},{status:'success'},{status:'failed'}],quality:{verified:4,warning:1,incomplete:0}});assert.equal(s.errors24h,1);assert.equal(s.importSuccessRate,67);assert.equal(s.failedImports,1);assert.equal(s.qualityVerified,4);assert(s.p95Load>=900);
}
{
 assert.equal(O.healthStatus({qualityIncomplete:0,errors24h:0,failedImports:0,qualityWarning:0}),'HEALTHY');assert.equal(O.healthStatus({qualityIncomplete:0,errors24h:1,failedImports:0,qualityWarning:0}),'WATCH');assert.equal(O.healthStatus({qualityIncomplete:1,errors24h:0,failedImports:0,qualityWarning:0}),'ATTENTION');
}
console.log('production-monitoring-v230 tests passed');
