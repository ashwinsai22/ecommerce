const Address = require("../../models/Address");
const logger = require("../../utils/logger");

/**
 * Add address
 */
const addAddress = async (req, res) => {
  const { userId, city } = req.body;

  logger.info("ADDRESS_ADD_REQUESTED", {
    traceId: req.id,
    userId,
    city,
  });

  try {
    const { address, pincode, phone, notes } = req.body;

    if (!userId || !address || !city || !pincode || !phone || !notes) {
      logger.warn("ADDRESS_ADD_INVALID_DATA", {
        traceId: req.id,
        userId,
      });

      return res.status(400).json({
        success: false,
        message: "Invalid data provided!",
      });
    }

    const newlyCreatedAddress = new Address({
      userId,
      address,
      city,
      pincode,
      notes,
      phone,
    });

    await newlyCreatedAddress.save();

    logger.info("ADDRESS_ADD_SUCCESS", {
      traceId: req.id,
      userId,
      addressId: newlyCreatedAddress._id,
    });

    res.status(201).json({
      success: true,
      data: newlyCreatedAddress,
    });
  } catch (e) {
    logger.error("ADDRESS_ADD_FAILED", {
      traceId: req.id,
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
 * Fetch all addresses for a user
 */
const fetchAllAddress = async (req, res) => {
  const { userId } = req.params;

  logger.info("ADDRESS_FETCH_REQUESTED", {
    traceId: req.id,
    userId,
  });

  try {
    if (!userId) {
      logger.warn("ADDRESS_FETCH_NO_USER_ID", {
        traceId: req.id,
      });

      return res.status(400).json({
        success: false,
        message: "User id is required!",
      });
    }

    const addressList = await Address.find({ userId });

    logger.info("ADDRESS_FETCH_SUCCESS", {
      traceId: req.id,
      userId,
      count: addressList.length,
    });

    res.status(200).json({
      success: true,
      data: addressList,
    });
  } catch (e) {
    logger.error("ADDRESS_FETCH_FAILED", {
      traceId: req.id,
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
 * Edit address
 */
const editAddress = async (req, res) => {
  const { userId, addressId } = req.params;

  logger.info("ADDRESS_UPDATE_REQUESTED", {
    traceId: req.id,
    userId,
    addressId,
  });

  try {
    if (!userId || !addressId) {
      logger.warn("ADDRESS_UPDATE_INVALID_PARAMS", {
        traceId: req.id,
        userId,
        addressId,
      });

      return res.status(400).json({
        success: false,
        message: "User and address id is required!",
      });
    }

    const address = await Address.findOneAndUpdate(
      { _id: addressId, userId },
      req.body,
      { new: true }
    );

    if (!address) {
      logger.warn("ADDRESS_UPDATE_NOT_FOUND", {
        traceId: req.id,
        userId,
        addressId,
      });

      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    logger.info("ADDRESS_UPDATE_SUCCESS", {
      traceId: req.id,
      userId,
      addressId,
    });

    res.status(200).json({
      success: true,
      data: address,
    });
  } catch (e) {
    logger.error("ADDRESS_UPDATE_FAILED", {
      traceId: req.id,
      userId,
      addressId,
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
 * Delete address
 */
const deleteAddress = async (req, res) => {
  const { userId, addressId } = req.params;

  logger.info("ADDRESS_DELETE_REQUESTED", {
    traceId: req.id,
    userId,
    addressId,
  });

  try {
    if (!userId || !addressId) {
      logger.warn("ADDRESS_DELETE_INVALID_PARAMS", {
        traceId: req.id,
        userId,
        addressId,
      });

      return res.status(400).json({
        success: false,
        message: "User and address id is required!",
      });
    }

    const address = await Address.findOneAndDelete({
      _id: addressId,
      userId,
    });

    if (!address) {
      logger.warn("ADDRESS_DELETE_NOT_FOUND", {
        traceId: req.id,
        userId,
        addressId,
      });

      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    logger.info("ADDRESS_DELETE_SUCCESS", {
      traceId: req.id,
      userId,
      addressId,
    });

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (e) {
    logger.error("ADDRESS_DELETE_FAILED", {
      traceId: req.id,
      userId,
      addressId,
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
  addAddress,
  editAddress,
  fetchAllAddress,
  deleteAddress,
};
