const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

// Simple proxy to Jupiter quote API to avoid CORS/edge issues
router.get('/quote', async (req, res) => {
  try {
    const { inputMint, outputMint, amount, slippageBps } = req.query;
    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const url = `https://quote-api.jup.ag/v6/quote?inputMint=${encodeURIComponent(
      String(inputMint)
    )}&outputMint=${encodeURIComponent(String(outputMint))}&amount=${encodeURIComponent(
      String(amount)
    )}&slippageBps=${encodeURIComponent(String(slippageBps || 50))}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const resp = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'lazorkit-wallet-app/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return res.status(resp.status).json({ error: `Upstream error ${resp.status}`, details: text.slice(0, 200) });
    }

    const data = await resp.json();
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: 'Proxy error', message: e?.message || String(e) });
  }
});

module.exports = router;


