const axios = require("axios");

const ENV = (process.env.NUVEMFISCAL_ENV || "sandbox").toLowerCase();

const BASE_URL =
  ENV === "prod" || ENV === "producao" || ENV === "production"
    ? "https://api.nuvemfiscal.com.br"
    : "https://api.sandbox.nuvemfiscal.com.br";

const TOKEN_URL = "https://auth.nuvemfiscal.com.br/oauth/token";

let cached = { token: null, exp: 0 };

async function getToken() {
  const clientId = process.env.NUVEMFISCAL_CLIENT_ID;
  const clientSecret = process.env.NUVEMFISCAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("NUVEMFISCAL_CLIENT_ID/NUVEMFISCAL_CLIENT_SECRET não configurados");
  }

  const now = Date.now();
  if (cached.token && now < cached.exp) return cached.token;

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("scope", process.env.NUVEMFISCAL_SCOPE || "nfce");

  const { data } = await axios.post(TOKEN_URL, body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    auth: { username: clientId, password: clientSecret },
    timeout: 20000,
  });

  if (!data?.access_token) {
    throw new Error(`Token sem access_token: ${JSON.stringify(data)}`);
  }

  const expiresIn = Number(data.expires_in || 3600);
  cached.token = data.access_token;
  cached.exp = now + Math.max(60, expiresIn - 60) * 1000;
  return cached.token;
}

async function emitirNfce(payload) {
  const token = await getToken();

  const { data } = await axios.post(`${BASE_URL}/nfce`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    timeout: 30000,
  });

  return data;
}

async function baixarPdf(nfceId) {
  const token = await getToken();

  const r = await axios.get(`${BASE_URL}/nfce/${encodeURIComponent(nfceId)}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: "arraybuffer",
    timeout: 30000,
  });

  return Buffer.from(r.data);
}

module.exports = { emitirNfce, baixarPdf };