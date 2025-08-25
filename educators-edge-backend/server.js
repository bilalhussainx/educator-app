// FILE: server.js (Definitive, Production-Ready Version)

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const initializeWebSocket = require('./services/websocketHandler');
const aiRoutes = require('./routes/aiRoutes');
const userRoutes = require('./routes/userRoutes');
const conceptRoutes = require('./routes/conceptRoutes');
const executeRoutes = require('./routes/executeRoutes');
const terminalRoutes = require('./routes/terminalRoutes');
const deploymentRoutes = require('./routes/deploymentRoutes');
const courseRoutes = require('./routes/courseRoutes');
const studentRoutes = require('./routes/studentRoutes');
const stuckPointRoutes = require('./routes/stuckPointRoutes');
const sessionRoutes = require('./routes/sessionRoutes');

const app = express();

// --- Definitive CORS Configuration ---

// 1. SINGLE SOURCE OF TRUTH for all allowed frontend URLs.
//    This list will be used for both HTTP requests and WebSocket connections.
const allowedOrigins = [
    'http://localhost:3000',                                            // Local Vite dev server
    'http://localhost:5173',                                            // Alternative local Vite port
    'https://educator-app.vercel.app',                                  // Your main production URL
    'https://educator-a9yc0y90h-bilalhussainxs-projects.vercel.app',    // A specific preview URL
    'https://educator-2ovjl9xd8-bilalhussainxs-projects.vercel.app'     // Another specific preview URL
];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests from the list OR requests with no origin (like Postman/server-to-server)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('This origin is not allowed by the CORS policy.'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Explicitly allow all methods
    allowedHeaders: ['Content-Type', 'Authorization'],             // Explicitly allow required headers
    credentials: true,
};

// 2. Apply middleware in the correct order.
app.use(express.json());

// 3. Set up a global handler for preflight OPTIONS requests. This is a very robust fix.
app.options('*', cors(corsOptions));

// 4. Use the configured CORS options for all other requests.
app.use(cors(corsOptions));


// --- Health Check Endpoint for Render ---
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});


// --- Register All API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/execute', executeRoutes);
app.use('/api/terminal', terminalRoutes);
app.use('/api/deploy', deploymentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/stuck-points', stuckPointRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/concepts', conceptRoutes);


// --- Server and WebSocket Initialization ---

const server = http.createServer(app);

const wss = new WebSocketServer({
    server,
    handleProtocols: (protocols, request) => {
        const origin = request.headers.origin;
        // The WebSocket server now uses the SAME `allowedOrigins` list for consistency.
        if (allowedOrigins.includes(origin)) {
            return protocols.values().next().value;
        }
        console.warn(`[WebSocket] Connection from untrusted origin [${origin}] rejected.`);
        return false;
    }
});

initializeWebSocket(wss);

const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server is ready.`);
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