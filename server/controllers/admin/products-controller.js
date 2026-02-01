const { imageUploadUtil } = require("../../helpers/cloudinary");
const Product = require("../../models/Product");
const logger = require("../../utils/logger");

/**
 * Upload product image
 */
const handleImageUpload = async (req, res) => {
  logger.info("PRODUCT_IMAGE_UPLOAD_REQUESTED", {
    traceId: req.id,
    mimeType: req.file?.mimetype,
  });

  try {
    if (!req.file) {
      logger.warn("PRODUCT_IMAGE_UPLOAD_NO_FILE", {
        traceId: req.id,
      });

      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const url = `data:${req.file.mimetype};base64,${b64}`;
    const result = await imageUploadUtil(url);

    logger.info("PRODUCT_IMAGE_UPLOAD_SUCCESS", {
      traceId: req.id,
      publicId: result?.public_id,
    });

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error("PRODUCT_IMAGE_UPLOAD_FAILED", {
      traceId: req.id,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Error occurred",
    });
  }
};

/**
 * Add a new product
 */
const addProduct = async (req, res) => {
  const {
    title,
    category,
    brand,
    price,
    salePrice,
    totalStock,
    averageReview,
  } = req.body;

  logger.info("PRODUCT_CREATE_REQUESTED", {
    traceId: req.id,
    title,
    category,
    brand,
  });

  try {
    const newlyCreatedProduct = new Product(req.body);
    await newlyCreatedProduct.save();

    logger.info("PRODUCT_CREATE_SUCCESS", {
      traceId: req.id,
      productId: newlyCreatedProduct._id,
    });

    res.status(201).json({
      success: true,
      data: newlyCreatedProduct,
    });
  } catch (e) {
    logger.error("PRODUCT_CREATE_FAILED", {
      traceId: req.id,
      error: e.message,
      stack: e.stack,
    });

    res.status(500).json({
      success: false,
      message: "Error occurred",
    });
  }
};

/**
 * Fetch all products
 */
const fetchAllProducts = async (req, res) => {
  logger.info("PRODUCT_FETCH_ALL_REQUESTED", {
    traceId: req.id,
  });

  try {
    const listOfProducts = await Product.find({});

    logger.info("PRODUCT_FETCH_ALL_SUCCESS", {
      traceId: req.id,
      count: listOfProducts.length,
    });

    res.status(200).json({
      success: true,
      data: listOfProducts,
    });
  } catch (e) {
    logger.error("PRODUCT_FETCH_ALL_FAILED", {
      traceId: req.id,
      error: e.message,
      stack: e.stack,
    });

    res.status(500).json({
      success: false,
      message: "Error occurred",
    });
  }
};

/**
 * Edit product
 */
const editProduct = async (req, res) => {
  const { id } = req.params;

  logger.info("PRODUCT_UPDATE_REQUESTED", {
    traceId: req.id,
    productId: id,
  });

  try {
    const findProduct = await Product.findById(id);

    if (!findProduct) {
      logger.warn("PRODUCT_UPDATE_NOT_FOUND", {
        traceId: req.id,
        productId: id,
      });

      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    Object.assign(findProduct, req.body);
    await findProduct.save();

    logger.info("PRODUCT_UPDATE_SUCCESS", {
      traceId: req.id,
      productId: id,
    });

    res.status(200).json({
      success: true,
      data: findProduct,
    });
  } catch (e) {
    logger.error("PRODUCT_UPDATE_FAILED", {
      traceId: req.id,
      productId: id,
      error: e.message,
      stack: e.stack,
    });

    res.status(500).json({
      success: false,
      message: "Error occurred",
    });
  }
};

/**
 * Delete product
 */
const deleteProduct = async (req, res) => {
  const { id } = req.params;

  logger.info("PRODUCT_DELETE_REQUESTED", {
    traceId: req.id,
    productId: id,
  });

  try {
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      logger.warn("PRODUCT_DELETE_NOT_FOUND", {
        traceId: req.id,
        productId: id,
      });

      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    logger.info("PRODUCT_DELETE_SUCCESS", {
      traceId: req.id,
      productId: id,
    });

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (e) {
    logger.error("PRODUCT_DELETE_FAILED", {
      traceId: req.id,
      productId: id,
      error: e.message,
      stack: e.stack,
    });

    res.status(500).json({
      success: false,
      message: "Error occurred",
    });
  }
};

module.exports = {
  handleImageUpload,
  addProduct,
  fetchAllProducts,
  editProduct,
  deleteProduct,
};
