import express from "express";
import {
  downloadFileUrlController,
  retryUploadUrl,
  uploadController,
  checkHealth,
} from "../controllers/file.controller.js";
import protect from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/upload", uploadController);
router.get("/download", protect, downloadFileUrlController);
router.post("/retry", retryUploadUrl);
router.get("/health", checkHealth);
export default router;
