/**
 * Professional Trading Components Suite
 * 
 * A comprehensive set of React components for building professional trading interfaces
 * with real-time data visualization and WebSocket integration.
 */

// Core Trading Components
export { PriceTicker } from './PriceTicker';
export { CandlestickChart } from './CandlestickChart';
export { LiveTradeFeed } from './LiveTradeFeed';
export { MarketDepth } from './MarketDepth';
export { PortfolioDashboard } from './PortfolioDashboard';
export { TradingOrderPanel } from './TradingOrderPanel';

// Command Center Components
export { TheStage } from './TheStage';
export { TheCockpit } from './TheCockpit';
export { MarketPulse } from './MarketPulse';

// Integrated Trading Terminal
export { ProfessionalTradingTerminal } from './ProfessionalTradingTerminal';

// Legacy Components (for backward compatibility)
export { PortfolioWidget } from './PortfolioWidget';

/**
 * Component Usage Guide:
 * 
 * 1. PriceTicker - Real-time price updates with color-coded changes
 *    <PriceTicker symbols={['AAPL', 'GOOGL']} updateInterval={500} />
 * 
 * 2. CandlestickChart - Interactive OHLC chart with zoom/pan
 *    <CandlestickChart symbol="AAPL" height={400} timeframe="1m" />
 * 
 * 3. LiveTradeFeed - Streaming trade execution feed
 *    <LiveTradeFeed symbols={['AAPL']} maxTrades={100} />
 * 
 * 4. MarketDepth - Order book visualization
 *    <MarketDepth symbol="AAPL" levels={10} />
 * 
 * 5. PortfolioDashboard - Real-time portfolio metrics
 *    <PortfolioDashboard refreshInterval={1000} />
 * 
 * 6. TradingOrderPanel - Order entry and management
 *    <TradingOrderPanel watchlistSymbols={symbols} selectedSymbol="AAPL" />
 * 
 * 7. ProfessionalTradingTerminal - Complete trading interface
 *    <ProfessionalTradingTerminal defaultSymbols={['AAPL', 'GOOGL']} />
 */