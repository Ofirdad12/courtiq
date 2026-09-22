const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("app.js", "utf8").split("const menu=")[0] + `
  if (games.g1.sourceUrl !== "https://ibasketball.co.il/match/x99002-1/") throw new Error("official source URL");
  if (games.g1.players.home.length !== 12 || games.g1.players.away.length !== 11) throw new Error("player count");
  if (games.g1.stats.find(row => row[0] === "ORtg")[1] !== 114.3) throw new Error("home ORtg");
  if (games.g1.splits.home.bench.points !== 51 || games.g1.splits.away.bench.points !== 18) throw new Error("bench points");
  if (games.g1.players.home.find(player => player.name.includes("אוסיגוואי")).minutes !== 22.8) throw new Error("IBBA decimal minutes");
`;

vm.runInNewContext(source, { console });
console.log("official Lev Jerusalem-Karmiel analytics passed");
