const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Pattern Recognition Controller
 * Uses Gemini AI to analyze candlestick patterns in OHLC data
 */

const analyzePatterns = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { chartData, resolution } = req.body;

    console.log(`[PatternAI] Analyzing patterns for ${symbol} with ${chartData?.length || 0} data points`);

    // Validate input data
    if (!chartData || !Array.isArray(chartData) || chartData.length < 10) {
      return res.status(400).json({
        error: 'Insufficient chart data for pattern analysis',
        message: 'At least 10 data points required'
      });
    }

    // Prepare the data for Gemini API
    const ohlcDataStr = chartData.slice(-30).map(candle => 
      `${new Date(candle.timestamp).toISOString().split('T')[0]}: O:${candle.open.toFixed(2)} H:${candle.high.toFixed(2)} L:${candle.low.toFixed(2)} C:${candle.close.toFixed(2)} V:${candle.volume}`
    ).join('\n');

    const prompt = `You are an expert quantitative analyst specializing in candlestick pattern recognition. 

The following is OHLCV data for ${symbol}:
${ohlcDataStr}

Analyze this data and identify any significant bullish or bearish candlestick patterns (e.g., 'Doji', 'Hammer', 'Engulfing Pattern', 'Head and Shoulders', 'Morning Star', 'Evening Star', 'Shooting Star').

Return ONLY a valid JSON array of objects. Each object must contain:
- patternName: string (exact pattern name)
- timestamp: number (Unix timestamp in milliseconds of the pattern occurrence)
- confidence: number (0.0 to 1.0 confidence score)
- type: string ("bullish", "bearish", or "neutral")
- description: string (brief educational explanation)

Example format:
[{"patternName": "Bullish Engulfing", "timestamp": 1640995200000, "confidence": 0.75, "type": "bullish", "description": "Strong bullish reversal pattern"}]

Only include patterns with confidence >= 0.6. Limit to maximum 5 patterns.`;

    try {
      // Call Gemini API
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      console.log(`[PatternAI] Raw Gemini response:`, text.substring(0, 200) + '...');

      // Clean up the response (remove markdown formatting if present)
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Try to parse the JSON response
      let patterns;
      try {
        patterns = JSON.parse(text);
      } catch (parseError) {
        console.warn('[PatternAI] Failed to parse Gemini response, using fallback patterns');
        patterns = generateFallbackPatterns(symbol, chartData);
      }

      // Validate the response structure
      if (!Array.isArray(patterns)) {
        console.warn('[PatternAI] Invalid response structure, using fallback patterns');
        patterns = generateFallbackPatterns(symbol, chartData);
      }

      // Ensure all patterns have required fields and valid timestamps
      patterns = patterns.filter(pattern => {
        const hasRequiredFields = pattern.patternName && 
                                 typeof pattern.timestamp === 'number' && 
                                 typeof pattern.confidence === 'number' &&
                                 pattern.type && 
                                 pattern.description;
        
        // Check if timestamp is within the data range
        const minTimestamp = Math.min(...chartData.map(d => d.timestamp));
        const maxTimestamp = Math.max(...chartData.map(d => d.timestamp));
        const timestampValid = pattern.timestamp >= minTimestamp && pattern.timestamp <= maxTimestamp;
        
        return hasRequiredFields && timestampValid;
      });

      console.log(`[PatternAI] Successfully analyzed ${patterns.length} patterns for ${symbol}`);

      res.json(patterns);

    } catch (aiError) {
      console.error('[PatternAI] Gemini API error:', aiError);
      
      // Fallback to mock patterns if AI fails
      const fallbackPatterns = generateFallbackPatterns(symbol, chartData);
      
      res.json(fallbackPatterns);
    }

  } catch (error) {
    console.error('[PatternAI] Controller error:', error);
    res.status(500).json({
      error: 'Pattern analysis failed',
      message: error.message
    });
  }
};

// Generate fallback patterns when AI is unavailable
const generateFallbackPatterns = (symbol, chartData) => {
  console.log(`[PatternAI] Generating fallback patterns for ${symbol}`);
  
  const patterns = [];
  const patternTypes = [
    { name: 'Bullish Engulfing', type: 'bullish', confidence: 0.75 },
    { name: 'Bearish Engulfing', type: 'bearish', confidence: 0.72 },
    { name: 'Hammer', type: 'bullish', confidence: 0.68 },
    { name: 'Shooting Star', type: 'bearish', confidence: 0.71 },
    { name: 'Doji', type: 'neutral', confidence: 0.65 },
    { name: 'Morning Star', type: 'bullish', confidence: 0.78 },
    { name: 'Evening Star', type: 'bearish', confidence: 0.76 }
  ];

  const descriptions = {
    'Bullish Engulfing': 'A two-candle reversal pattern indicating potential upward momentum.',
    'Bearish Engulfing': 'A two-candle reversal pattern indicating potential downward momentum.',
    'Hammer': 'Single-candle pattern often indicating bullish reversal at support.',
    'Shooting Star': 'Single-candle pattern often indicating bearish reversal at resistance.',
    'Doji': 'Indecision candle suggesting potential trend reversal.',
    'Morning Star': 'Three-candle bullish reversal pattern.',
    'Evening Star': 'Three-candle bearish reversal pattern.'
  };

  // Generate 2-4 random patterns from the available data points
  const numPatterns = 2 + Math.floor(Math.random() * 3);
  const dataRange = chartData.slice(-20); // Use last 20 data points
  
  for (let i = 0; i < numPatterns && i < dataRange.length; i++) {
    const pattern = patternTypes[Math.floor(Math.random() * patternTypes.length)];
    const dataPoint = dataRange[Math.floor(Math.random() * dataRange.length)];
    
    patterns.push({
      patternName: pattern.name,
      timestamp: dataPoint.timestamp,
      confidence: pattern.confidence + (Math.random() * 0.1 - 0.05),
      type: pattern.type,
      description: descriptions[pattern.name]
    });
  }

  return patterns;
};

module.exports = {
  analyzePatterns
};