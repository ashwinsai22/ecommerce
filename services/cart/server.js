require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("redis");

const app = express();
const PORT = process.env.PORT || 5003;

app.use(express.json());
app.use(cors());

// 1. Redis Connection
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.connect()
  .then(() => console.log("Cart Redis connected successfully."))
  .catch((err) => console.error("Redis connection failed:", err.message));

// Helper: Cart Key
const getCartKey = (userId) => `cart:${userId}`;

// 2. Routes
app.get("/health", async (req, res) => {
  try {
    const ping = await redisClient.ping();
    res.status(200).json({
      status: "UP",
      redis: ping === "PONG" ? "CONNECTED" : "DISCONNECTED"
    });
  } catch (error) {
    res.status(503).json({ status: "DOWN", error: error.message });
  }
});

// Get Cart
app.get("/api/cart/get/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const rawCart = await redisClient.get(getCartKey(userId));
    const items = rawCart ? JSON.parse(rawCart) : [];
    res.status(200).json({ success: true, data: { userId, items } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add to Cart
app.post("/api/cart/add", async (req, res) => {
  const { userId, productId, quantity } = req.body;
  if (!userId || !productId || !quantity) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }
  try {
    const key = getCartKey(userId);
    const rawCart = await redisClient.get(key);
    let items = rawCart ? JSON.parse(rawCart) : [];

    const existingItemIndex = items.findIndex((item) => item.productId === productId);
    if (existingItemIndex > -1) {
      items[existingItemIndex].quantity += Number(quantity);
    } else {
      items.push({ productId, quantity: Number(quantity) });
    }

    await redisClient.set(key, JSON.stringify(items));
    res.status(200).json({ success: true, data: { userId, items } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Quantity
app.put("/api/cart/update-cart", async (req, res) => {
  const { userId, productId, quantity } = req.body;
  if (!userId || !productId || quantity === undefined) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }
  try {
    const key = getCartKey(userId);
    const rawCart = await redisClient.get(key);
    if (!rawCart) return res.status(404).json({ success: false, message: "Cart not found" });

    let items = JSON.parse(rawCart);
    const existingItemIndex = items.findIndex((item) => item.productId === productId);
    if (existingItemIndex > -1) {
      if (Number(quantity) <= 0) {
        items.splice(existingItemIndex, 1);
      } else {
        items[existingItemIndex].quantity = Number(quantity);
      }
      await redisClient.set(key, JSON.stringify(items));
      return res.status(200).json({ success: true, data: { userId, items } });
    }
    res.status(404).json({ success: false, message: "Item not found in cart" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete Item
app.delete("/api/cart/:userId/:productId", async (req, res) => {
  const { userId, productId } = req.params;
  try {
    const key = getCartKey(userId);
    const rawCart = await redisClient.get(key);
    if (!rawCart) return res.status(404).json({ success: false, message: "Cart not found" });

    let items = JSON.parse(rawCart);
    items = items.filter((item) => item.productId !== productId);

    await redisClient.set(key, JSON.stringify(items));
    res.status(200).json({ success: true, data: { userId, items } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Cart service running on port ${PORT}`);
});
