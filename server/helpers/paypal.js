const paypal = require("paypal-rest-sdk");
const logger = require("../utils/logger");

/* =========================
   Validate PayPal Environment
   ========================= */
const requiredEnvVars = [
  "PAYPAL_MODE",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    logger.error("PAYPAL_ENV_MISSING", {
      env: key,
    });
  }
});

const mode = process.env.PAYPAL_MODE;

if (mode !== "sandbox" && mode !== "live") {
  logger.error("PAYPAL_INVALID_MODE", {
    mode,
    expected: ["sandbox", "live"],
  });

  // Fail fast – this avoids random runtime crashes
  throw new Error('PAYPAL_MODE must be "sandbox" or "live"');
}

/* =========================
   PayPal Configuration
   ========================= */
paypal.configure({
  mode,
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

logger.info("PAYPAL_CONFIGURED", {
  mode,
});

module.exports = paypal;
