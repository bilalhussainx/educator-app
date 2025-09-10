// educators-edge-backend/src/handlers/simulationHandler.js
const jwt = require('jsonwebtoken');
const url = require('url');
// We import the SINGLE INSTANCE of the service, not the class
const simulationService = require('../../services/trade_simulationService');

function initializeSimulationHandler(wss) {
    wss.on('connection', (ws, req) => {
        console.log('[SIM WSS] New client attempting to connect...');
        try {
            // This auth logic is sound.
            const token = new URLSearchParams(url.parse(req.url).search).get('token');
            if (!token) throw new Error("No token provided.");
            jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            console.error('[SIM WSS] Auth failed, closing connection:', err.message);
            return ws.close(4001, "Invalid auth token.");
        }

        console.log('[SIM WSS] Client authenticated. Adding to subscribers.');
        simulationService.addSubscriber(ws);

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                // This is where the frontend sends control messages
                switch (data.type) {
                    case 'PLAY_SIMULATION': simulationService.play(); break;
                    case 'PAUSE_SIMULATION': simulationService.pause(); break;
                    case 'JUMP_TO_DATE': simulationService.jumpToDate(new Date(data.payload.date)); break;
                    case 'SET_SPEED': simulationService.setSpeed(data.payload.speed); break;
                }
            } catch (e) { console.error('[SIM WSS] Error parsing message', e); }
        });

        ws.on('close', () => {
            console.log('[SIM WSS] Client disconnected.');
            simulationService.removeSubscriber(ws);
        });

        ws.on('error', (err) => {
            console.error('[SIM WSS] WebSocket error:', err);
        });
    });
    return wss;
}

module.exports = initializeSimulationHandler;