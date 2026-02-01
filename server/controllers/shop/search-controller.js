const Product = require("../../models/Product");
const logger = require("../../utils/logger");

/**
 * Search products
 */
const searchProducts = async (req, res) => {
  const { keyword } = req.params;

  logger.info("PRODUCT_SEARCH_REQUESTED", {
    traceId: req.id,
    keyword,
  });

  try {
    if (!keyword || typeof keyword !== "string") {
      logger.warn("PRODUCT_SEARCH_INVALID_KEYWORD", {
        traceId: req.id,
        keyword,
      });

      return res.status(400).json({
        success: false,
        message: "Keyword is required and must be in string format",
      });
    }

    const regEx = new RegExp(keyword, "i");

    const searchQuery = {
      $or: [
        { title: regEx },
        { description: regEx },
        { category: regEx },
        { brand: regEx },
      ],
    };

    const searchResults = await Product.find(searchQuery);

    logger.info("PRODUCT_SEARCH_SUCCESS", {
      traceId: req.id,
      keyword,
      count: searchResults.length,
    });

    res.status(200).json({
      success: true,
      data: searchResults,
    });
  } catch (error) {
    logger.error("PRODUCT_SEARCH_FAILED", {
      traceId: req.id,
      keyword,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Error",
    });
  }
};

module.exports = {
  searchProducts,
};
