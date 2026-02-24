const getFetch = async () => {
  if (typeof globalThis.fetch === 'function') return globalThis.fetch;
  const mod = await import('node-fetch');
  return mod.default;
};

async function postToDiscord(webhookUrl, payload) {
  if (!webhookUrl) return;
  try {
    const fetchFn = await getFetch();
    await fetchFn(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('Discord post failed', err);
  }
}

module.exports = { postToDiscord };
