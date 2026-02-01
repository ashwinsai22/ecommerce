const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const logger = require("../../utils/logger");

/**
 * Add product to cart
 */
const addToCart = async (req, res) => {
  const { userId, productId, quantity } = req.body;

  logger.info("CART_ADD_ITEM_REQUESTED", {
    traceId: req.id,
    userId,
    productId,
    quantity,
  });

  try {
    if (!userId || !productId || quantity <= 0) {
      logger.warn("CART_ADD_ITEM_INVALID_DATA", {
        traceId: req.id,
        userId,
        productId,
        quantity,
      });

      return res.status(400).json({
        success: false,
        message: "Invalid data provided!",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      logger.warn("CART_ADD_ITEM_PRODUCT_NOT_FOUND", {
        traceId: req.id,
        productId,
      });

      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      logger.info("CART_CREATED_FOR_USER", {
        traceId: req.id,
        userId,
      });

      cart = new Cart({ userId, items: [] });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      cart.items.push({ productId, quantity });

      logger.info("CART_ITEM_ADDED", {
        traceId: req.id,
        userId,
        productId,
        quantity,
      });
    } else {
      cart.items[itemIndex].quantity += quantity;

      logger.info("CART_ITEM_QUANTITY_INCREMENTED", {
        traceId: req.id,
        userId,
        productId,
        quantity: cart.items[itemIndex].quantity,
      });
    }

    await cart.save();

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    logger.error("CART_ADD_ITEM_FAILED", {
      traceId: req.id,
      userId,
      productId,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Error",
    });
  }
};

/**
 * Fetch cart items
 */
const fetchCartItems = async (req, res) => {
  const { userId } = req.params;

  logger.info("CART_FETCH_REQUESTED", {
    traceId: req.id,
    userId,
  });

  try {
    if (!userId) {
      logger.warn("CART_FETCH_NO_USER_ID", {
        traceId: req.id,
      });

      return res.status(400).json({
        success: false,
        message: "User id is mandatory!",
      });
    }

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      select: "image title price salePrice",
    });

    if (!cart) {
      logger.warn("CART_NOT_FOUND", {
        traceId: req.id,
        userId,
      });

      return res.status(404).json({
        success: false,
        message: "Cart not found!",
      });
    }

    const validItems = cart.items.filter(
      (item) => item.productId
    );

    if (validItems.length < cart.items.length) {
      logger.warn("CART_INVALID_ITEMS_CLEANED", {
        traceId: req.id,
        userId,
        removed: cart.items.length - validItems.length,
      });

      cart.items = validItems;
      await cart.save();
    }

    const populateCartItems = validItems.map((item) => ({
      productId: item.productId._id,
      image: item.productId.image,
      title: item.productId.title,
      price: item.productId.price,
      salePrice: item.productId.salePrice,
      quantity: item.quantity,
    }));

    logger.info("CART_FETCH_SUCCESS", {
      traceId: req.id,
      userId,
      itemCount: populateCartItems.length,
    });

    res.status(200).json({
      success: true,
      data: {
        ...cart._doc,
        items: populateCartItems,
      },
    });
  } catch (error) {
    logger.error("CART_FETCH_FAILED", {
      traceId: req.id,
      userId,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Error",
    });
  }
};

/**
 * Update cart item quantity
 */
const updateCartItemQty = async (req, res) => {
  const { userId, productId, quantity } = req.body;

  logger.info("CART_UPDATE_ITEM_REQUESTED", {
    traceId: req.id,
    userId,
    productId,
    quantity,
  });

  try {
    if (!userId || !productId || quantity <= 0) {
      logger.warn("CART_UPDATE_ITEM_INVALID_DATA", {
        traceId: req.id,
        userId,
        productId,
        quantity,
      });

      return res.status(400).json({
        success: false,
        message: "Invalid data provided!",
      });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      logger.warn("CART_UPDATE_CART_NOT_FOUND", {
        traceId: req.id,
        userId,
      });

      return res.status(404).json({
        success: false,
        message: "Cart not found!",
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      logger.warn("CART_UPDATE_ITEM_NOT_FOUND", {
        traceId: req.id,
        userId,
        productId,
      });

      return res.status(404).json({
        success: false,
        message: "Cart item not present!",
      });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    await cart.populate({
      path: "items.productId",
      select: "image title price salePrice",
    });

    const populateCartItems = cart.items.map((item) => ({
      productId: item.productId ? item.productId._id : null,
      image: item.productId ? item.productId.image : null,
      title: item.productId ? item.productId.title : "Product not found",
      price: item.productId ? item.productId.price : null,
      salePrice: item.productId ? item.productId.salePrice : null,
      quantity: item.quantity,
    }));

    logger.info("CART_UPDATE_ITEM_SUCCESS", {
      traceId: req.id,
      userId,
      productId,
      quantity,
    });

    res.status(200).json({
      success: true,
      data: {
        ...cart._doc,
        items: populateCartItems,
      },
    });
  } catch (error) {
    logger.error("CART_UPDATE_ITEM_FAILED", {
      traceId: req.id,
      userId,
      productId,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Error",
    });
  }
};

/**
 * Delete cart item
 */
const deleteCartItem = async (req, res) => {
  const { userId, productId } = req.params;

  logger.info("CART_DELETE_ITEM_REQUESTED", {
    traceId: req.id,
    userId,
    productId,
  });

  try {
    if (!userId || !productId) {
      logger.warn("CART_DELETE_ITEM_INVALID_PARAMS", {
        traceId: req.id,
        userId,
        productId,
      });

      return res.status(400).json({
        success: false,
        message: "Invalid data provided!",
      });
    }

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      select: "image title price salePrice",
    });

    if (!cart) {
      logger.warn("CART_DELETE_CART_NOT_FOUND", {
        traceId: req.id,
        userId,
      });

      return res.status(404).json({
        success: false,
        message: "Cart not found!",
      });
    }

    const originalCount = cart.items.length;

    cart.items = cart.items.filter(
      (item) => item.productId._id.toString() !== productId
    );

    if (cart.items.length === originalCount) {
      logger.warn("CART_DELETE_ITEM_NOT_FOUND", {
        traceId: req.id,
        userId,
        productId,
      });
    }

    await cart.save();

    await cart.populate({
      path: "items.productId",
      select: "image title price salePrice",
    });

    const populateCartItems = cart.items.map((item) => ({
      productId: item.productId ? item.productId._id : null,
      image: item.productId ? item.productId.image : null,
      title: item.productId ? item.productId.title : "Product not found",
      price: item.productId ? item.productId.price : null,
      salePrice: item.productId ? item.productId.salePrice : null,
      quantity: item.quantity,
    }));

    logger.info("CART_DELETE_ITEM_SUCCESS", {
      traceId: req.id,
      userId,
      productId,
      remainingItems: populateCartItems.length,
    });

    res.status(200).json({
      success: true,
      data: {
        ...cart._doc,
        items: populateCartItems,
      },
    });
  } catch (error) {
    logger.error("CART_DELETE_ITEM_FAILED", {
      traceId: req.id,
      userId,
      productId,
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
  addToCart,
  updateCartItemQty,
  deleteCartItem,
  fetchCartItems,
};
