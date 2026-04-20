const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));
app.use(express.json());
app.get("/", (req, res) => res.redirect("/client.html"));

// Kirjautumis ja registeröinti mekaniikat
const usersFile = path.join(__dirname, "users.json");
const readUsers = () => {
  try { return JSON.parse(fs.readFileSync(usersFile, "utf8")); }
  catch { return {}; }
};
const writeUsers = users => fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || username.length < 1 || password.length < 4) {
    return res.json({ success: false, message: "Käyttäjänimi 1+ ja salasana 4+ merkkiä " });
  }
  const users = readUsers();
  if (users[username]) return res.json({ success: false, message: "Käyttäjä tällä nimellä on jo" });
  users[username] = password;
  writeUsers(users);
  res.json({ success: true, message: "Rekisteröinti onnistui!" });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();
  if (users[username] === password) {
    res.json({ success: true, token: Math.random().toString(36).substr(2, 15), username });
  } else {
    res.json({ success: false, message: "Väärin kirjoitettu nimi tai salasana" });
  }
});
// Kirjautumis ja registeröinti mekaniikat

// Chatin perus mekaniikka
const messages = [];
const modsFile = path.join(__dirname, "mods.json");
const vipsFile = path.join(__dirname, "vips.json");
const readMods = () => {
  try { return JSON.parse(fs.readFileSync(modsFile, "utf8")) || []; }
  catch { return []; }
};
const writeMods = mods => fs.writeFileSync(modsFile, JSON.stringify(mods, null, 2));
const readVips = () => {
  try { return JSON.parse(fs.readFileSync(vipsFile, "utf8")) || []; }
  catch { return []; }
};
const writeVips = vips => fs.writeFileSync(vipsFile, JSON.stringify(vips, null, 2));

wss.on("connection", ws => {
  messages.forEach(msg => ws.send(msg));
  ws.on("message", msg => {
    const text = msg.toString();
    const [name, ...rest] = text.split(": ");
    const content = rest.join(": ");
    if (content.startsWith("!")) {
      handleCommand(name, content, ws);
    } else {
      const mods = readMods();
      const vips = readVips();
      const isMod = mods.includes(name);
      const isVip = vips.includes(name);
      const msgObj = JSON.stringify({ name, text: content, isMod, isVip });
      messages.push(msgObj);
      broadcast(msgObj);
    }
  });
});
// Chatin perus mekaniikka

// Chat komennot
const handleCommand = (name, content, ws) => {
  const mods = readMods();
  const isMod = mods.includes(name);
  

  if (!isMod) {
    ws.send(`System: Sulla ei oo modemiekkaa, et voi tehä näin`);
    return;
  }
  
  const [cmd, ...args] = content.slice(1).split(" ");
  const argsStr = args.join(" ");
  const respond = msg => ws.send(`System: ${msg}`);
  
  if (cmd === "clear") { messages.length = 0; broadcast("System: Chat tyhjennettiin"); }
  else if (cmd === "announce") broadcast(`System: ${argsStr}`);
  else if (cmd === "mod") {
    if (mods.includes(argsStr)) respond(`${argsStr} on jo modemiekka`);
    else { mods.push(argsStr); writeMods(mods); broadcast(`System: ${argsStr} on nyt modemiekka`); }
  }
  else if (cmd === "unmod") {
    if (!mods.includes(argsStr)) respond(`${argsStr} ei oo modemiekkaa`);
    else { writeMods(mods.filter(m => m !== argsStr)); broadcast(`System: ${argsStr} ei oo enää modemiekkaa`); }
  }
  else if (cmd === "vip") {
    const vips = readVips();
    if (vips.includes(argsStr)) respond(`${argsStr} on jo vip`);
    else { vips.push(argsStr); writeVips(vips); broadcast(`System: ${argsStr} on nyt vip`); }
  }
  else if (cmd === "unvip") {
    const vips = readVips();
    if (!vips.includes(argsStr)) respond(`${argsStr} ei oo vip`);
    else { writeVips(vips.filter(v => v !== argsStr)); broadcast(`System: ${argsStr} ei oo enää vip`); }
  }
  else respond(`älä laita tällästä: ${cmd}`);
};
// Chat komennot

const broadcast = msg => wss.clients.forEach(c => c.readyState === WebSocket.OPEN && c.send(msg));

server.listen(3000, "0.0.0.0", () => 
console.log("servu pääl: http://10.146.4.241:3000"));