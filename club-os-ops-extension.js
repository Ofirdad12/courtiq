/* CourtIQ v187 · activates Player 360 / GM / Recruitment inside Club OS. */
(function(root){
  'use strict';
  function activate(){
    const os=root.CourtIQClubOS,ops=root.CourtIQBasketballOps;if(!os||!ops)return false;
    const gm=os.modules?.find(x=>x.id==='gm');if(gm){gm.status='ACTIVE';gm.desc='Roster construction, role needs, data coverage and evidence-based fit board.';}
    const rec=os.modules?.find(x=>x.id==='recruitment');if(rec){rec.status='ACTIVE';rec.desc='Scouting candidates, basketball role fit, confidence and shortlist workflow.';}
    if(os.modules&&!os.modules.some(x=>x.id==='player360')){
      const at=Math.max(0,os.modules.findIndex(x=>x.id==='memory'));
      os.modules.splice(at,0,{id:'player360',group:'People',title:'Player 360',desc:'One verified player record across identities, games, samples, trends and role signals.',permission:'players',status:'ACTIVE'});
    }
    return true;
  }
  root.document?.addEventListener('click',e=>{
    const b=e.target.closest?.('.clubOSModal [data-cos-module]');if(!b)return;const id=b.dataset.cosModule;if(!['gm','recruitment','player360'].includes(id))return;
    e.preventDefault();e.stopImmediatePropagation();root.document.querySelector('.clubOSModal')?.remove();
    if(id==='gm')root.CourtIQBasketballOps?.openGM?.();
    if(id==='recruitment')root.CourtIQBasketballOps?.openRecruitment?.();
    if(id==='player360')root.CourtIQBasketballOps?.openPlayerDirectory?.();
  },true);
  if(!activate()&&root.document){const t=setInterval(()=>{if(activate())clearInterval(t);},100);setTimeout(()=>clearInterval(t),5000);}
  const api={activate};root.CourtIQClubOSOpsExtension=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
