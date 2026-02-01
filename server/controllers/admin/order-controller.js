const Order = require("../../models/Order");
const logger = require("../../utils/logger");

/**
 * Admin: Get all orders of all users
 */
const getAllOrdersOfAllUsers = async (req, res) => {
  logger.info("ADMIN_GET_ALL_ORDERS_REQUESTED", {
    traceId: req.id,
  });

  try {
    const orders = await Order.find({});

    if (!orders.length) {
      logger.warn("ADMIN_GET_ALL_ORDERS_EMPTY", {
        traceId: req.id,
      });

      return res.status(404).json({
        success: false,
        message: "No orders found!",
      });
    }

    logger.info("ADMIN_GET_ALL_ORDERS_SUCCESS", {
      traceId: req.id,
      count: orders.length,
    });

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (e) {
    logger.error("ADMIN_GET_ALL_ORDERS_FAILED", {
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
 * Admin: Get order details by ID
 */
const getOrderDetailsForAdmin = async (req, res) => {
  const { id } = req.params;

  logger.info("ADMIN_GET_ORDER_DETAILS_REQUESTED", {
    traceId: req.id,
    orderId: id,
  });

  try {
    const order = await Order.findById(id);

    if (!order) {
      logger.warn("ADMIN_GET_ORDER_DETAILS_NOT_FOUND", {
        traceId: req.id,
        orderId: id,
      });

      return res.status(404).json({
        success: false,
        message: "Order not found!",
      });
    }

    logger.info("ADMIN_GET_ORDER_DETAILS_SUCCESS", {
      traceId: req.id,
      orderId: id,
    });

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (e) {
    logger.error("ADMIN_GET_ORDER_DETAILS_FAILED", {
      traceId: req.id,
      orderId: id,
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
 * Admin: Update order status
 */
const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { orderStatus } = req.body;

  logger.info("ADMIN_UPDATE_ORDER_STATUS_REQUESTED", {
    traceId: req.id,
    orderId: id,
    newStatus: orderStatus,
  });

  try {
    const order = await Order.findById(id);

    if (!order) {
      logger.warn("ADMIN_UPDATE_ORDER_STATUS_NOT_FOUND", {
        traceId: req.id,
        orderId: id,
      });

      return res.status(404).json({
        success: false,
        message: "Order not found!",
      });
    }

    await Order.findByIdAndUpdate(id, { orderStatus });

    logger.info("ADMIN_UPDATE_ORDER_STATUS_SUCCESS", {
      traceId: req.id,
      orderId: id,
      newStatus: orderStatus,
    });

    res.status(200).json({
      success: true,
      message: "Order status is updated successfully!",
    });
  } catch (e) {
    logger.error("ADMIN_UPDATE_ORDER_STATUS_FAILED", {
      traceId: req.id,
      orderId: id,
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
  getAllOrdersOfAllUsers,
  getOrderDetailsForAdmin,
  updateOrderStatus,
};
