const db = require("./db");
const bcrypt = require("bcryptjs");

function splitSql(sql) {
  return String(sql || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/--.*$/g, ""))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function runMany(sql) {
  const parts = splitSql(sql);
  for (const p of parts) await db.query(p);
}

async function ensureAllTables() {
  await runMany(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'admin',
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL UNIQUE,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      preco NUMERIC(10,2) NOT NULL DEFAULT 0,
      categoria_id INT NULL,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS vendas (
      id SERIAL PRIMARY KEY,
      caixa_numero INT NOT NULL DEFAULT 1,
      total_bruto NUMERIC(10,2) NOT NULL DEFAULT 0,
      desconto NUMERIC(10,2) NOT NULL DEFAULT 0,
      acrescimo NUMERIC(10,2) NOT NULL DEFAULT 0,
      total_final NUMERIC(10,2) NOT NULL DEFAULT 0,
      troco NUMERIC(10,2) NOT NULL DEFAULT 0,
      nfce_status TEXT NULL,
      nfce_chave TEXT NULL,
      nfce_numero INT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS venda_itens (
      id SERIAL PRIMARY KEY,
      venda_id INT NOT NULL,
      produto_id INT NOT NULL,
      qtd INT NOT NULL DEFAULT 1,
      preco_unit NUMERIC(10,2) NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS venda_pagamentos (
      id SERIAL PRIMARY KEY,
      venda_id INT NOT NULL,
      tipo TEXT NOT NULL,
      valor NUMERIC(10,2) NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS caixa_movimentos (
      id SERIAL PRIMARY KEY,
      tipo TEXT NOT NULL,
      valor NUMERIC(10,2) NOT NULL,
      motivo TEXT NOT NULL,
      origem TEXT NULL,
      observacao TEXT NULL,
      usuario_id INT NULL,
      usuario_email TEXT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS fechamentos (
      id SERIAL PRIMARY KEY,
      caixa_numero INT NOT NULL DEFAULT 1,
      inicio TIMESTAMP NOT NULL,
      fim TIMESTAMP NOT NULL,
      faturamento NUMERIC(10,2) NOT NULL DEFAULT 0,
      qtd_vendas INT NOT NULL DEFAULT 0,
      por_pagamento JSONB NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS funcionarios (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL UNIQUE,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS marcados (
      id SERIAL PRIMARY KEY,
      funcionario_id INT NOT NULL,
      data DATE NOT NULL,
      descricao TEXT,
      valor_bruto NUMERIC(10,2) NOT NULL,
      taxa_pct NUMERIC(5,2) NOT NULL DEFAULT 15,
      taxa_valor NUMERIC(10,2) NOT NULL,
      valor_liquido NUMERIC(10,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente',
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      fechado_em TIMESTAMP NULL
    );

    CREATE TABLE IF NOT EXISTS nfce_numero (
      id INT PRIMARY KEY DEFAULT 1,
      proximo_numero INT NOT NULL DEFAULT 1,
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS financeiro_xmls (
      id SERIAL PRIMARY KEY,
      nome_arquivo TEXT NOT NULL,
      xml TEXT NOT NULL,
      numero_documento TEXT,
      nosso_numero TEXT,
      cedente TEXT,
      sacado TEXT,
      valor_documento NUMERIC(10,2),
      data_vencimento TEXT,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contas_pagar (
      id SERIAL PRIMARY KEY,
      fornecedor TEXT NULL,
      numero_nf TEXT NULL,
      chave TEXT NULL,
      valor NUMERIC(10,2) NULL,
      vencimento DATE NULL,
      status TEXT NOT NULL DEFAULT 'pendente',
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      pago_em TIMESTAMP NULL
    );

    INSERT INTO nfce_numero (id, proximo_numero)
    VALUES (1, 1)
    ON CONFLICT (id) DO NOTHING;
  `);

  try {
    await db.query(`ALTER TABLE vendas ADD COLUMN IF NOT EXISTS nfce_id TEXT NULL`);
  } catch {}

  try {
    await db.query(`ALTER TABLE vendas ADD COLUMN IF NOT EXISTS nfce_motivo TEXT NULL`);
  } catch {}

  try {
    await db.query(`ALTER TABLE vendas ADD COLUMN IF NOT EXISTS nfce_retorno JSONB NULL`);
  } catch {
    try {
      await db.query(`ALTER TABLE vendas ADD COLUMN IF NOT EXISTS nfce_retorno TEXT NULL`);
    } catch {}
  }

  try {
    await db.query(`
      ALTER TABLE contas_pagar
      ALTER COLUMN valor TYPE NUMERIC(10,2)
      USING valor::NUMERIC(10,2)
    `);
  } catch {}

  try {
    await db.query(`
      ALTER TABLE contas_pagar
      ADD COLUMN IF NOT EXISTS pago_em TIMESTAMP NULL
    `);
  } catch {}

  try {
    await db.query(`
      ALTER TABLE produtos
      ADD CONSTRAINT produtos_categoria_id_fkey
      FOREIGN KEY (categoria_id) REFERENCES categorias(id)
      ON DELETE SET NULL
    `);
  } catch {}

  try {
    await db.query(`
      ALTER TABLE venda_itens
      ADD CONSTRAINT venda_itens_venda_id_fkey
      FOREIGN KEY (venda_id) REFERENCES vendas(id)
      ON DELETE CASCADE
    `);
  } catch {}

  try {
    await db.query(`
      ALTER TABLE venda_itens
      ADD CONSTRAINT venda_itens_produto_id_fkey
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
      ON DELETE RESTRICT
    `);
  } catch {}

  try {
    await db.query(`
      ALTER TABLE venda_pagamentos
      ADD CONSTRAINT venda_pagamentos_venda_id_fkey
      FOREIGN KEY (venda_id) REFERENCES vendas(id)
      ON DELETE CASCADE
    `);
  } catch {}

  try {
    await db.query(`
      ALTER TABLE marcados
      ADD CONSTRAINT marcados_funcionario_id_fkey
      FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id)
      ON DELETE CASCADE
    `);
  } catch {}

  try {
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento
      ON contas_pagar(vencimento)
    `);
  } catch {}

  try {
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_contas_pagar_status
      ON contas_pagar(status)
    `);
  } catch {}
}

async function fixSeq(table, col = "id") {
  const seqR = await db.query(
    `SELECT pg_get_serial_sequence($1,$2) AS seq`,
    [table, col]
  );

  const seq = seqR.rows?.[0]?.seq;
  if (!seq) return;

  await db.query(
    `SELECT setval($1, GREATEST(COALESCE((SELECT MAX(${col}) FROM ${table}),1),1), true)`,
    [seq]
  );
}

async function fixAllSequences() {
  await fixSeq("usuarios");
  await fixSeq("categorias");
  await fixSeq("produtos");
  await fixSeq("vendas");
  await fixSeq("venda_itens");
  await fixSeq("venda_pagamentos");
  await fixSeq("caixa_movimentos");
  await fixSeq("fechamentos");
  await fixSeq("funcionarios");
  await fixSeq("marcados");
  await fixSeq("financeiro_xmls");
  await fixSeq("contas_pagar");
}

async function ensureAdmin() {
  const email = String(process.env.ADMIN_EMAIL || "admin@pub.com").trim();
  const senha = String(process.env.ADMIN_SENHA || "123456");

  if (!email) throw new Error("ADMIN_EMAIL vazio no .env");

  const r = await db.query("SELECT id FROM usuarios WHERE email=$1 LIMIT 1", [email]);

  if (!r.rows.length) {
    const senha_hash = await bcrypt.hash(senha, 10);

    await db.query(
      `INSERT INTO usuarios (email, senha_hash, tipo, ativo)
       VALUES ($1, $2, 'admin', true)`,
      [email, senha_hash]
    );

    console.log("👤 Admin criado automaticamente:");
    console.log("   email:", email);
    console.log("   senha:", senha);
  } else {
    console.log("👤 Admin já existe:", email);
  }
}

async function initOnStart() {
  console.log("⚙️ initOnStart: garantindo tabelas...");
  await ensureAllTables();

  console.log("🔧 alinhando sequences...");
  await fixAllSequences();

  console.log("👤 garantindo admin...");
  await ensureAdmin();

  console.log("✅ initOnStart: ok");
}

module.exports = { initOnStart };