const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const logger = require("../utils/logger");

/* =========================
   Validate Cloudinary Config
   ========================= */
const requiredEnvVars = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    logger.error("CLOUDINARY_ENV_MISSING", {
      env: key,
    });
  }
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* =========================
   Multer Memory Storage
   ========================= */
const storage = new multer.memoryStorage();
const upload = multer({ storage });

/* =========================
   Image Upload Utility
   ========================= */
async function imageUploadUtil(file, traceId = null) {
  logger.info("CLOUDINARY_UPLOAD_STARTED", {
    traceId,
    resourceType: "auto",
  });

  try {
    const result = await cloudinary.uploader.upload(file, {
      resource_type: "auto",
    });

    logger.info("CLOUDINARY_UPLOAD_SUCCESS", {
      traceId,
      publicId: result.public_id,
      format: result.format,
    });

    return result;
  } catch (error) {
    logger.error("CLOUDINARY_UPLOAD_FAILED", {
      traceId,
      error: error.message,
      stack: error.stack,
    });

    throw error; // IMPORTANT: let controller handle response
  }
}

module.exports = {
  upload,
  imageUploadUtil,
};
