/**
 * Netlify Function: consulta pagos/transacciones de PayPal (Transaction Search API).
 * Las credenciales (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET) deben estar en variables de entorno.
 * En la app de PayPal hay que activar el permiso "Transaction Search".
 */

const PAYPAL_SANDBOX = 'https://api-m.sandbox.paypal.com';
const PAYPAL_LIVE = 'https://api-m.paypal.com';

function getBaseUrl() {
  const mode = process.env.PAYPAL_MODE || 'sandbox';
  return mode === 'live' ? PAYPAL_LIVE : PAYPAL_SANDBOX;
}

async function getAccessToken(baseUrl, clientId, clientSecret) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal OAuth failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

/**
 * GET /.netlify/functions/paypal-transactions
 * Query params: start_date (ISO 8601), end_date (ISO 8601), page, page_size (opcionales)
 * Rango máximo 31 días. page_size máx 500.
 */
exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'PayPal credentials not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)' }),
    };
  }

  const params = event.queryStringParameters || {};
  const startDate = params.start_date;
  const endDate = params.end_date;

  if (!startDate || !endDate) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'start_date and end_date are required (ISO 8601, e.g. 2025-02-01T00:00:00Z). Max range 31 days.',
      }),
    };
  }

  const baseUrl = getBaseUrl();
  let token;
  try {
    token = await getAccessToken(baseUrl, clientId, clientSecret);
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to get PayPal token', detail: err.message }),
    };
  }

  const page = params.page || '1';
  const pageSize = Math.min(parseInt(params.page_size || '100', 10) || 100, 500);
  const searchParams = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    page,
    page_size: String(pageSize),
    fields: 'all',
  });

  const url = `${baseUrl}/v1/reporting/transactions?${searchParams.toString()}`;
  const transRes = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!transRes.ok) {
    const text = await transRes.text();
    return {
      statusCode: transRes.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'PayPal Transaction Search failed',
        status: transRes.status,
        detail: text,
      }),
    };
  }

  const data = await transRes.json();
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(data),
  };
};
