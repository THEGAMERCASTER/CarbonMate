const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const USERS_FILE = path.join(__dirname, "users.json");
const DATA_FILE = path.join(__dirname, "data.json");

function readFile(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}

function writeFile(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

//////////////////////////
// REGISTER
//////////////////////////
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  let users = readFile(USERS_FILE);

  if (users.find(u => u.username === username)) {
    return res.json({ success: false, message: "Username already exists" });
  }

  users.push({ username, password });
  writeFile(USERS_FILE, users);

  res.json({ success: true });
});

//////////////////////////
// LOGIN
//////////////////////////
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  let users = readFile(USERS_FILE);

  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.json({ success: false });
  }

  res.json({ success: true });
});

//////////////////////////
// SAVE DAILY ACTIVITY
//////////////////////////
app.post("/api/add-activity", (req, res) => {
  const { username, electricity, transportKm, transportType, foodType } = req.body;

  // ค่าคำนวณแบบง่าย (ตัวอย่าง)
  const ELECTRIC_FACTOR = 0.5; // 1 kWh = 0.5 kg CO2
  const TRANSPORT_FACTORS = {
    car: 0.21,
    motorcycle: 0.1,
    bus: 0.05,
    walk: 0,
    bike: 0
  };

  const FOOD_FACTORS = {
    noodle: 1.8,
    khaokamoo: 4.5,
    khaomankai: 2.5,
    khaomudaeng: 3.5,
    kaprao: 3.8,
    friedrice: 2.2,
    padthai: 2.5,
    somtam: 1.2,
    moo_ping: 3,
    mookrata: 6,
    shabu: 5,
  };

  const electricityCarbon = electricity * ELECTRIC_FACTOR;
  const transportCarbon = transportKm * (TRANSPORT_FACTORS[transportType] || 0);
  const foodCarbon = FOOD_FACTORS[foodType] || 0;

  const total = electricityCarbon + transportCarbon + foodCarbon;

  let data = readFile(DATA_FILE);

  data.push({
    username,
    electricity,
    transportKm,
    transportType,
    foodType,
    total,
    date: new Date().toISOString()
  });

  writeFile(DATA_FILE, data);

  res.json({ success: true, total });
});

//////////////////////////
// GET TOTAL PER USER
//////////////////////////
app.get("/api/ranking", (req, res) => {
  const data = readFile(DATA_FILE);

  const totals = {};

  data.forEach(item => {
    if (!totals[item.username]) {
      totals[item.username] = 0;
    }
    totals[item.username] += item.total;
  });

  const result = Object.keys(totals).map(username => ({
    username,
    totalCarbon: totals[username].toFixed(2)
  }));

  result.sort((a, b) => a.totalCarbon - b.totalCarbon);

  res.json(result);
});

//////////////////////////
// START SERVER
//////////////////////////
const PORT = 3000;
app.listen(PORT, () => {
  console.log("Server running at http://localhost:" + PORT);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
