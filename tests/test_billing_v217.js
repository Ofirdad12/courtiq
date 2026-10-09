const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync('billing-v217.js','utf8');
const sandbox={console,setTimeout,clearTimeout,window:{},document:undefined};
vm.createContext(sandbox);vm.runInContext(src,sandbox);
const {model}=sandbox.window.CourtIQBilling.Core;
function ok(v,m){if(!v)throw new Error(m)}
let s=model({plan_code:'trial',status:'trialing',payment_provider:null,billing_customer_ready:false,billing_subscription_ready:false},[],'admin');
ok(s.admin&&s.canRequest&&!s.connected,'admin trial should be requestable');
s=model({plan_code:'team',status:'active',payment_provider:'stripe',billing_customer_ready:true,billing_subscription_ready:true},[{status:'pending',requested_plan:'pro'}],'admin');
ok(s.connected&&s.subscriptionReady&&!s.canRequest&&s.pending.requested_plan==='pro','pending request must block duplicates');
s=model({plan_code:'pro',status:'active'},[],'coach');
ok(!s.admin&&!s.canRequest,'coach must not control billing');
console.log('billing-v217 tests passed');
