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
    
    // Allow Vercel production frontend
    if (hostname.endsWith(".vercel.app")) return true;

    // Allow private LAN subnets for local testing across devices
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.")
    ) {
      return true;
    }

    return false;
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
  console.log("Connected:", socket.id, socket.handshake.headers.origin);

  socket.on("join-room", (stashKey) => {
    // This will log exactly who is trying to join which room
    console.log("JOIN ROOM:", stashKey, socket.id);

    const room = io.sockets.adapter.rooms.get(stashKey);
    const numClients = room ? room.size : 0;

    if (numClients >= 2) {
      socket.emit("room-full");
      console.log(`Socket ${socket.id} rejected. Room ${stashKey} is full.`);
      return; 
    }

    socket.join(stashKey);
    socket.to(stashKey).emit("peer-joined");
  });

  socket.on("signal", (data) => {
    // This will track the WebRTC handshake (offer, answer, candidate)
    console.log("SIGNAL:", data.signal.type);

    socket.to(data.stashKey).emit("signal", data.signal);
  });
  
  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
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