require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Sequelize, DataTypes } = require("sequelize");

const app = express();
const PORT = process.env.PORT || 5001;

// 1. Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_BASE_URL || "http://localhost:5173",
  credentials: true
}));

// 2. Database Connection
const sequelize = new Sequelize(
  process.env.DATABASE_URL || "postgres://krmarket:krmarketpassword@localhost:5432/krmarket_identity",
  {
    dialect: "postgres",
    logging: false,
  }
);

// 3. User Model
const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userName: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: "user",
  },
});

// 4. Connect and Sync Database
sequelize.authenticate()
  .then(() => {
    console.log("PostgreSQL Connected successfully.");
    return sequelize.sync();
  })
  .then(() => {
    console.log("Database models synchronized.");
  })
  .catch(err => {
    console.error("Database connection failed:", err.message);
  });

// 5. Routes
app.get("/health", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({
      status: "UP",
      database: "CONNECTED",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: "DOWN",
      database: "DISCONNECTED",
      error: error.message
    });
  }
});

// Register
app.post("/api/auth/register", async (req, res) => {
  const { userName, email, password } = req.body;
  try {
    const checkUser = await User.findOne({ where: { email } });
    if (checkUser) {
      return res.json({
        success: false,
        message: "User already exists with the same email! Please try again",
      });
    }

    const hashPassword = await bcrypt.hash(password, 12);
    const newUser = await User.create({
      userName,
      email,
      password: hashPassword,
    });

    res.status(200).json({
      success: true,
      message: "Registration successful",
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({
      success: false,
      message: "Some error occurred",
    });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const checkUser = await User.findOne({ where: { email } });
    if (!checkUser) {
      return res.json({
        success: false,
        message: "User doesn't exist! Please register first",
      });
    }

    const passwordMatch = await bcrypt.compare(password, checkUser.password);
    if (!passwordMatch) {
      return res.json({
        success: false,
        message: "Incorrect password! Please try again",
      });
    }

    const token = jwt.sign(
      {
        id: checkUser.id,
        role: checkUser.role,
        email: checkUser.email,
        userName: checkUser.userName,
      },
      process.env.JWT_SECRET || "CLIENT_SECRET_KEY",
      { expiresIn: "60m" }
    );

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      token,
      user: {
        email: checkUser.email,
        role: checkUser.role,
        id: checkUser.id,
        userName: checkUser.userName,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Some error occurred",
    });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully!",
  });
});

app.listen(PORT, () => {
  console.log(`Identity service running on port ${PORT}`);
});
