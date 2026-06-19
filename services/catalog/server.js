require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Kafka } = require("kafkajs");

const app = express();
const PORT = process.env.PORT || 5002;

app.use(express.json());
app.use(cors());

// 1. MongoDB Connection
mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017/krmarket_catalog")
  .then(() => console.log("Catalog MongoDB connected."))
  .catch(err => console.error("Catalog MongoDB connection failed:", err.message));

// 2. Product Schema
const ProductSchema = new mongoose.Schema(
  {
    image: String,
    title: String,
    description: String,
    category: String,
    brand: String,
    price: Number,
    salePrice: Number,
    totalStock: Number,
    averageReview: Number,
  },
  { timestamps: true }
);
const Product = mongoose.model("Product", ProductSchema);

// 3. Kafka Setup
const kafka = new Kafka({
  clientId: "catalog-service",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});
const producer = kafka.producer();
let isProducerConnected = false;

const connectProducer = async () => {
  try {
    await producer.connect();
    isProducerConnected = true;
    console.log("Catalog Kafka Producer connected.");
  } catch (error) {
    console.error("Failed to connect Kafka Producer:", error.message);
    // Retry in 5s
    setTimeout(connectProducer, 5000);
  }
};
connectProducer();

const publishProductEvent = async (eventType, product) => {
  if (!isProducerConnected) {
    console.warn("Kafka producer not connected, skipping event publish:", eventType);
    return;
  }
  try {
    await producer.send({
      topic: "product-events",
      messages: [
        {
          key: product._id.toString(),
          value: JSON.stringify({ event: eventType, data: product }),
        },
      ],
    });
  } catch (error) {
    console.error("Error publishing product event:", error.message);
  }
};

// 4. Routes
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    mongo: mongoose.connection.readyState === 1 ? "CONNECTED" : "DISCONNECTED",
    kafka: isProducerConnected ? "CONNECTED" : "DISCONNECTED"
  });
});

// Get Products
app.get("/api/catalog/products", async (req, res) => {
  try {
    const products = await Product.find({});
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create Product
app.post("/api/catalog/products", async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    await publishProductEvent("ProductCreated", product);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Product
app.put("/api/catalog/products/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    await publishProductEvent("ProductUpdated", product);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Catalog service running on port ${PORT}`);
});
