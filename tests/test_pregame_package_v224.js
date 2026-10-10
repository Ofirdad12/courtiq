const assert=require('assert');
const Core=require('../pregame-package-v224.js');

const confidence=n=>({level:n>=5?'HIGH':n>=3?'MEDIUM':'LOW',label:n>=5?'גבוה':n>=3?'בינוני':'נמוך',n,total:5});
const C={metricConfidence:(m,total)=>confidence(Number(m?.n||0))};
const model={
  team:'Opponent A',
  rows:[1,2,3,4,5],
  confidence:{level:'HIGH'},
  decisions:[
    {title:'להוריד נפח שלשות',action:'צמצמו 3PA',why:'baseline',confidence:{level:'HIGH'}},
    {title:'לבדוק לחץ על הכדור מוקדם',action:'בדקו לחץ',why:'baseline',confidence:{level:'MEDIUM'}},
    {title:'להגן על הריבאונד כיעד משחק',action:'סגרו ריבאונד',why:'baseline',confidence:{level:'HIGH'}},
    {title:'איפה לבדוק אותם בהתקפה',action:'בהתקפה בדקו מוקדם',why:'opponent outcomes',confidence:{level:'MEDIUM'}}
  ],
  opp:{n:5,two:57.2,three:38.1,ftr:31.4,efg:55.8},
  players:[
    {name:'P1',ppg:18.2,ts:61,pointShare:28,g:5,confidence:{level:'HIGH'}},
    {name:'P2',ppg:14.4,ts:58,pointShare:22,g:5,confidence:{level:'HIGH'}},
    {name:'P3',ppg:10.1,ts:54,pointShare:16,g:4,confidence:{level:'MEDIUM'}}
  ],
  live:[
    {label:'3PA share',baseline:'42%',question:'מעל או מתחת?',confidence:{level:'HIGH'}},
    {label:'TOV%',baseline:'16%',question:'הלחץ משנה?',confidence:{level:'HIGH'}},
    {label:'ORB%',baseline:'31%',question:'מסיימים פוזשנים?',confidence:{level:'HIGH'}}
  ]
};

const pkg=Core.buildPackage(model,C);
assert.equal(pkg.team,'Opponent A');
assert.equal(pkg.stop.length,3);
assert.equal(pkg.attack.length,3);
assert.equal(pkg.players.length,3);
assert.equal(pkg.kpis.length,3);
assert(pkg.attack[0].action.includes('57.2%'));
assert(pkg.attack[1].action.includes('38.1%'));
assert(pkg.attack[2].action.includes('31.4%'));
assert(pkg.stop.every(x=>!/בהתקפה/.test(x.action||'')));
assert.equal(pkg.players[0].name,'P1');
assert.equal(pkg.kpis[0].label,'3PA share');
const html=Core.printHtml(pkg);
assert(html.includes('PREGAME PACKAGE'));
assert(html.includes('3 דברים לעצור'));
assert(html.includes('3 KPIs לרבע הראשון'));

const thin=Core.buildPackage({team:'Thin',rows:[1],decisions:[],opp:{n:1},players:[],live:[],confidence:{level:'LOW'}},C);
assert.equal(thin.stop.length,3);
assert.equal(thin.attack.length,3);
assert.equal(thin.players.length,3);
assert.equal(thin.kpis.length,3);
assert(thin.attack.every(x=>x.confidence.level==='LOW'));

console.log('Pregame Package v224 tests passed');
