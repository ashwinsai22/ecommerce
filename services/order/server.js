require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Sequelize, DataTypes } = require("sequelize");
const { Kafka } = require("kafkajs");

const app = express();
const PORT = process.env.PORT || 5004;

app.use(express.json());
app.use(cors());

// 1. Database Connection (PostgreSQL)
const sequelize = new Sequelize(
  process.env.DATABASE_URL || "postgres://krmarket:krmarketpassword@localhost:5432/krmarket_orders",
  {
    dialect: "postgres",
    logging: false,
  }
);

// 2. Order Model
const Order = sequelize.define("Order", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cartItems: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  addressInfo: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  orderStatus: {
    type: DataTypes.STRING,
    defaultValue: "pending", // pending, confirmed, cancelled
  },
  paymentMethod: DataTypes.STRING,
  paymentStatus: {
    type: DataTypes.STRING,
    defaultValue: "pending",
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  paymentId: DataTypes.STRING,
  payerId: DataTypes.STRING,
});

// 3. Connect and Sync Database
sequelize.authenticate()
  .then(() => {
    console.log("Order Database connected.");
    return sequelize.sync();
  })
  .then(() => console.log("Order models synced."))
  .catch(err => console.error("Order Database connection failed:", err.message));

// 4. Kafka Setup
const kafka = new Kafka({
  clientId: "order-service",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "order-group" });
let isProducerConnected = false;

const startKafka = async () => {
  try {
    await producer.connect();
    isProducerConnected = true;
    console.log("Order Kafka Producer connected.");

    await consumer.connect();
    await consumer.subscribe({ topic: "payment-events", fromBeginning: true });
    console.log("Order Kafka Consumer connected & subscribed to payment-events.");

    await consumer.run({
      eachMessage: async ({ message }) => {
        const payload = JSON.parse(message.value.toString());
        console.log("Received payment event:", payload);
        const { orderId, success } = payload.data;

        if (payload.event === "PaymentProcessed") {
          const status = success ? "confirmed" : "cancelled";
          const payStatus = success ? "paid" : "failed";
          
          await Order.update(
            { orderStatus: status, paymentStatus: payStatus },
            { where: { id: orderId } }
          );
          console.log(`Order ${orderId} updated to ${status}.`);
        }
      },
    });
  } catch (error) {
    console.error("Kafka setup error in Order Service:", error.message);
    setTimeout(startKafka, 5000);
  }
};
startKafka();

const publishOrderEvent = async (eventType, order) => {
  if (!isProducerConnected) {
    console.warn("Kafka producer not connected, skipping event publish:", eventType);
    return;
  }
  try {
    await producer.send({
      topic: "order-events",
      messages: [
        {
          key: order.id,
          value: JSON.stringify({ event: eventType, data: order }),
        },
      ],
    });
  } catch (error) {
    console.error("Error publishing order event:", error.message);
  }
};

// 5. Routes
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    kafka: isProducerConnected ? "CONNECTED" : "DISCONNECTED"
  });
});

// Create Order
app.post("/api/orders/create", async (req, res) => {
  try {
    const order = await Order.create(req.body);
    await publishOrderEvent("OrderCreated", order);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Order details
app.get("/api/orders/:id", async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Order service running on port ${PORT}`);
});
