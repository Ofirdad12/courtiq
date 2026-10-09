const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync('commercial-integrity-v212.js','utf8');
const context={window:{},console};
vm.runInNewContext(source,context,{filename:'commercial-integrity-v212.js'});
const I=context.window.CourtIQIntegrity;
assert(I,'CourtIQIntegrity API should be exposed');

const unknownPlk={
  provider:'PLK',
  payload:{verified:true,quality:{status:'VERIFIED',checks:[{status:'PASS'},{status:'PASS'}]},ui:{
    players:{
      home:Array.from({length:10},(_,i)=>({name:`H${i}`,minutes:20,starter:false})),
      away:Array.from({length:10},(_,i)=>({name:`A${i}`,minutes:20,starter:false}))
    },
    splits:{home:{},away:{}}
  }}
};
I.normalizeRecord(unknownPlk);
assert(unknownPlk.payload.ui.players.home.every(p=>p.starter===null),'Unverified PLK false flags must become unknown');
assert(unknownPlk.payload.ui.players.away.every(p=>p.starter_verified===false),'Unknown starter evidence must be explicit');
assert.strictEqual(unknownPlk.payload.ui.splits,null,'Starter/bench splits must be removed when starter evidence is unknown');
assert.strictEqual(unknownPlk.payload.starter_evidence.status,'UNKNOWN');

const verifiedPlk={provider:'PLK',players:{
  home:Array.from({length:10},(_,i)=>({minutes:20,starter:i<5})),
  away:Array.from({length:10},(_,i)=>({minutes:20,starter:i<5}))
}};
I.normalizeRecord(verifiedPlk);
assert.strictEqual(verifiedPlk.players.home.filter(p=>p.starter===true).length,5);
assert(verifiedPlk.players.home.every(p=>p.starter_verified===true),'Verified five-player lineup should retain starter/bench truth');

const review={provider:'IBBA',payload:{verified:false,quality:{status:'REVIEW',checks:[{status:'PASS'},{status:'PASS'},{status:'PASS'},{status:'PASS'},{status:'PASS'},{status:'FAIL'}]}}};
const quality=I.qualityOf(review);
assert.strictEqual(quality.status,'REVIEW','Explicit REVIEW must not be promoted to VERIFIED');
assert.strictEqual(quality.score,83);

const ibba={provider:'IBBA',players:{home:[{minutes:10,starter:false}],away:[]}};
I.normalizeRecord(ibba);
assert.strictEqual(ibba.players.home[0].starter,false,'Non-PLK source semantics must remain untouched');

console.log('commercial integrity v212 tests passed');
