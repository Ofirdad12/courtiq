(()=>{
'use strict';

const nativeOpen=window.open.bind(window);
const injectedCss=`
/* CourtIQ PDF number readability v247 */
body:has(.k){font-size:12px!important;line-height:1.32!important}
body:has(.k) .k{padding:10px 11px!important}
body:has(.k) .k small{font-size:11px!important;font-weight:700!important;letter-spacing:.1px}
body:has(.k) .k b{font-size:26px!important;line-height:1.05!important;font-weight:900!important;letter-spacing:-.25px}
body:has(.k) table td{font-size:13px!important;line-height:1.28!important;padding:6px 7px!important}
body:has(.k) table td:nth-child(n+2){font-size:14px!important;font-weight:900!important}
body:has(.k) table th{font-size:10px!important;padding:6px 7px!important}
body:has(.k) h2{font-size:18px!important}
body:has(.k) h3{font-size:14px!important}
body:has(.k) .score{font-size:28px!important;line-height:1.08!important}

body:has(.advanced){font-size:9.5px!important}
body:has(.advanced) .score{font-size:22px!important;line-height:1.08!important}
body:has(.advanced) .teamHead h2{font-size:16px!important}
body:has(.advanced) h3{font-size:11px!important;margin:7px 0 4px!important}
body:has(.advanced) table th{font-size:8.5px!important;padding:2.5px 3px!important}
body:has(.advanced) table td{font-size:10px!important;line-height:1.14!important;padding:3px 3px!important}
body:has(.advanced) table td:not(.name){font-weight:800!important}
body:has(.advanced) .advanced td{font-size:9.8px!important;font-weight:800!important}
body:has(.advanced) .name{font-size:9.2px!important;font-weight:800!important}
body:has(.advanced) .formula{font-size:8px!important}
`;

window.open=function(...args){
  const child=nativeOpen(...args);
  if(!child)return child;
  try{
    const doc=child.document;
    const nativeWrite=doc.write.bind(doc);
    doc.write=function(html,...rest){
      if(typeof html==='string'&&html.includes('<style>')&&/CourtIQ/i.test(html)){
        html=html.replace('</style>',`${injectedCss}</style>`);
      }
      return nativeWrite(html,...rest);
    };
  }catch(_){/* keep native popup behavior */}
  return child;
};

window.CourtIQPDFNumberReadability={version:'247'};
})();
