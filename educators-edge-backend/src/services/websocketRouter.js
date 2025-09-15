// educators-edge-backend/src/services/websocketRouter.js
const { WebSocketServer } = require('ws');
const url = require('url');
const initializeLiveTutorialHandler = require('../handlers/liveTutorialHandler'); // The old websocketHandler, renamed
const initializeSimulationHandler = require('../handlers/simulationHandler');   // The new handler we will create
const terminalHandler = require('../../services/websocketTerminalHandler'); // Terminal handler (singleton)

function initializeWebSocketRouting(httpServer) {
    // Create separate WebSocket servers for different paths
    const simulationWss = new WebSocketServer({ noServer: true });
    const collaborationWss = new WebSocketServer({ noServer: true });
    const terminalWss = new WebSocketServer({ noServer: true });

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
}

module.exports = initializeWebSocketRouting;