const WebSocket = require('ws');
const EventEmitter = require('events');

class FinnhubWebSocketService extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.apiKey = process.env.FINNHUB_API_KEY;
    this.connected = false;
    this.subscribedSymbols = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect() {
    if (!this.apiKey) {
      console.error('FINNHUB_API_KEY not found in environment variables');
      return;
    }

    const wsUrl = `wss://ws.finnhub.io?token=${this.apiKey}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        console.log('Connected to Finnhub WebSocket');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        
        // Re-subscribe to previously subscribed symbols
        this.subscribedSymbols.forEach(symbol => {
          this.subscribeToSymbol(symbol);
        });
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('Disconnected from Finnhub WebSocket');
        this.connected = false;
        this.emit('disconnected');
        this.handleReconnect();
      });

      this.ws.on('error', (error) => {
        console.error('Finnhub WebSocket error:', error);
        this.emit('error', error);
      });
    } catch (error) {
      console.error('Failed to connect to Finnhub WebSocket:', error);
    }
  }

  handleMessage(message) {
    if (message.type === 'trade' && message.data) {
      // Process trade data
      message.data.forEach(trade => {
        const tradeData = {
          symbol: trade.s,
          price: trade.p,
          volume: trade.v,
          timestamp: trade.t,
          conditions: trade.c
        };
        
        this.emit('trade', tradeData);
        this.emit(`trade:${trade.s}`, tradeData);
      });
    } else if (message.type === 'ping') {
      // Respond to ping with pong
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'pong' }));
      }
    }
  }

  subscribeToSymbol(symbol) {
    if (!this.connected || !this.ws) {
      console.log(`Queuing subscription for ${symbol} - not connected`);
      this.subscribedSymbols.add(symbol);
      return;
    }

    const subscribeMessage = {
      type: 'subscribe',
      symbol: symbol.toUpperCase()
    };

    try {
      this.ws.send(JSON.stringify(subscribeMessage));
      this.subscribedSymbols.add(symbol.toUpperCase());
      console.log(`Subscribed to ${symbol}`);
    } catch (error) {
      console.error(`Failed to subscribe to ${symbol}:`, error);
    }
  }

  unsubscribeFromSymbol(symbol) {
    if (!this.connected || !this.ws) {
      this.subscribedSymbols.delete(symbol.toUpperCase());
      return;
    }

    const unsubscribeMessage = {
      type: 'unsubscribe',
      symbol: symbol.toUpperCase()
    };

    try {
      this.ws.send(JSON.stringify(unsubscribeMessage));
      this.subscribedSymbols.delete(symbol.toUpperCase());
      console.log(`Unsubscribed from ${symbol}`);
    } catch (error) {
      console.error(`Failed to unsubscribe from ${symbol}:`, error);
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.subscribedSymbols.clear();
  }

  getSubscribedSymbols() {
    return Array.from(this.subscribedSymbols);
  }

  isConnected() {
    return this.connected;
  }
}

module.exports = new FinnhubWebSocketService();