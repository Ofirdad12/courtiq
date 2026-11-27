const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('app.js','utf8');
const context={URL};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function fibaEventFromUrl('),source.indexOf('function openUrlImport(')),context);
const base='https://www.fiba.basketball/en/events/fiba-womens-eurobasket-2027-qualifiers';
for(const suffix of ['', '/', '/games','/games?date=2027-06-16']){
 assert.equal(context.fibaEventFromUrl(base+suffix).gamesUrl,base+'/games');
}
for(const url of [base+'/games/123456-FRA-ESP',base.replace('fiba.basketball','fiba.basketball.evil.com'),'javascript:alert(1)','invalid']){
 assert.equal(context.fibaEventFromUrl(url),null);
}
vm.runInContext('const categoryFor='+source.split('const categoryFor=')[1].split('\n  const privilegedEmail')[0]+'\nglobalThis.categoryFor=categoryFor;',context);
assert.equal(context.categoryFor({_provider:'FIBA',comp:'FIBA Womens Eurobasket 2027'}).key,'womenseurobasket');
assert.equal(context.categoryFor({_provider:'FIBA',comp:'FIBA Womens Eurobasket 2027 Qualifiers'}).key,'womenseurobasketqualifiers');
assert.equal(context.categoryFor({_provider:'FIBA',comp:'EuroCup Women 2026/27'}).key,'eurocup');
assert.equal(context.categoryFor({_provider:'FIBA',comp:'FIBA Europe Cup'}).key,'fiba');
const world='https://www.fiba.basketball/en/events/fiba-basketball-world-cup-2027-european-qualifiers';
for(const suffix of ['', '/', '/games','/games?date=2026-11-27','/teams/israel']){
 const event=context.fibaEventFromUrl(world+suffix);
 assert.equal(event.israelQualifiers,true);assert.equal(event.gamesUrl,world+'/games');
}
assert.equal(context.fibaEventFromUrl(world+'/games/127123-NED-ISR#boxscore'),null);
assert.equal(context.categoryFor({_provider:'FIBA',comp:'FIBA Basketball World Cup 2027 European Qualifiers'}).key,'worldcupqualifiers');
// An event page must never be submitted to the game importer.
let imports=0;
const button={},status={appendChild(link){this.link=link;}},input={value:base};
Object.assign(context,{modal:{querySelector:s=>s==='#runUrl'?button:s==='#urlStatus'?status:input},document:{createElement:()=>({})},window:{CourtIQData:{importOfficialGame:async()=>{imports++;}}},setBusy(){throw Error('event must not enter importing state');}});
vm.runInContext(source.split('\n').find(line=>line.includes('modal.querySelector("#runUrl").onclick=async')),context);
(async()=>{
 await button.onclick();
 assert.equal(imports,0);assert.equal(status.link.href,base+'/games');assert.equal(status.link.rel,'noopener noreferrer');
 const nodes=[];const gameInput={value:world};
 context.document.createElement=tag=>({tag,options:[],setAttribute(){},add(o){this.options.push(o);}});
 context.Option=function(text,value){this.text=text;this.value=value;};
 context.window.CourtIQData.isSignedIn=()=>true;
 const eventStatus={appendChild(n){nodes.push(n);},closest(){return {querySelector(){return gameInput;}};}};
 context.showFibaEvent(eventStatus,context.fibaEventFromUrl(world));
 assert.equal(nodes[0].options.length,13);assert.equal(nodes[1].href,world+'/games');
 nodes[0].value='127123-NED-ISR';nodes[0].selectedOptions=[{text:'Netherlands vs Israel'}];nodes[0].onchange();
 assert.equal(gameInput.value,world+'/games/127123-NED-ISR#boxscore');
 console.log('PASS: tournament routing, safe links, competition categories, no event import, World Cup picker');
})().catch(e=>{console.error(e);process.exitCode=1;});
