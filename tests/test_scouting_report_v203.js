const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const scout=fs.readFileSync('scouting-report-v203.js','utf8');

assert(index.includes('scouting-report-v203.js?v=203'),'v203 scouting workflow must be loaded');
assert(index.indexOf('report-exports.js?v=201') < index.indexOf('scouting-report-v203.js?v=203'),'scouting workflow must load after report exports');
assert(scout.includes('BUILD SCOUTING REPORT'),'workspace must expose the scouting report action');
assert(scout.includes('courtiq_pending_scout'),'successful imports must hand off to the scouting workflow');
assert(scout.includes('contenteditable="true"'),'coach narrative must be editable before PDF export');
assert(scout.includes('PRINT / SAVE PDF'),'report must expose PDF export through print');
assert(scout.includes('Coach Summary'),'report must contain a coach-facing executive summary');
assert(scout.includes('3 Coach Decisions'),'report must translate data into coach decisions');
assert(scout.includes('Key Players'),'report must contain player scouting context');
assert(scout.includes('Recent Form'),'report must contain recent-team context when stored games exist');
assert(scout.includes('does not infer play types, coverages or causation'),'report must preserve the evidence boundary');
assert(scout.includes('window.CourtIQScoutingReport'),'report workflow must expose a public integration surface');

console.log('CourtIQ v203 scouting report workflow contract: OK');
