require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Kafka } = require("kafkajs");

const app = express();
const PORT = process.env.PORT || 5005;

app.use(express.json());
app.use(cors());

// In-memory product cache for search indexing
const productIndex = new Map();

// Kafka Setup
const kafka = new Kafka({
  clientId: "search-service",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});
const consumer = kafka.consumer({ groupId: "search-group" });
let isConsumerConnected = false;

const startConsumer = async () => {
  try {
    await consumer.connect();
    isConsumerConnected = true;
    console.log("Search Kafka Consumer connected.");

    await consumer.subscribe({ topic: "product-events", fromBeginning: true });
    console.log("Search Kafka Consumer subscribed to product-events.");

    await consumer.run({
      eachMessage: async ({ message }) => {
        const payload = JSON.parse(message.value.toString());
        const { event, data } = payload;
        console.log(`Processing event ${event} for product ${data._id || data.id}`);

        if (event === "ProductCreated" || event === "ProductUpdated") {
          productIndex.set(data._id || data.id, data);
        } else if (event === "ProductDeleted") {
          productIndex.delete(data._id || data.id);
        }
      },
    });
  } catch (error) {
    console.error("Kafka consumer error in Search Service:", error.message);
    setTimeout(startConsumer, 5000);
  }
};
startConsumer();

// Routes
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    kafka: isConsumerConnected ? "CONNECTED" : "DISCONNECTED",
    indexedProductsCount: productIndex.size,
  });
});

// Search Endpoint
app.get("/api/search/:keyword", (req, res) => {
  const { keyword } = req.params;
  const lowercaseKeyword = keyword.toLowerCase();
  
  const results = [];
  for (const product of productIndex.values()) {
    const titleMatch = product.title && product.title.toLowerCase().includes(lowercaseKeyword);
    const descMatch = product.description && product.description.toLowerCase().includes(lowercaseKeyword);
    const categoryMatch = product.category && product.category.toLowerCase().includes(lowercaseKeyword);
    const brandMatch = product.brand && product.brand.toLowerCase().includes(lowercaseKeyword);

    if (titleMatch || descMatch || categoryMatch || brandMatch) {
      results.push(product);
    }
  }

  res.status(200).json({ success: true, data: results });
});

app.listen(PORT, () => {
  console.log(`Search service running on port ${PORT}`);
});
