// educators-edge-backend/src/services/websocketRouter.js
const { WebSocketServer } = require('ws');
const { Server } = require('socket.io');
const url = require('url');
const initializeLiveTutorialHandler = require('../handlers/liveTutorialHandler'); // The old websocketHandler, renamed
const initializeSimulationHandler = require('../handlers/simulationHandler');   // The new handler we will create
const terminalHandler = require('../../services/websocketTerminalHandler'); // Terminal handler (singleton)

function initializeWebSocketRouting(httpServer) {
    // Create separate WebSocket servers for different paths
    const simulationWss = new WebSocketServer({ noServer: true });
    const collaborationWss = new WebSocketServer({ noServer: true });
    const terminalWss = new WebSocketServer({ noServer: true });

    // Create Socket.io server for live sessions
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://educator-app.vercel.app',
        'https://educator-a9yc0y90h-bilalhussainxs-projects.vercel.app',
        'https://educator-2ovjl9xd8-bilalhussainxs-projects.vercel.app'
    ];

    const io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                // Allow requests with no origin (mobile apps, curl, etc)
                if (!origin) return callback(null, true);

                if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('.vercel.app')) {
                    callback(null, true);
                } else {
                    console.log('[SOCKET.IO] CORS blocked origin:', origin);
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true
        },
        path: '/socket.io',
        transports: ['websocket', 'polling'] // Allow fallback to polling if WebSocket fails
    });

    // Handle Socket.io connections
    io.on('connection', (socket) => {
        console.log('[SOCKET.IO] Client connected:', socket.id);

        socket.on('disconnect', () => {
            console.log('[SOCKET.IO] Client disconnected:', socket.id);
        });

        // Add any additional Socket.io event handlers here as needed
    });

    // Initialize handlers with their respective WebSocket servers
    initializeSimulationHandler(simulationWss);
    initializeLiveTutorialHandler(collaborationWss);

    // Initialize terminal handler (handle connections directly)
    terminalWss.on('connection', (ws, req) => {
        terminalHandler.handleConnection(ws, req);
    });

    httpServer.on('upgrade', (request, socket, head) => {
        const pathname = url.parse(request.url).pathname;

        console.log(`[WSS ROUTER] Upgrade request for path: ${pathname}`);

        if (pathname === '/ws/simulation' || pathname === '/ws/trade') {
            simulationWss.handleUpgrade(request, socket, head, (ws) => {
                simulationWss.emit('connection', ws, request);
            });
        } else if (pathname === '/ws/collaboration' || pathname === '/ws') {
            collaborationWss.handleUpgrade(request, socket, head, (ws) => {
                collaborationWss.emit('connection', ws, request);
            });
        } else if (pathname === '/terminal') {
            terminalWss.handleUpgrade(request, socket, head, (ws) => {
                terminalWss.emit('connection', ws, request);
            });
        } else {
            console.log(`[WSS ROUTER] No handler for path ${pathname}. Destroying socket.`);
            socket.destroy();
        }
    });

    console.log('✅ Unified WebSocket routing initialized.');

    // Return the Socket.IO instance so it can be used elsewhere
    return io;
}

module.exports = initializeWebSocketRouting;