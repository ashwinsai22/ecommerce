const Order = require("../../models/Order");
const Product = require("../../models/Product");
const ProductReview = require("../../models/Review");
const logger = require("../../utils/logger");

/**
 * Add product review
 */
const addProductReview = async (req, res) => {
  const { productId, userId, reviewValue } = req.body;

  logger.info("REVIEW_ADD_REQUESTED", {
    traceId: req.id,
    productId,
    userId,
    reviewValue,
  });

  try {
    // Check if user has purchased the product
    const order = await Order.findOne({
      userId,
      "cartItems.productId": productId,
    });

    if (!order) {
      logger.warn("REVIEW_ADD_NOT_PURCHASED", {
        traceId: req.id,
        productId,
        userId,
      });

      return res.status(403).json({
        success: false,
        message: "You need to purchase product to review it.",
      });
    }

    // Check if review already exists
    const existingReview = await ProductReview.findOne({
      productId,
      userId,
    });

    if (existingReview) {
      logger.warn("REVIEW_ADD_ALREADY_EXISTS", {
        traceId: req.id,
        productId,
        userId,
      });

      return res.status(400).json({
        success: false,
        message: "You already reviewed this product!",
      });
    }

    const newReview = new ProductReview({
      productId,
      userId,
      userName: req.body.userName,
      reviewMessage: req.body.reviewMessage,
      reviewValue,
    });

    await newReview.save();

    // Recalculate average review
    const reviews = await ProductReview.find({ productId });
    const totalReviews = reviews.length;
    const averageReview =
      reviews.reduce((sum, r) => sum + r.reviewValue, 0) / totalReviews;

    await Product.findByIdAndUpdate(productId, { averageReview });

    logger.info("REVIEW_ADD_SUCCESS", {
      traceId: req.id,
      productId,
      userId,
      reviewValue,
      totalReviews,
      averageReview,
    });

    res.status(201).json({
      success: true,
      data: newReview,
    });
  } catch (e) {
    logger.error("REVIEW_ADD_FAILED", {
      traceId: req.id,
      productId,
      userId,
      error: e.message,
      stack: e.stack,
    });

    res.status(500).json({
      success: false,
      message: "Error",
    });
  }
};

/**
 * Get product reviews
 */
const getProductReviews = async (req, res) => {
  const { productId } = req.params;

  logger.info("REVIEW_FETCH_REQUESTED", {
    traceId: req.id,
    productId,
  });

  try {
    const reviews = await ProductReview.find({ productId });

    logger.info("REVIEW_FETCH_SUCCESS", {
      traceId: req.id,
      productId,
      count: reviews.length,
    });

    res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (e) {
    logger.error("REVIEW_FETCH_FAILED", {
      traceId: req.id,
      productId,
      error: e.message,
      stack: e.stack,
    });

    res.status(500).json({
      success: false,
      message: "Error",
    });
  }
};

module.exports = {
  addProductReview,
  getProductReviews,
};
