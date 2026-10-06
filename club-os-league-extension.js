/* CourtIQ v188 · activates League Intelligence inside Club OS. */
(function(root){
  'use strict';
  function activate(){const os=root.CourtIQClubOS,li=root.CourtIQLeagueIntelligence;if(!os||!li)return false;const league=os.modules?.find(x=>x.id==='league');if(league){league.status='ACTIVE';league.desc='Imported-dataset team and player percentiles, benchmarks, trends and measurable archetypes.';}return true;}
  root.document?.addEventListener('click',e=>{const b=e.target.closest?.('.clubOSModal [data-cos-module]');if(!b||b.dataset.cosModule!=='league')return;e.preventDefault();e.stopImmediatePropagation();root.document.querySelector('.clubOSModal')?.remove();root.CourtIQLeagueIntelligence?.open?.();},true);
  if(!activate()&&root.document){const t=setInterval(()=>{if(activate())clearInterval(t);},100);setTimeout(()=>clearInterval(t),5000);}
  const api={activate};root.CourtIQClubOSLeagueExtension=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
