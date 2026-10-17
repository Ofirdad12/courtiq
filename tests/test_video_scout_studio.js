const assert=require('node:assert/strict');
const {validate,summary}=require('../video-scout-studio.js');
const event={id:'1',start:0,end:12,action:'High PNR',coverage:'Drop',period:1,points:0,possession:true,team:'A',player:'Player',note:'Observed'};
assert.equal(validate(event).start,0);
for(const patch of [{end:0},{start:-1},{end:Infinity},{period:0},{points:5},{points:null},{action:'invented'}])assert.throws(()=>validate({...event,...patch}));
assert.equal(summary([]).ppp,null);
const s=summary([event,{...event,id:'2',points:3},{...event,id:'3',points:4,possession:false}]);
assert.deepEqual(s,{clips:3,possessions:2,points:3,ppp:1.5});
console.log('Video scout: time validation, unknown outcomes, taxonomy and possession-only PPP passed.');
