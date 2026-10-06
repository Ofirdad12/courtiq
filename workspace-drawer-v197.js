/* CourtIQ v197 · explicit open/close controller for workspace navigation. */
(function(root){
  'use strict';
  const doc=root.document;
  if(!doc)return;
  const VERSION='197';

  function side(){return doc.querySelector('#app .side');}
  function menuButtons(){return doc.querySelectorAll('#app .menu [data-cq-action]');}

  function ensureBackdrop(){
    let node=doc.querySelector('.cq-side-backdrop');
    if(!node){
      node=doc.createElement('div');
      node.className='cq-side-backdrop';
      node.setAttribute('aria-hidden','true');
      doc.body.appendChild(node);
    }
    if(node.dataset.cqDrawerBound!=='197'){
      node.dataset.cqDrawerBound='197';
      node.addEventListener('click',event=>{
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      },true);
    }
    return node;
  }

  function ensureCloseButton(){
    const panel=side();
    if(!panel)return;
    let button=panel.querySelector('.cq-side-close');
    if(!button){
      button=doc.createElement('button');
      button.type='button';
      button.className='cq-side-close';
      button.setAttribute('aria-label','Close navigation');
      button.title='Close menu';
      button.textContent='×';
      panel.insertBefore(button,panel.firstChild);
    }
    if(button.dataset.cqDrawerBound!=='197'){
      button.dataset.cqDrawerBound='197';
      button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      },true);
    }
  }

  function setExpanded(value){
    doc.querySelectorAll('.cq-mobile-menu').forEach(button=>button.setAttribute('aria-expanded',value?'true':'false'));
  }

  function open(){
    const panel=side();
    if(!panel)return false;
    ensureBackdrop();
    ensureCloseButton();
    panel.classList.add('cq-side-open');
    doc.body.classList.add('cq-nav-open');
    setExpanded(true);
    requestAnimationFrame(()=>panel.querySelector('.cq-side-close')?.focus?.({preventScroll:true}));
    return true;
  }

  function close(){
    side()?.classList.remove('cq-side-open');
    doc.body.classList.remove('cq-nav-open');
    setExpanded(false);
    return true;
  }

  function toggle(){
    return side()?.classList.contains('cq-side-open')?close():open();
  }

  function bindMenuButton(button){
    if(!button||button.dataset.cqDrawerBound==='197')return;
    button.dataset.cqDrawerBound='197';
    button.setAttribute('aria-expanded','false');
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      toggle();
    },true);
  }

  function bindNavigationExit(){
    menuButtons().forEach(button=>{
      if(button.dataset.cqDrawerExit==='197')return;
      button.dataset.cqDrawerExit='197';
      button.addEventListener('click',()=>requestAnimationFrame(close));
    });
  }

  function sync(){
    ensureBackdrop();
    ensureCloseButton();
    doc.querySelectorAll('.cq-mobile-menu').forEach(bindMenuButton);
    bindNavigationExit();
    if(!side()?.classList.contains('cq-side-open'))setExpanded(false);
  }

  doc.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&side()?.classList.contains('cq-side-open')){
      event.preventDefault();
      close();
    }
  });

  const observer=new MutationObserver(()=>requestAnimationFrame(sync));
  observer.observe(doc.documentElement,{childList:true,subtree:true});
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',sync,{once:true});
  else sync();

  root.CourtIQWorkspaceDrawer={version:VERSION,open,close,toggle,sync};
})(typeof window!=='undefined'?window:globalThis);
