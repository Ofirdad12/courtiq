/* CourtIQ v182 · visible source support labels for Live Bench. */
(function(root){
  'use strict';
  function sync(){
    if(!root.document)return;
    document.querySelectorAll('.liveBenchModal').forEach(modal=>{
      const hero=modal.querySelector('.lbHero small');
      if(hero)hero.textContent='COURTIQ · LIVE BENCH V182';
      const input=modal.querySelector('.lbUrl');
      if(input)input.placeholder='Official IBBA, FIBA LiveStats / Genius, EuroCup or ORLEN Basket Liga (PLK) game URL';
      modal.querySelectorAll('.lbEmpty span').forEach(span=>{
        if(/^Supported:/i.test(String(span.textContent||'')))span.textContent='Supported: IBBA · FIBA LiveStats / Genius Sports · EuroCup · ORLEN Basket Liga (PLK).';
      });
    });
  }
  function install(){sync();if(root.MutationObserver)new MutationObserver(sync).observe(document.body,{childList:true,subtree:true});}
  root.CourtIQLiveSourceSupport={sync};
  if(root.document){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();}
})(typeof window!=='undefined'?window:globalThis);
