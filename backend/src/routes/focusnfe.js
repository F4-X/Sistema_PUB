const axios = require("axios");

const ENV = String(process.env.FOCUS_AMBIENTE || "homologacao").toLowerCase();

const BASE_URL =
  ENV === "prod" || ENV === "producao" || ENV === "production"
    ? "https://api.focusnfe.com.br/v2"
    : "https://homologacao.focusnfe.com.br/v2";

const FILE_BASE_URL =
  ENV === "prod" || ENV === "producao" || ENV === "production"
    ? "https://api.focusnfe.com.br"
    : "https://homologacao.focusnfe.com.br";

function isProdEnv() {
  return (
    ENV === "prod" ||
    ENV === "producao" ||
    ENV === "production"
  );
}

function getToken() {
  const token = isProdEnv()
    ? process.env.FOCUS_TOKEN_PROD
    : process.env.FOCUS_TOKEN_HOMOLOG;

  if (!token) {
    throw new Error(
      isProdEnv()
        ? "FOCUS_TOKEN_PROD não configurado"
        : "FOCUS_TOKEN_HOMOLOG não configurado"
    );
  }

  return token;
}

function authConfig(extra = {}) {
  return {
    ...extra,
    auth: {
      username: getToken(),
      password: "",
    },
  };
}

async function emitirNfce(payload) {
  const ref = payload?.ref || `pub_${Date.now()}`;

  const body = {
    ...payload,
    ref,
  };

  const { data } = await axios.post(
    `${BASE_URL}/nfce?ref=${encodeURIComponent(ref)}`,
    body,
    authConfig({
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000,
    })
  );

  return data;
}

async function consultarNfce(ref) {
  if (!ref) {
    throw new Error("Referência da NFC-e não informada");
  }

  const { data } = await axios.get(
    `${BASE_URL}/nfce/${encodeURIComponent(ref)}`,
    authConfig({
      headers: {
        Accept: "application/json",
      },
      timeout: 30000,
    })
  );

  return data;
}

async function baixarPdf(refOuId) {
  if (!refOuId) {
    throw new Error("Referência/ID da NFC-e não informado");
  }

  const r = await axios.get(
    `${BASE_URL}/nfce/${encodeURIComponent(refOuId)}.pdf`,
    authConfig({
      responseType: "arraybuffer",
      headers: {
        Accept: "application/pdf",
      },
      timeout: 30000,
    })
  );

  return Buffer.from(r.data);
}

async function baixarXml(refOuCaminho) {
  if (!refOuCaminho) {
    throw new Error("Referência/caminho do XML não informado");
  }

  const valor = String(refOuCaminho).trim();

  if (valor.startsWith("/arquivos/")) {
    const r = await axios.get(
      `${FILE_BASE_URL}${valor}`,
      authConfig({
        responseType: "arraybuffer",
        headers: {
          Accept: "application/xml",
        },
        timeout: 30000,
      })
    );

    return Buffer.from(r.data);
  }

  const dados = await consultarNfce(valor);

  const caminhoXml =
    dados?.caminho_xml_nota_fiscal ||
    dados?.caminho_xml ||
    dados?.xml;

  if (!caminhoXml) {
    throw new Error("XML não encontrado na resposta da Focus");
  }

  if (String(caminhoXml).trim().startsWith("<")) {
    return Buffer.from(caminhoXml);
  }

  const url = String(caminhoXml).startsWith("http")
    ? caminhoXml
    : `${FILE_BASE_URL}${caminhoXml}`;

  const r = await axios.get(
    url,
    authConfig({
      responseType: "arraybuffer",
      headers: {
        Accept: "application/xml",
      },
      timeout: 30000,
    })
  );

  return Buffer.from(r.data);
}

module.exports = {
  emitirNfce,
  consultarNfce,
  baixarPdf,
  baixarXml,
};