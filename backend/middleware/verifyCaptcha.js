// Verifies Google reCAPTCHA v2/v3 token in req.body.captchaToken
// If RECAPTCHA_SECRET not configured, this middleware becomes a no-op (allows development)
module.exports = async function verifyCaptcha(req, res, next) {
  try {
    const secret = process.env.RECAPTCHA_SECRET;
    const token = req.body?.captchaToken || req.headers['x-captcha-token'];

    if (!secret) {
      // No captcha configured; skip verification
      return next();
    }

    if (!token) {
      return res.status(400).json({ message: 'Captcha token missing' });
    }

    // Use global fetch available in Node 18+; fall back to require'd fetch if needed
    const fetchFn = typeof fetch !== 'undefined' ? fetch : (await import('node-fetch')).default;
    const resp = await fetchFn(`https://www.google.com/recaptcha/api/siteverify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`
    });

    const data = await resp.json();
    if (!data.success) {
      return res.status(400).json({ message: 'Captcha verification failed', details: data['error-codes'] || [] });
    }

    // Optionally, you can check score for v3: data.score >= 0.5
    next();
  } catch (err) {
    console.error('Captcha verification error:', err);
    // Fail-open? better to fail closed; return error
    return res.status(500).json({ message: 'Captcha verification error' });
  }
};
