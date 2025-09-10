/**
 * Trade Simulation WebSocket Handler
 * 
 * This handler manages WebSocket connections for the /ws/trade endpoint.
 * It integrates with the simulation service to provide real-time market data.
 */

const jwt = require('jsonwebtoken');
const tradeSimulationService = require('./trade_simulationService');

class TradeSimulationWebSocketHandler {
  constructor() {
    this.connections = new Map();
    console.log('[TradeSimulationWS] Handler initialized');
  }

  /**
   * Handle new WebSocket connection for trade simulation
   */
  async handleConnection(ws, req) {
    try {
      console.log('[TradeSimulationWS] New connection attempt');

      // Extract token from query parameters
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');

      let user = null;
      if (token) {
        try {
          user = jwt.verify(token, process.env.JWT_SECRET);
          console.log(`[TradeSimulationWS] Authenticated user: ${user.email}`);
        } catch (error) {
          console.log('[TradeSimulationWS] Invalid token, continuing as anonymous');
        }
      }

      // Add this WebSocket to the simulation service
      tradeSimulationService.addSubscriber(ws);
      
      // Generate connection ID
      const connectionId = this.generateConnectionId();
      
      // Store connection info
      this.connections.set(connectionId, {
        ws,
        user,
        connectionId,
        connectedAt: new Date()
      });

      console.log(`[TradeSimulationWS] Connection ${connectionId} established. Total connections: ${this.connections.size}`);

      // Handle incoming messages
      ws.on('message', (message) => {
        this.handleMessage(connectionId, message);
      });

      // Handle connection close
      ws.on('close', () => {
        console.log(`[TradeSimulationWS] Connection ${connectionId} closed`);
        tradeSimulationService.removeSubscriber(ws);
        this.connections.delete(connectionId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`[TradeSimulationWS] Connection ${connectionId} error:`, error);
        tradeSimulationService.removeSubscriber(ws);
        this.connections.delete(connectionId);
      });

    } catch (error) {
      console.error('[TradeSimulationWS] Error handling connection:', error);
      ws.close(1011, 'Internal server error');
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(connectionId, message) {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        console.error(`[TradeSimulationWS] Connection ${connectionId} not found`);
        return;
      }

      const data = JSON.parse(message.toString());
      console.log(`[TradeSimulationWS] Message from ${connectionId}:`, data.type);

      switch (data.type) {
        case 'START_SIMULATION':
        case 'PLAY_SIMULATION':
          tradeSimulationService.play();
          break;

        case 'PAUSE_SIMULATION':
          tradeSimulationService.pause();
          break;

        case 'SET_SIMULATION_SPEED':
        case 'SET_SPEED':
          if (data.data && typeof data.data.speed === 'number') {
            tradeSimulationService.setSpeed(data.data.speed);
          }
          break;

        case 'JUMP_TO_DATE':
          if (data.data && data.data.date) {
            tradeSimulationService.jumpToDate(data.data.date);
          }
          break;

        case 'RESET_SIMULATION':
          tradeSimulationService.reset();
          break;

        case 'GET_SIMULATION_STATUS':
          // Send current simulation state to this connection
          const state = tradeSimulationService.getState();
          connection.ws.send(JSON.stringify({
            type: 'SIMULATION_STATE_UPDATE',
            data: state
          }));
          break;

        case 'ping':
          // Respond to ping with pong
          connection.ws.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          console.log(`[TradeSimulationWS] Unknown message type: ${data.type}`);
      }

    } catch (error) {
      console.error(`[TradeSimulationWS] Error handling message from ${connectionId}:`, error);
    }
  }

  /**
   * Generate a unique connection ID
   */
  generateConnectionId() {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      connections: Array.from(this.connections.values()).map(conn => ({
        connectionId: conn.connectionId,
        user: conn.user ? conn.user.email : 'anonymous',
        connectedAt: conn.connectedAt
      }))
    };
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcastToAll(type, data) {
    const message = JSON.stringify({ type, data });
    let sentCount = 0;
    
    this.connections.forEach((connection, connectionId) => {
      try {
        if (connection.ws.readyState === connection.ws.OPEN) {
          connection.ws.send(message);
          sentCount++;
        } else {
          // Clean up closed connections
          this.connections.delete(connectionId);
        }
      } catch (error) {
        console.error(`[TradeSimulationWS] Error broadcasting to ${connectionId}:`, error);
        this.connections.delete(connectionId);
      }
    });

    console.log(`[TradeSimulationWS] Broadcasted ${type} to ${sentCount} connections`);
  }

  /**
   * Cleanup all connections
   */
  shutdown() {
    console.log('[TradeSimulationWS] Shutting down handler');
    this.connections.forEach((connection) => {
      try {
        connection.ws.close();
      } catch (error) {
        console.error('[TradeSimulationWS] Error closing connection:', error);
      }
    });
    this.connections.clear();
  }
}

// Create and export singleton instance
const tradeSimulationWebSocketHandler = new TradeSimulationWebSocketHandler();

module.exports = tradeSimulationWebSocketHandler;