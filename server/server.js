require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
const { randomUUID } = require("crypto");

const logger = require("./utils/logger"); // ✅ USE CENTRAL LOGGER

const authRouter = require("./routes/auth/auth-routes");
const adminProductsRouter = require("./routes/admin/products-routes");
const adminOrderRouter = require("./routes/admin/order-routes");

const shopProductsRouter = require("./routes/shop/products-routes");
const shopCartRouter = require("./routes/shop/cart-routes");
const shopAddressRouter = require("./routes/shop/address-routes");
const shopOrderRouter = require("./routes/shop/order-routes");
const shopSearchRouter = require("./routes/shop/search-routes");
const shopReviewRouter = require("./routes/shop/review-routes");

const commonFeatureRouter = require("./routes/common/feature-routes");

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================
   MongoDB Connection
   ========================= */
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => logger.info("MONGODB_CONNECTED"))
  .catch((error) =>
    logger.error("MONGODB_CONNECTION_FAILED", {
      error: error.message,
      stack: error.stack,
    })
  );

/* =========================
   Request Correlation ID
   ========================= */
app.use((req, res, next) => {
  req.id = randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
});

/* =========================
   Morgan Access Logs (JSON)
   ========================= */
morgan.token("trace-id", (req) => req.id);

app.use(
  morgan((tokens, req, res) =>
    JSON.stringify({
      level: "info",
      type: "access",
      time: new Date().toISOString(),
      traceId: tokens["trace-id"](req, res),
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: Number(tokens.status(req, res)),
      responseTime: `${tokens["response-time"](req, res)} ms`,
      contentLength: tokens.res(req, res, "content-length"),
      ip: tokens["remote-addr"](req, res),
      userAgent: tokens["user-agent"](req, res),
    })
  )
);

/* =========================
   Middleware
   ========================= */
app.use(
  cors({
    origin: process.env.CLIENT_BASE_URL,
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Expires",
      "Pragma",
    ],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

/* =========================
   Health Check
   ========================= */
app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState;

  if (dbState === 1) {
    logger.info("HEALTH_CHECK_OK", { traceId: req.id });

    return res.status(200).json({
      status: "UP",
      database: "CONNECTED",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }

  logger.warn("HEALTH_CHECK_DB_DOWN", { traceId: req.id });

  res.status(503).json({
    status: "DOWN",
    database: "DISCONNECTED",
    timestamp: new Date().toISOString(),
  });
});

/* =========================
   Routes
   ========================= */
app.use("/api/auth", authRouter);
app.use("/api/admin/products", adminProductsRouter);
app.use("/api/admin/orders", adminOrderRouter);

app.use("/api/shop/products", shopProductsRouter);
app.use("/api/shop/cart", shopCartRouter);
app.use("/api/shop/address", shopAddressRouter);
app.use("/api/shop/order", shopOrderRouter);
app.use("/api/shop/search", shopSearchRouter);
app.use("/api/shop/review", shopReviewRouter);

app.use("/api/common/feature", commonFeatureRouter);

/* =========================
   404 Handler
   ========================= */
app.use((req, res) => {
  logger.warn("ROUTE_NOT_FOUND", {
    traceId: req.id,
    method: req.method,
    url: req.originalUrl,
  });

  res.status(404).json({
    message: "Route not found",
    traceId: req.id,
  });
});

/* =========================
   Global Error Handler
   ========================= */
app.use((err, req, res, next) => {
  logger.error("UNHANDLED_ERROR", {
    traceId: req.id,
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    message: "Internal Server Error",
    traceId: req.id,
  });
});

/* =========================
   Start Server
   ========================= */
app.listen(PORT, () => {
  logger.info("SERVER_STARTED", { port: PORT });
});
