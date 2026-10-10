const assert=require('assert');
const C=require('../video-intelligence-v233.js');
assert.strictEqual(C.parseYouTube('https://youtu.be/abcdefghijk'),'abcdefghijk');
assert.strictEqual(C.parseYouTube('https://www.youtube.com/watch?v=abcdefghijk'),'abcdefghijk');
assert.strictEqual(C.parseYouTube('https://example.com/x'),null);
assert.strictEqual(C.mediaKind('https://youtu.be/abcdefghijk'),'youtube');
assert.strictEqual(C.mediaKind('https://cdn.example.com/game.mp4'),'direct_mp4');
assert.strictEqual(C.objectPath(7,99,'Game Final.MP4','abc'),'7/99/abc.mp4');
assert.strictEqual(C.jobLabel({status:'awaiting_media'}),'MEDIA REQUIRED');
assert.deepStrictEqual(C.pipelineSteps({stage:'track'}).map(x=>x.state),['done','done','active','pending','pending','pending','pending']);
const s=C.tacticalSummary([
 {verification:'ai',action_type:'pick_and_roll',coverage_type:'drop'},
 {verification:'human_corrected',action_type:'pick_and_roll',coverage_type:'switch'},
 {verification:'needs_review',action_type:'pick_and_roll',coverage_type:'ice'}
]);
assert.strictEqual(s.total,3);assert.strictEqual(s.accepted,2);assert.strictEqual(s.review,1);assert.strictEqual(s.byAction.pick_and_roll,2);assert.strictEqual(s.byCoverage.drop,1);
assert.strictEqual(C.clipTime(125),'2:05');
assert.ok(C.ytAt('https://youtu.be/abcdefghijk',61).includes('t=61s'));
console.log('video intelligence v233 frontend contract ok');
