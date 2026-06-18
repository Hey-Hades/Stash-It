import express from "express";
import dotenv from "dotenv";
import fileRoutes from "./routes/file.route.js";
import errorHandler from "./middlewares/errorHandler.js";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Wrap express in HTTP server
const server = http.createServer(app);

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  try {
    const { hostname } = new URL(origin);
    return hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
};

// Setup Socket.io with the same CORS logic
const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
  },
});

app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
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

// --- P2P SIGNALING SERVER LOGIC ---
io.on("connection", (socket) => {
  socket.on("join-room", (stashKey) => {
    // 1. Check how many people are currently in the room
    const room = io.sockets.adapter.rooms.get(stashKey);
    const numClients = room ? room.size : 0;

    // 2. Enforce the 1-to-1 limit (Max 2 clients per room)
    if (numClients >= 2) {
      socket.emit("room-full");
      console.log(`Socket ${socket.id} rejected. Room ${stashKey} is full.`);
      return; 
    }

    // 3. Allow them in if the room is open
    socket.join(stashKey);
    socket.to(stashKey).emit("peer-joined");
  });

  socket.on("signal", (data) => {
    socket.to(data.stashKey).emit("signal", data.signal);
  });
});
// ----------------------------------

app.use(errorHandler);

// Listen on the HTTP server, not the express app directly
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`CORS enabled for origins: ${allowedOrigins.join(", ")}`);
  console.log(`P2P Socket server active.`);
});