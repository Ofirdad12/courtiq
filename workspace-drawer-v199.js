/* CourtIQ v199 · single-source workspace drawer controller.
   Delegated capture handling means the menu button works even when the shell is rendered/re-rendered later. */
(function(root){
  'use strict';
  const doc=root.document;
  if(!doc)return;
  const VERSION='199';

  function panel(){return doc.querySelector('#app .side');}
  function isOpen(){return doc.body.classList.contains('cq-nav-open');}

  function ensureBackdrop(){
    let node=doc.querySelector('.cq-side-backdrop');
    if(!node){
      node=doc.createElement('div');
      node.className='cq-side-backdrop';
      node.setAttribute('aria-hidden','true');
      doc.body.appendChild(node);
    }
    return node;
  }

  function ensureCloseButton(){
    const side=panel();
    if(!side)return null;
    let button=side.querySelector('.cq-side-close');
    if(!button){
      button=doc.createElement('button');
      button.type='button';
      button.className='cq-side-close';
      button.setAttribute('aria-label','Close navigation');
      button.title='Close menu';
      button.textContent='×';
      side.insertBefore(button,side.firstChild);
    }
    return button;
  }

  function setExpanded(value){
    doc.querySelectorAll('.cq-mobile-menu').forEach(button=>{
      button.setAttribute('aria-expanded',value?'true':'false');
      button.setAttribute('aria-controls','courtiq-workspace-navigation');
    });
    const side=panel();
    if(side){
      side.id='courtiq-workspace-navigation';
      side.setAttribute('aria-hidden',value?'false':'true');
    }
  }

  function open(){
    const side=panel();
    if(!side)return false;
    ensureBackdrop();
    ensureCloseButton();
    side.classList.add('cq-side-open');
    doc.body.classList.add('cq-nav-open');
    setExpanded(true);
    return true;
  }

  function close(){
    panel()?.classList.remove('cq-side-open');
    doc.body.classList.remove('cq-nav-open');
    setExpanded(false);
    return true;
  }

  function toggle(){return isOpen()?close():open();}

  function targetElement(event){
    return event.target instanceof Element?event.target:event.target?.parentElement||null;
  }

  function onClick(event){
    const target=targetElement(event);
    if(!target)return;

    const opener=target.closest('.cq-mobile-menu');
    if(opener){
      event.preventDefault();
      event.stopImmediatePropagation();
      toggle();
      return;
    }

    if(target.closest('.cq-side-close')||target.closest('.cq-side-backdrop')){
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
      return;
    }

    if(target.closest('#app .menu [data-cq-action]')){
      requestAnimationFrame(close);
    }
  }

  doc.addEventListener('click',onClick,true);
  doc.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&isOpen()){
      event.preventDefault();
      close();
    }
  });

  function sync(){
    ensureBackdrop();
    ensureCloseButton();
    if(!isOpen())close();
    else setExpanded(true);
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(sync));
  observer.observe(doc.getElementById('app')||doc.documentElement,{childList:true,subtree:true});
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',sync,{once:true});
  else sync();

  root.CourtIQWorkspaceDrawer={version:VERSION,open,close,toggle,isOpen,sync};
})(typeof window!=='undefined'?window:globalThis);
