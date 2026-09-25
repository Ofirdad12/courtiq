const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("app.js", "utf8");
const functions = source.slice(source.indexOf("function officialSeasonGames()"), source.indexOf("function oneDecimal("));
const games = {
  g1: {home: "Demo", away: "Visitor", date: "2026-09-01"},
  pilot: {home: "Local", away: "Visitor", date: "2026-09-02"},
  db_new: {_dbId: "new", home: "Club", away: "Rival", date: "2026-09-20"},
  db_old: {_dbId: "old", home: "Rival", away: "Club", date: "2026-09-10"}
};
const result = vm.runInNewContext(`${functions}; officialSeasonGames().map(g => g._dbId)`, {games});
if (JSON.stringify(result) !== '["old","new"]') throw new Error("Season history must exclude demos and sort saved games by date");
console.log("Season source isolation passed");
