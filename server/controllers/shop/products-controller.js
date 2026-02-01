const Product = require("../../models/Product");
const logger = require("../../utils/logger");

/**
 * Get filtered products
 */
const getFilteredProducts = async (req, res) => {
  const { category = "", brand = "", sortBy = "price-lowtohigh" } = req.query;

  logger.info("PRODUCT_FILTER_REQUESTED", {
    traceId: req.id,
    category,
    brand,
    sortBy,
  });

  try {
    let filters = {};

    if (category) {
      filters.category = { $in: category.split(",") };
    }

    if (brand) {
      filters.brand = { $in: brand.split(",") };
    }

    let sort = {};

    switch (sortBy) {
      case "price-lowtohigh":
        sort.price = 1;
        break;
      case "price-hightolow":
        sort.price = -1;
        break;
      case "title-atoz":
        sort.title = 1;
        break;
      case "title-ztoa":
        sort.title = -1;
        break;
      default:
        sort.price = 1;
    }

    const products = await Product.find(filters).sort(sort);

    logger.info("PRODUCT_FILTER_SUCCESS", {
      traceId: req.id,
      category,
      brand,
      sortBy,
      count: products.length,
    });

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (e) {
    logger.error("PRODUCT_FILTER_FAILED", {
      traceId: req.id,
      category,
      brand,
      sortBy,
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
 * Get product details
 */
const getProductDetails = async (req, res) => {
  const { id } = req.params;

  logger.info("PRODUCT_DETAILS_REQUESTED", {
    traceId: req.id,
    productId: id,
  });

  try {
    const product = await Product.findById(id);

    if (!product) {
      logger.warn("PRODUCT_DETAILS_NOT_FOUND", {
        traceId: req.id,
        productId: id,
      });

      return res.status(404).json({
        success: false,
        message: "Product not found!",
      });
    }

    logger.info("PRODUCT_DETAILS_SUCCESS", {
      traceId: req.id,
      productId: id,
    });

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (e) {
    logger.error("PRODUCT_DETAILS_FAILED", {
      traceId: req.id,
      productId: id,
      error: e.message,
      stack: e.stack,
    });

    res.status(500).json({
      success: false,
      message: "Some error occurred",
    });
  }
};

module.exports = {
  getFilteredProducts,
  getProductDetails,
};
