const paypal = require("../../helpers/paypal");
const Order = require("../../models/Order");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const logger = require("../../utils/logger");

/**
 * Create order & initiate PayPal payment
 */
const createOrder = async (req, res) => {
  const { userId, cartId, totalAmount } = req.body;

  logger.info("ORDER_CREATE_REQUESTED", {
    traceId: req.id,
    userId,
    cartId,
    totalAmount,
  });

  try {
    const {
      cartItems,
      addressInfo,
      orderStatus,
      paymentMethod,
      paymentStatus,
      orderDate,
      orderUpdateDate,
    } = req.body;

    const create_payment_json = {
      intent: "sale",
      payer: { payment_method: "paypal" },
      redirect_urls: {
        return_url: `${process.env.CLIENT_BASE_URL}/shop/paypal-return`,
        cancel_url: `${process.env.CLIENT_BASE_URL}/shop/paypal-cancel`,
      },
      transactions: [
        {
          item_list: {
            items: cartItems.map((item) => ({
              name: item.title,
              sku: item.productId,
              price: item.price.toFixed(2),
              currency: "USD",
              quantity: item.quantity,
            })),
          },
          amount: {
            currency: "USD",
            total: totalAmount.toFixed(2),
          },
          description: "Order payment",
        },
      ],
    };

    paypal.payment.create(create_payment_json, async (error, paymentInfo) => {
      if (error) {
        logger.error("PAYPAL_PAYMENT_CREATE_FAILED", {
          traceId: req.id,
          userId,
          cartId,
          error: error.message,
        });

        return res.status(500).json({
          success: false,
          message: "Error while creating PayPal payment",
        });
      }

      const newlyCreatedOrder = new Order({
        userId,
        cartId,
        cartItems,
        addressInfo,
        orderStatus,
        paymentMethod,
        paymentStatus,
        totalAmount,
        orderDate,
        orderUpdateDate,
      });

      await newlyCreatedOrder.save();

      const approvalURL = paymentInfo.links.find(
        (link) => link.rel === "approval_url"
      )?.href;

      logger.info("ORDER_CREATED_AWAITING_PAYMENT", {
        traceId: req.id,
        orderId: newlyCreatedOrder._id,
        userId,
        totalAmount,
      });

      res.status(201).json({
        success: true,
        approvalURL,
        orderId: newlyCreatedOrder._id,
      });
    });
  } catch (e) {
    logger.error("ORDER_CREATE_FAILED", {
      traceId: req.id,
      userId,
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
 * Capture PayPal payment & confirm order
 */
const capturePayment = async (req, res) => {
  const { orderId } = req.body;

  logger.info("ORDER_PAYMENT_CAPTURE_REQUESTED", {
    traceId: req.id,
    orderId,
  });

  try {
    const { paymentId, payerId } = req.body;

    let order = await Order.findById(orderId);

    if (!order) {
      logger.warn("ORDER_PAYMENT_CAPTURE_ORDER_NOT_FOUND", {
        traceId: req.id,
        orderId,
      });

      return res.status(404).json({
        success: false,
        message: "Order cannot be found",
      });
    }

    order.paymentStatus = "paid";
    order.orderStatus = "confirmed";
    order.paymentId = paymentId;
    order.payerId = payerId;

    for (let item of order.cartItems) {
      let product = await Product.findById(item.productId);

      if (!product) {
        logger.error("ORDER_STOCK_PRODUCT_NOT_FOUND", {
          traceId: req.id,
          orderId,
          productId: item.productId,
        });

        return res.status(404).json({
          success: false,
          message: "Product not found during stock update",
        });
      }

      if (product.totalStock < item.quantity) {
        logger.warn("ORDER_INSUFFICIENT_STOCK", {
          traceId: req.id,
          orderId,
          productId: item.productId,
          available: product.totalStock,
          required: item.quantity,
        });

        return res.status(400).json({
          success: false,
          message: `Not enough stock for product ${product.title}`,
        });
      }

      product.totalStock -= item.quantity;
      await product.save();
    }

    await Cart.findByIdAndDelete(order.cartId);
    await order.save();

    logger.info("ORDER_CONFIRMED_AND_CART_CLEARED", {
      traceId: req.id,
      orderId,
      userId: order.userId,
    });

    res.status(200).json({
      success: true,
      message: "Order confirmed",
      data: order,
    });
  } catch (e) {
    logger.error("ORDER_PAYMENT_CAPTURE_FAILED", {
      traceId: req.id,
      orderId,
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
 * Get all orders by user
 */
const getAllOrdersByUser = async (req, res) => {
  const { userId } = req.params;

  logger.info("USER_ORDERS_FETCH_REQUESTED", {
    traceId: req.id,
    userId,
  });

  try {
    const orders = await Order.find({ userId });

    if (!orders.length) {
      logger.warn("USER_ORDERS_EMPTY", {
        traceId: req.id,
        userId,
      });

      return res.status(404).json({
        success: false,
        message: "No orders found!",
      });
    }

    logger.info("USER_ORDERS_FETCH_SUCCESS", {
      traceId: req.id,
      userId,
      count: orders.length,
    });

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (e) {
    logger.error("USER_ORDERS_FETCH_FAILED", {
      traceId: req.id,
      userId,
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
 * Get order details
 */
const getOrderDetails = async (req, res) => {
  const { id } = req.params;

  logger.info("ORDER_DETAILS_FETCH_REQUESTED", {
    traceId: req.id,
    orderId: id,
  });

  try {
    const order = await Order.findById(id);

    if (!order) {
      logger.warn("ORDER_DETAILS_NOT_FOUND", {
        traceId: req.id,
        orderId: id,
      });

      return res.status(404).json({
        success: false,
        message: "Order not found!",
      });
    }

    logger.info("ORDER_DETAILS_FETCH_SUCCESS", {
      traceId: req.id,
      orderId: id,
    });

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (e) {
    logger.error("ORDER_DETAILS_FETCH_FAILED", {
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
  createOrder,
  capturePayment,
  getAllOrdersByUser,
  getOrderDetails,
};
