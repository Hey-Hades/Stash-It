import express from "express";
import dotenv from "dotenv";
import fileRoutes from "./routes/file.route.js";
import errorHandler from "./middlewares/errorHandler.js";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigin =
  process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check route
app.get("/", (req, res) => {
  res.status(200).json({
    status: "Backend is running",
  });
});

app.use(express.json());

app.use("/api/file", fileRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`CORS enabled for origin: ${allowedOrigin}`);
});