require('dotenv').config();
const express = require("express");
const http = require("http");
const cors = require('cors');
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const { spawn } = require("child_process");

// Route imports
const authRoutes = require('./src/routes/auth');
const protectedRoutes = require("./auth/protected.routes");

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Security middleware
app.use(express.json());

// === CORS Configuration ===
const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
};

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.options('*', cors(corsOptions));

// === Database Connection ===
mongoose.connect(process.env.MONGO_URI_USERS || "mongodb://localhost:27017/codeauth", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB connected successfully");
});
mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
});

// === Routes ===
app.use("/api/auth", authRoutes);
app.use("/api", protectedRoutes);

// === Enhanced AI Chatbot Endpoint ===
app.post("/api/chatbot", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const ollama = spawn("ollama", ["run", "phi"]);
    const prompt = `You are a helpful assistant. Give a short and working code snippet in JavaScript for: ${message}`;

    let response = "";
    let responded = false;

    const safeSend = (data, status = 200) => {
      if (!responded) {
        responded = true;
        res.status(status).json({ reply: data });
      }
    };

    const timeout = setTimeout(() => {
      ollama.kill();
      safeSend(response.trim() || "AI response timed out", 504);
    }, 10000);

    ollama.stdin.write(prompt + "\n");
    ollama.stdin.end();

    ollama.stdout.on("data", (data) => {
      response += data.toString();
    });

    ollama.stderr.on("data", (data) => {
      console.error(`❌ Ollama error: ${data}`);
      if (!responded) {
        clearTimeout(timeout);
        safeSend("Error processing your request", 500);
      }
    });

    ollama.on("close", (code) => {
      clearTimeout(timeout);
      if (!responded) {
        if (code !== 0) {
          safeSend("AI process failed", 500);
        } else {
          safeSend(response.trim());
        }
      }
    });

  } catch (err) {
    console.error("AI processing error:", err);
    if (!res.headersSent) {
      res.status(500).json({ reply: "Internal server error" });
    }
  }
});

// === WebSocket Server with Enhanced Error Handling ===
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  }
});

const rooms = new Map();

// === Check if a room exists ===
app.get('/api/check-room/:roomId', (req, res) => {
  const { roomId } = req.params;
  const roomExists = rooms.has(roomId);
  
  res.json({ 
    exists: roomExists,
    roomname: roomExists ? rooms.get(roomId).name : null
  });
});

// === Create a new room ===
app.post('/api/create-room', (req, res) => {
  const { roomId, roomname, creator } = req.body;
  
  if (!roomId || !creator) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  rooms.set(roomId, {
    id: roomId,
    name: roomname || `Room ${roomId}`,
    creator,
    createdAt: Date.now(),
    participants: [],
    settings: {
      requireApproval: false
    }
  });
  
  res.json({ success: true, roomId });
});

// === Join Room Request ===
app.post('/api/request-join-room', async (req, res) => {
  const { roomId, name } = req.body;

  try {
    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    const userId = `user_${Date.now()}`;

    if (room.settings && room.settings.requireApproval) {
      const host = room.participants.find(p => p.isHost);
      if (host) {
        io.to(host.socketId).emit('join-request', { userId, name, roomId });
        return res.json({ success: true, requiresApproval: true, message: "Request sent to room host" });
      } else {
        return res.status(404).json({ success: false, message: "Room host not found" });
      }
    } else {
      return res.json({ success: true, requiresApproval: false, message: "You can join the room" });
    }
  } catch (err) {
    console.error("Error in /api/request-join-room:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// === SOCKET.IO EVENTS ===
io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);

  // Track user info
  socket.data = {};

  // === Join Room ===
  socket.on('join-room', ({ roomId, user }) => {
    if (!roomId || !user || !user.name) {
      socket.emit('error', { message: 'Invalid join request' });
      return;
    }

    console.log(`User ${user.name} joining room ${roomId}`);

    socket.data.userId = user.name;
    socket.data.roomId = roomId;
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        name: `Room ${roomId}`,
        creator: user.name,
        createdAt: Date.now(),
        participants: [],
        settings: { requireApproval: false }
      });
    }

    const room = rooms.get(roomId);
    const participant = { ...user, socketId: socket.id, joinedAt: Date.now() };

    // Remove duplicate participant
    room.participants = room.participants.filter(p => p.name !== user.name);

    room.participants.push(participant);

    // Notify room of updated participants
    io.to(roomId).emit('room-participants', room.participants);

    // Notify others about the new user
    socket.to(roomId).emit('user-joined', { newUserId: user.name });
  });

  // === Simple-Peer Signaling ===
  socket.on('send-signal', ({ userToSignal, from, signal }) => {
    io.to(userToSignal).emit('receive-signal', { from, signal });
  });

  // === Code Collaboration Events ===
  socket.on('code-change', ({ code, roomId }) => {
    if (!roomId || !rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    room.currentCode = code;
    socket.to(roomId).emit('code-change', { code, userId: socket.data.userId });
  });

  socket.on('language-change', ({ language, roomId }) => {
    socket.to(roomId).emit('language-change', { language, userId: socket.data.userId });
  });

  socket.on('cursor-update', (data) => {
    const { roomId } = data;
    if (!roomId || !rooms.has(roomId)) return;
    const cursorData = { ...data, userId: socket.data.userId };
    socket.to(roomId).emit('cursor-update', cursorData);
  });

  // === Leave Room ===
  socket.on('leave-room', ({ roomId }) => {
    handleUserLeaving(socket, roomId);
  });

  // === Disconnect ===
  socket.on('disconnect', () => {
    const { roomId } = socket.data;
    if (roomId) {
      handleUserLeaving(socket, roomId);
    }
    console.log(`❌ Disconnected: ${socket.id}`);
  });

  socket.on('error', (err) => {
    console.error(`⚠️ Socket error (${socket.id}):`, err);
  });
});

// Helper: Remove user from room
function handleUserLeaving(socket, roomId) {
  if (!roomId || !rooms.has(roomId)) return;

  socket.leave(roomId);
  const room = rooms.get(roomId);
  const participant = room.participants.find(p => p.socketId === socket.id);

  room.participants = room.participants.filter(p => p.socketId !== socket.id);

  if (room.participants.length === 0) {
    rooms.delete(roomId);
  } else {
    io.to(roomId).emit('room-participants', room.participants);
    if (participant) {
      io.to(roomId).emit('user-disconnected', { userId: participant.name });
    }
  }
}

// === Health Check ===
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get("/", (req, res) => {
  res.send("🚀 Server is operational");
});

// === Error Handler ===
app.use((err, req, res, next) => {
  console.error("Global error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// === Start Server ===
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(", ")}`);
});

// === Crash Safety ===
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  server.close(() => process.exit(1));
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated");
  });
});
