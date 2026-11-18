const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('import-database-first-v244.js','utf8');
const url='https://www.fiba.basketball/en/events/fiba-womens-eurobasket-2027-qualifiers/games/129122-SLO-AUT#boxscore';
async function run(mode){
 let refreshed=false;
 const window={addEventListener(){},CourtIQData:{activeClubId:()=>1,workspace:async()=>({games:[]}),importOfficialGame(){},refreshSession:()=>mode==='refresh-hang'?new Promise(()=>{}):Promise.resolve(refreshed=true)}};
 const context={window,URL,URLSearchParams,AbortController,localStorage:{getItem:()=>JSON.stringify({access_token:'test'})},setTimeout:(fn,ms)=>ms<=1000?0:setTimeout(fn,5),clearTimeout,fetch:async(path,options)=>{
  if(path.includes('/rest/v1/'))return {ok:true,json:async()=>refreshed?[{id:139,payload:{verified:true,ui:{hs:1}}}]:[]};
  if(mode==='body-hang')return {text:()=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(new Error('abort'),{name:'AbortError'}))))};
  return {status:401,ok:false,text:async()=>'{}'};
 }};
 vm.runInNewContext(source,context);
 const operation=window.CourtIQImportDatabaseFirstV244.invokeImport(url,1);
 if(mode==='cache-refresh')assert.equal((await operation).game_id,139);
 else await assert.rejects(operation,mode==='body-hang'?/stopped the import/:/Sign in again/);
}
(async()=>{for(const mode of ['body-hang','refresh-hang','cache-refresh'])await run(mode);console.log('PASS: stalled body abort, bounded session refresh, saved FIBA recovery after refresh');})().catch(e=>{console.error(e);process.exitCode=1;});
