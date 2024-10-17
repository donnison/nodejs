const express = require("express");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const indexRouter = require("./routes/index");

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS enabled
const io = socketIo(server, {
    cors: {
        origin: "*", // Replace with specific domains in production
        methods: ["GET", "POST"],
        credentials: true // Optional
    }
});

// Middleware
app.use(cors());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Use the router for handling routes
app.use("/", indexRouter);

// Catch-all route for handling 404 errors
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, "views", "404.html"));
});

// Store active users
const activeUsers = {};

io.on("connection", (socket) => {
    console.log("A user connected");

    // Handle mouse move events
    socket.on("mouse-move", (data) => {
        // Update user's activity in activeUsers
        activeUsers[socket.id] = {
            userId: data.userId,
            pageUrl: data.pageUrl,
            lastActive: Date.now(),
            hoveredText: data.hoveredText,
        };

        // Broadcast the mouse move event to all other clients
        socket.broadcast.emit("mouse-move", data);
    });

    // Handle user disconnect
    socket.on("disconnect", () => {
        console.log("A user disconnected");

        // Wait 1 minute before cleaning up the user
        setTimeout(() => {
            const user = activeUsers[socket.id];
            if (user && Date.now() - user.lastActive >= 60000) {
                // Notify other clients to remove the user's cursor
                io.emit("remove-user-mouse", user.userId);
                delete activeUsers[socket.id];
            }
        }, 60000); // 1 minute = 60000 ms
    });
});

// Start server with HTTP and WebSocket
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}/`);
});
