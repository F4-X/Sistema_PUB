const axios = require("axios");

const ENV = String(process.env.FOCUS_AMBIENTE || "homologacao").toLowerCase();

const BASE_URL = "https://api.focusnfe.com.br/v2";

function getToken() {
  const isProd =
    ENV === "prod" ||
    ENV === "producao" ||
    ENV === "production";

  const token = isProd
    ? process.env.FOCUS_TOKEN_PROD
    : process.env.FOCUS_TOKEN_HOMOLOG;

  if (!token) {
    throw new Error(
      isProd
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
    `${BASE_URL}/nfce`,
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

async function baixarPdf(nfceId) {
  const r = await axios.get(
    `${BASE_URL}/nfce/${encodeURIComponent(nfceId)}.pdf`,
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

module.exports = { emitirNfce, baixarPdf };