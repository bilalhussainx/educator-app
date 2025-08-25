// FILE: server.js
// require('dotenv').config();

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const initializeWebSocket = require('./services/websocketHandler');
const aiRoutes = require('./routes/aiRoutes');
const userRoutes = require('./routes/userRoutes'); // Make sure path is correct
const conceptRoutes = require('./routes/conceptRoutes');

// const submissionRoutes = require('./routes/submissionRoutes');

const executeRoutes = require('./routes/executeRoutes');
const terminalRoutes = require('./routes/terminalRoutes');
const deploymentRoutes = require('./routes/deploymentRoutes');
const courseRoutes = require('./routes/courseRoutes');
const studentRoutes = require('./routes/studentRoutes');
const stuckPointRoutes = require('./routes/stuckPointRoutes');


const app = express();
const allowedOrigins = [
    'http://localhost:3000', // For local development
    'https://educator-app.vercel.app' // YOUR VERCEL URL FROM THE ERROR LOG
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true, // This is important for handling cookies or authorization headers
};

app.use(cors(corsOptions));

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Educator App Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/execute', executeRoutes);
app.use('/api/terminal', terminalRoutes);
app.use('/api/deploy', deploymentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/stuck-points', stuckPointRoutes);
app.use('/api/sessions', require('./routes/sessionRoutes'));
app.use('/api/users', userRoutes); 
app.use('/api/concepts', conceptRoutes);

// app.use('/api/submissions', submissionRoutes);



const server = http.createServer(app);
const wss = new WebSocketServer({ server });
initializeWebSocket(wss);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces
server.listen(PORT, HOST, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server is ready.`);
  console.log(`To access from other devices, use: http://<your-ip-address>:${PORT}`);
});
// require('dotenv').config();

// const express = require('express');
// const http = require('http');
// const { WebSocketServer } = require('ws');
// const cors = require('cors');
// const authRoutes = require('./routes/authRoutes');
// const lessonRoutes = require('./routes/lessonRoutes');
// const initializeWebSocket = require('./services/websocketHandler');
// const aiRoutes = require('./routes/aiRoutes');
// const submissionRoutes = require('./routes/submissionRoutes');

// const executeRoutes = require('./routes/executeRoutes');
// const terminalRoutes = require('./routes/terminalRoutes');
// const deploymentRoutes = require('./routes/deploymentRoutes');
// const courseRoutes = require('./routes/courseRoutes');
// const studentRoutes = require('./routes/studentRoutes');
// // --- ADD THIS LINE ---
// const stuckPointRoutes = require('./routes/stuckPointRoutes');


// const app = express();
// app.use(cors());
// app.use(express.json());

// // Register API routes
// app.use('/api/auth', authRoutes);
// app.use('/api/lessons', lessonRoutes);
// app.use('/api/ai', aiRoutes);
// app.use('/api/execute', executeRoutes);
// app.use('/api/terminal', terminalRoutes);
// app.use('/api/deploy', deploymentRoutes);
// app.use('/api/courses', courseRoutes);
// app.use('/api/students', studentRoutes);
// // --- AND ADD THIS LINE ---
// app.use('/api/stuck-points', stuckPointRoutes);
// app.use('/api/submissions', submissionRoutes);



// const server = http.createServer(app);
// const wss = new WebSocketServer({ server });
// initializeWebSocket(wss);

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
//   console.log(`WebSocket server is ready.`);
// });
// require('dotenv').config();

// const express = require('express');
// const http = require('http');
// const { WebSocketServer } = require('ws');
// const cors = require('cors');
// const authRoutes = require('./routes/authRoutes');
// const lessonRoutes = require('./routes/lessonRoutes');
// const initializeWebSocket = require('./services/websocketHandler');
// const aiRoutes = require('./routes/aiRoutes');
// const executeRoutes = require('./routes/executeRoutes');
// const terminalRoutes = require('./routes/terminalRoutes');
// // NEW: Import the new deployment routes
// const deploymentRoutes = require('./routes/deploymentRoutes');
// const courseRoutes = require('./routes/courseRoutes');
// const studentRoutes = require('./routes/studentRoutes');



// const app = express();
// app.use(cors());
// app.use(express.json());

// // Register API routes
// app.use('/api/auth', authRoutes);
// app.use('/api/lessons', lessonRoutes);
// app.use('/api/ai', aiRoutes);
// app.use('/api/execute', executeRoutes);
// app.use('/api/terminal', terminalRoutes);
// // NEW: Register the deployment routes
// app.use('/api/deploy', deploymentRoutes);
// app.use('/api/courses', courseRoutes);
// app.use('/api/students', studentRoutes);



// const server = http.createServer(app);
// const wss = new WebSocketServer({ server });
// initializeWebSocket(wss);

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
//   console.log(`WebSocket server is ready.`);
// });



// require('dotenv').config();

// const express = require('express');
// const http = require('http');
// const { WebSocketServer } = require('ws');
// const cors = require('cors');
// const authRoutes = require('./routes/authRoutes');
// const lessonRoutes = require('./routes/lessonRoutes');
// const initializeWebSocket = require('./services/websocketHandler');
// const aiRoutes = require('./routes/aiRoutes');
// const executeRoutes = require('./routes/executeRoutes');
// // NEW: Import the new terminal routes
// const terminalRoutes = require('./routes/terminalRoutes');

// const app = express();
// app.use(cors());
// app.use(express.json());

// // Register API routes
// app.use('/api/auth', authRoutes);
// app.use('/api/lessons', lessonRoutes);
// app.use('/api/ai', aiRoutes);
// app.use('/api/execute', executeRoutes);
// // NEW: Register the terminal routes
// app.use('/api/terminal', terminalRoutes);


// const server = http.createServer(app);
// const wss = new WebSocketServer({ server });
// initializeWebSocket(wss);

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
//   console.log(`WebSocket server is ready.`);
// });


// // -----------------------------------------------------------------
// // FILE: server.js (VERIFY THIS FILE)
// // -----------------------------------------------------------------
// require('dotenv').config();

// const express = require('express');
// const http = require('http');
// const { WebSocketServer } = require('ws');
// const cors = require('cors');
// const authRoutes = require('./routes/authRoutes');
// const lessonRoutes = require('./routes/lessonRoutes');
// const initializeWebSocket = require('./services/websocketHandler');
// const aiRoutes = require('./routes/aiRoutes');
// // This line is crucial - ensure it exists in your server.js
// const executeRoutes = require('./routes/executeRoutes');

// const app = express();
// app.use(cors());
// app.use(express.json());

// // Register all API routes
// app.use('/api/auth', authRoutes);
// app.use('/api/lessons', lessonRoutes);
// app.use('/api/ai', aiRoutes);
// // This line is crucial - ensure it exists in your server.js
// app.use('/api/execute', executeRoutes);


// const server = http.createServer(app);
// const wss = new WebSocketServer({ server });
// initializeWebSocket(wss);

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
//   console.log(`WebSocket server is ready.`);
// });


// require('dotenv').config();

// const express = require('express');
// const http = require('http');
// const { WebSocketServer } = require('ws');
// const cors = require('cors');
// const authRoutes = require('./routes/authRoutes');
// const initializeWebSocket = require('./services/websocketHandler');
// const lessonRoutes = require('./routes/lessonRoutes');

// const app = express();
// app.use(cors());
// app.use(express.json());

// app.use('/api/auth', authRoutes);
// app.use('/api/lessons', lessonRoutes);

// const server = http.createServer(app);
// const wss = new WebSocketServer({ server });
// initializeWebSocket(wss);

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
//   console.log(`WebSocket server is ready.`);
// });



// // -----------------------------------------------------------------
// // FILE: server.js (UPDATED)
// // -----------------------------------------------------------------
// require('dotenv').config();

// const express = require('express');
// const http = require('http'); // <-- Node's built-in HTTP module
// const { WebSocketServer } = require('ws'); // <-- Import WebSocketServer
// const cors = require('cors');
// const authRoutes = require('./routes/authRoutes');
// const initializeWebSocket = require('./services/websocketHandler'); // <-- Import our new handler

// const app = express();

// app.use(cors());
// app.use(express.json());

// app.use('/api/auth', authRoutes);

// // --- WebSocket Server Setup ---

// // 1. Create a standard HTTP server from our Express app.
// // WebSockets need to "hijack" an HTTP server to establish their initial connection.
// const server = http.createServer(app);

// // 2. Create a WebSocket server and attach it to the HTTP server.
// const wss = new WebSocketServer({ server });

// // 3. Initialize our WebSocket connection handling logic.
// // We pass the `wss` instance to our handler so it can manage connections.
// initializeWebSocket(wss);


// // --- Server Startup ---
// // We now listen on the `server` object, not the `app` object.
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
//   console.log(`WebSocket server is ready.`);
// });

// /* FILE: server.js
//  * =================================================================
//  * DESCRIPTION: This is the main entry point for our backend application.
//  * It sets up the Express server, applies middleware, and connects our routes.
//  */
// // Load environment variables from .env file
// require('dotenv').config();

// const express = require('express');
// const cors = require('cors');
// const authRoutes = require('./routes/authRoutes');

// // Initialize the Express app
// const app = express();

// // --- Middleware ---
// // CORS (Cross-Origin Resource Sharing): Allows our React frontend (on a different port)
// // to make requests to this backend.
// app.use(cors());

// // Express JSON Parser: This allows our server to understand and process
// // incoming request bodies that are in JSON format (e.g., from a login form).
// app.use(express.json());


// // --- Routes ---
// // We are modularizing our routes. All routes related to authentication
// // will be prefixed with `/api/auth` and handled by the `authRoutes` file.
// app.use('/api/auth', authRoutes);


// // --- Server Startup ---
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });