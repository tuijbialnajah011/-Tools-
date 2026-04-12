const express = require("express");
const app = express();
try {
  app.get('*all', (req, res) => res.send('ok'));
  console.log("Registered *all successfully");
} catch (e) {
  console.error("Error registering *all:", e.message);
}
