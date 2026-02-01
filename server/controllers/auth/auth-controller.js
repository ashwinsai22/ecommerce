const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const logger = require("../../utils/logger");

/**
 * Register user
 */
const registerUser = async (req, res) => {
  const { userName, email } = req.body;

  logger.info("AUTH_REGISTER_REQUESTED", {
    traceId: req.id,
    email,
  });

  try {
    const checkUser = await User.findOne({ email });

    if (checkUser) {
      logger.warn("AUTH_REGISTER_USER_EXISTS", {
        traceId: req.id,
        email,
      });

      return res.json({
        success: false,
        message: "User already exists with the same email! Please try again",
      });
    }

    const hashPassword = await bcrypt.hash(req.body.password, 12);

    const newUser = new User({
      userName,
      email,
      password: hashPassword,
    });

    await newUser.save();

    logger.info("AUTH_REGISTER_SUCCESS", {
      traceId: req.id,
      userId: newUser._id,
      email,
    });

    res.status(200).json({
      success: true,
      message: "Registration successful",
    });
  } catch (e) {
    logger.error("AUTH_REGISTER_FAILED", {
      traceId: req.id,
      email,
      error: e.message,
      stack: e.stack,
    });

    res.status(500).json({
      success: false,
      message: "Some error occurred",
    });
  }
};

/**
 * Login user
 */
const loginUser = async (req, res) => {
  const { email } = req.body;

  logger.info("AUTH_LOGIN_REQUESTED", {
    traceId: req.id,
    email,
  });

  try {
    const checkUser = await User.findOne({ email });

    if (!checkUser) {
      logger.warn("AUTH_LOGIN_USER_NOT_FOUND", {
        traceId: req.id,
        email,
      });

      return res.json({
        success: false,
        message: "User doesn't exist! Please register first",
      });
    }

    const passwordMatch = await bcrypt.compare(
      req.body.password,
      checkUser.password
    );

    if (!passwordMatch) {
      logger.warn("AUTH_LOGIN_INVALID_PASSWORD", {
        traceId: req.id,
        userId: checkUser._id,
        email,
      });

      return res.json({
        success: false,
        message: "Incorrect password! Please try again",
      });
    }

    const token = jwt.sign(
      {
        id: checkUser._id,
        role: checkUser.role,
        email: checkUser.email,
        userName: checkUser.userName,
      },
      process.env.JWT_SECRET || "CLIENT_SECRET_KEY",
      { expiresIn: "60m" }
    );

    logger.info("AUTH_LOGIN_SUCCESS", {
      traceId: req.id,
      userId: checkUser._id,
      email,
      role: checkUser.role,
    });

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      token,
      user: {
        email: checkUser.email,
        role: checkUser.role,
        id: checkUser._id,
        userName: checkUser.userName,
      },
    });
  } catch (e) {
    logger.error("AUTH_LOGIN_FAILED", {
      traceId: req.id,
      email,
      error: e.message,
      stack: e.stack,
    });

    res.status(500).json({
      success: false,
      message: "Some error occurred",
    });
  }
};

/**
 * Logout user
 */
const logoutUser = (req, res) => {
  logger.info("AUTH_LOGOUT", {
    traceId: req.id,
    userId: req.user?.id,
  });

  res.clearCookie("token").json({
    success: true,
    message: "Logged out successfully!",
  });
};

/**
 * Auth middleware
 */
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    logger.warn("AUTH_MIDDLEWARE_NO_TOKEN", {
      traceId: req.id,
      path: req.originalUrl,
    });

    return res.status(401).json({
      success: false,
      message: "Unauthorized user!",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "CLIENT_SECRET_KEY"
    );

    req.user = decoded;

    logger.info("AUTH_MIDDLEWARE_SUCCESS", {
      traceId: req.id,
      userId: decoded.id,
      role: decoded.role,
    });

    next();
  } catch (error) {
    logger.warn("AUTH_MIDDLEWARE_INVALID_TOKEN", {
      traceId: req.id,
      error: error.message,
    });

    res.status(401).json({
      success: false,
      message: "Unauthorized user!",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  authMiddleware,
};
