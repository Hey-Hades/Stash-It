import express from "express";
import dotenv from "dotenv";
import fileRoutes from "./routes/file.route.js";
import errorHandler from "./middlewares/errorHandler.js";
import cors from "cors";

// 1. Initialize environment variables immediately
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 2. Robust CORS configuration
// We add a fallback to 'http://localhost:5173' so you aren't blocked during dev
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(cors({
  origin: allowedOrigin,
  credentials: true, // Required if you ever use cookies or auth headers
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// 3. Middlewares
app.use(express.json());

// 4. Routes
app.use("/api/file", fileRoutes);

// 5. Error Handler (Must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`CORS enabled for origin: ${allowedOrigin}`);
});