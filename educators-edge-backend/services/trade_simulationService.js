/**
 * Trade Simulation Service - The Heart of the Market Replay Engine
 * 
 * This service manages the lifecycle of market simulations, broadcasting
 * historical market data to connected clients in real-time.
 */

const { pool } = require('../db');

class TradeSimulationService {
  constructor() {
    // Core simulation state
    this.isActive = false;
    this.currentDate = new Date('2020-01-01'); // Default starting date
    this.simulationSpeed = 2000; // 2 seconds per day (in milliseconds)
    this.intervalId = null;
    this.subscribers = new Set(); // WebSocket connections
    
    // Tracked symbols for the simulation
    this.trackedSymbols = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX'];
    
    console.log('[SimulationService] Initialized with default date:', this.currentDate.toISOString().split('T')[0]);
  }

  /**
   * Add a client WebSocket to the subscribers set
   */
  addSubscriber(ws) {
    this.subscribers.add(ws);
    console.log(`[SimulationService] Added subscriber. Total: ${this.subscribers.size}`);
    
    // Send current simulation state to new subscriber
    this.sendToSubscriber(ws, {
      type: 'SIMULATION_STATE_UPDATE',
      data: {
        isActive: this.isActive,
        currentDate: this.currentDate.toISOString().split('T')[0],
        speed: this.simulationSpeed
      }
    });
    
    // Send current market data to new subscriber immediately
    this.tick();
  }

  /**
   * Remove a client WebSocket from the subscribers set
   */
  removeSubscriber(ws) {
    this.subscribers.delete(ws);
    console.log(`[SimulationService] Removed subscriber. Total: ${this.subscribers.size}`);
  }

  /**
   * Start the simulation
   */
  play() {
    if (this.isActive) {
      console.log('[SimulationService] Simulation already active');
      return;
    }

    this.isActive = true;
    console.log(`[SimulationService] Starting simulation from ${this.currentDate.toISOString().split('T')[0]} at ${this.simulationSpeed}ms per day`);
    
    // Start the interval loop
    this.intervalId = setInterval(() => {
      this.tick();
    }, this.simulationSpeed);

    // Broadcast state change
    this.broadcastToSubscribers({
      type: 'SIMULATION_STATE_UPDATE',
      data: {
        isActive: this.isActive,
        currentDate: this.currentDate.toISOString().split('T')[0],
        speed: this.simulationSpeed
      }
    });

    // Immediately tick to send current date data
    this.tick();
  }

  /**
   * Pause the simulation
   */
  pause() {
    if (!this.isActive) {
      console.log('[SimulationService] Simulation already paused');
      return;
    }

    this.isActive = false;
    console.log('[SimulationService] Pausing simulation');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Broadcast state change
    this.broadcastToSubscribers({
      type: 'SIMULATION_STATE_UPDATE',
      data: {
        isActive: this.isActive,
        currentDate: this.currentDate.toISOString().split('T')[0],
        speed: this.simulationSpeed
      }
    });
  }

  /**
   * Update simulation speed and restart if active
   */
  setSpeed(speed) {
    this.simulationSpeed = speed;
    console.log(`[SimulationService] Speed updated to ${speed}ms per day`);
    
    // If simulation is active, restart with new speed
    if (this.isActive) {
      if (this.intervalId) {
        clearInterval(this.intervalId);
      }
      
      this.intervalId = setInterval(() => {
        this.tick();
      }, this.simulationSpeed);
    }

    // Broadcast state change
    this.broadcastToSubscribers({
      type: 'SIMULATION_STATE_UPDATE',
      data: {
        isActive: this.isActive,
        currentDate: this.currentDate.toISOString().split('T')[0],
        speed: this.simulationSpeed
      }
    });
  }

  /**
   * Jump to a specific date and immediately broadcast data
   */
  jumpToDate(date) {
    this.currentDate = new Date(date);
    console.log(`[SimulationService] Jumped to date: ${this.currentDate.toISOString().split('T')[0]}`);
    
    // Broadcast state change
    this.broadcastToSubscribers({
      type: 'SIMULATION_DATE_CHANGED',
      data: {
        currentDate: this.currentDate.toISOString().split('T')[0]
      }
    });

    // Immediately send market data for the new date
    this.tick();
  }

  /**
   * Get the next valid trading day (skip weekends)
   */
  getNextTradingDay(date) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Skip weekends (Saturday = 6, Sunday = 0)
    const dayOfWeek = nextDay.getDay();
    if (dayOfWeek === 0) { // Sunday
      nextDay.setDate(nextDay.getDate() + 1); // Move to Monday
    } else if (dayOfWeek === 6) { // Saturday
      nextDay.setDate(nextDay.getDate() + 2); // Move to Monday
    }
    
    return nextDay;
  }

  /**
   * The heart of the simulation engine - called every tick
   */
  async tick() {
    try {
      const dateString = this.currentDate.toISOString().split('T')[0];
      console.log(`[SimulationService] Tick: ${dateString}`);

      // Query market data for the current date from market_data table
      const result = await pool.query(`
        SELECT 
          symbol, 
          open_price, 
          high_price, 
          low_price, 
          close_price, 
          volume,
          timestamp
        FROM market_data 
        WHERE DATE(timestamp) = $1 
        AND symbol = ANY($2)
        AND timeframe = 'daily'
        ORDER BY symbol
      `, [dateString, this.trackedSymbols]);

      if (result.rows.length > 0) {
        // Construct market data payload in the definitive format
        const marketDataPayload = {};
        result.rows.forEach(row => {
          marketDataPayload[row.symbol] = {
            open: parseFloat(row.open_price),
            high: parseFloat(row.high_price),
            low: parseFloat(row.low_price),
            close: parseFloat(row.close_price),
            volume: parseInt(row.volume)
          };
        });

        // Broadcast market data to all subscribers using the definitive payload format
        this.broadcastToSubscribers({
          type: 'MARKET_DATA_UPDATE',
          payload: {
            date: this.currentDate.toISOString(),
            marketData: marketDataPayload
          }
        });

        console.log(`[SimulationService] Broadcasted MARKET_DATA_UPDATE for ${result.rows.length} symbols on ${dateString}`);
      } else {
        console.log(`[SimulationService] No market data found for ${dateString}, trying next trading day`);
      }

      // Advance to next day only if simulation is active
      if (this.isActive) {
        this.currentDate = this.getNextTradingDay(this.currentDate);
      }

    } catch (error) {
      console.error('[SimulationService] Error in tick():', error);
    }
  }

  /**
   * Broadcast a message to all connected subscribers
   */
  broadcastToSubscribers(message) {
    const messageString = JSON.stringify(message);
    const subscribersToRemove = [];

    this.subscribers.forEach(ws => {
      try {
        if (ws.readyState === ws.OPEN) {
          ws.send(messageString);
        } else {
          subscribersToRemove.push(ws);
        }
      } catch (error) {
        console.error('[SimulationService] Error sending to subscriber:', error);
        subscribersToRemove.push(ws);
      }
    });

    // Clean up closed connections
    subscribersToRemove.forEach(ws => {
      this.subscribers.delete(ws);
    });

    if (subscribersToRemove.length > 0) {
      console.log(`[SimulationService] Cleaned up ${subscribersToRemove.length} closed connections`);
    }
  }

  /**
   * Send a message to a specific subscriber
   */
  sendToSubscriber(ws, message) {
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('[SimulationService] Error sending to subscriber:', error);
      this.subscribers.delete(ws);
    }
  }

  /**
   * Get current simulation state
   */
  getState() {
    return {
      isActive: this.isActive,
      currentDate: this.currentDate.toISOString().split('T')[0],
      speed: this.simulationSpeed,
      subscriberCount: this.subscribers.size,
      trackedSymbols: this.trackedSymbols
    };
  }

  /**
   * Reset simulation to initial state
   */
  reset() {
    this.pause();
    this.currentDate = new Date('2020-01-01');
    console.log('[SimulationService] Reset to initial state');
    
    this.broadcastToSubscribers({
      type: 'SIMULATION_STATE_UPDATE',
      data: {
        isActive: this.isActive,
        currentDate: this.currentDate.toISOString().split('T')[0],
        speed: this.simulationSpeed
      }
    });
  }

  /**
   * Cleanup method for graceful shutdown
   */
  shutdown() {
    this.pause();
    this.subscribers.clear();
    console.log('[SimulationService] Shutdown complete');
  }
}

// Create and export singleton instance
const tradeSimulationService = new TradeSimulationService();

module.exports = tradeSimulationService;