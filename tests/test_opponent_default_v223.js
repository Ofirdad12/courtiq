const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync('opponent-default-v223.js','utf8');
const sandbox={console,window:{},document:undefined};
vm.createContext(sandbox);vm.runInContext(src,sandbox);
const {sameClubTeam,candidates}=sandbox.window.CourtIQOpponentDefault.Core;
function ok(v,m){if(!v)throw new Error(m)}
ok(sameClubTeam('Maccabi Bnot Ashdod',{name:'Maccabi Bnot Ashdod',slug:'maccabi-bnot-ashdod'}),'exact club team should be excluded');
ok(sameClubTeam('Maccabi Bnot Ashdod Women',{name:'Maccabi Bnot Ashdod',slug:'maccabi-bnot-ashdod'}),'safe long-name containment should match club team');
ok(!sameClubTeam('Hapoel Jerusalem',{name:'Maccabi Bnot Ashdod',slug:'maccabi-bnot-ashdod'}),'opponent must not be excluded');
const out=candidates([{home_team:'Maccabi Bnot Ashdod',away_team:'Haifa'},{home_team:'Haifa',away_team:'Maccabi Bnot Ashdod'},{home_team:'Maccabi Bnot Ashdod',away_team:'Ramat Gan'}],{name:'Maccabi Bnot Ashdod',slug:'maccabi-bnot-ashdod'});
ok(out.length===2&&out[0].name==='Haifa'&&out[0].games===2,'club team should be removed and opponents ranked');
console.log('opponent-default-v223 tests passed');
