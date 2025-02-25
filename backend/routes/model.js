const express = require("express");
const { PythonShell } = require("python-shell");

const router = express.Router();

router.post("/train", async (req, res) => {
  try {
    PythonShell.run("./scripts/model_train.py", null, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Model training started", output: results });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
