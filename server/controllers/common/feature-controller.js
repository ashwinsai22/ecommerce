const Feature = require("../../models/Feature");
const logger = require("../../utils/logger");

/**
 * Add feature image
 */
const addFeatureImage = async (req, res) => {
  const { image } = req.body;

  logger.info("FEATURE_IMAGE_ADD_REQUESTED", {
    traceId: req.id,
  });

  try {
    if (!image) {
      logger.warn("FEATURE_IMAGE_ADD_NO_IMAGE", {
        traceId: req.id,
      });

      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    const featureImage = new Feature({ image });
    await featureImage.save();

    logger.info("FEATURE_IMAGE_ADD_SUCCESS", {
      traceId: req.id,
      featureId: featureImage._id,
    });

    res.status(201).json({
      success: true,
      data: featureImage,
    });
  } catch (e) {
    logger.error("FEATURE_IMAGE_ADD_FAILED", {
      traceId: req.id,
      error: e.message,
      stack: e.stack,
    });

    res.status(500).json({
      success: false,
      message: "Some error occurred!",
    });
  }
};

/**
 * Get feature images
 */
const getFeatureImages = async (req, res) => {
  logger.info("FEATURE_IMAGE_FETCH_REQUESTED", {
    traceId: req.id,
  });

  try {
    const images = await Feature.find({});

    logger.info("FEATURE_IMAGE_FETCH_SUCCESS", {
      traceId: req.id,
      count: images.length,
    });

    res.status(200).json({
      success: true,
      data: images,
    });
  } catch (e) {
    logger.error("FEATURE_IMAGE_FETCH_FAILED", {
      traceId: req.id,
      error: e.message,
      stack: e.stack,
    });

    res.status(500).json({
      success: false,
      message: "Some error occurred!",
    });
  }
};

module.exports = {
  addFeatureImage,
  getFeatureImages,
};
