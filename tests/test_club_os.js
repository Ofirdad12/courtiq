const assert=require('assert');
const os=require('../club-os.js');

const rows=[{
  club:{id:7,name:'CourtIQ Club',season:'2026-27',competition:'EuroCup'},
  role:'gm',
  permissions:{games:true,live:true,analytics:true,players:true,scouting:true,reports:true,video:true,gm:true,recruitment:true,practice:false,league:true,admin:false},
  seasons:[{id:10,season:'2026-27',competition:'EuroCup',is_active:true},{id:9,season:'2025-26',competition:'EuroCup',is_active:false}],
  teams:[{id:20,season_id:10,name:'First Team',is_primary:true},{id:19,season_id:9,name:'First Team 25/26',is_primary:true}]
}];
const selected=os.resolveSelection(rows,{});
assert.equal(selected.club.id,7);
assert.equal(selected.season.id,10);
assert.equal(selected.team.id,20);
assert.equal(os.roleLabel('gm'),'GM / Sporting Director');
assert.equal(os.permissionAllowed(rows[0],'gm'),true);
assert.equal(os.permissionAllowed(rows[0],'practice'),false);
const modules=os.visibleModules(rows[0]);
assert(modules.find(x=>x.id==='gm').allowed);
assert(!modules.find(x=>x.id==='practice').allowed);
assert(modules.find(x=>x.id==='games'&&x.status==='ACTIVE'));
assert(modules.find(x=>x.id==='recruitment'&&x.status==='FOUNDATION'));
const historic=os.resolveSelection(rows,{clubId:7,seasonId:9,teamId:19});
assert.equal(historic.season.id,9);
assert.equal(historic.team.id,19);
console.log('Club OS v186: organization context, role permissions, season/team selection and module gating passed.');
