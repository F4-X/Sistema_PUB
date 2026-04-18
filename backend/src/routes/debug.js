const router = require("express").Router();
const db = require("../db");

router.get("/nfce/set/:num", async (req, res) => {
  const num = Number(req.params.num);

  await db.query(`
    UPDATE nfce_numero
    SET proximo_numero = $1,
        atualizado_em = NOW()
    WHERE id = 1
  `, [num]);

  const r = await db.query("SELECT * FROM nfce_numero");
  res.json(r.rows);
});

module.exports = router;