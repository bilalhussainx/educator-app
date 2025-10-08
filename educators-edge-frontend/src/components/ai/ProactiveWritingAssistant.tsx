import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Send, MessageSquare, Lightbulb, CheckCircle, AlertCircle, Edit3, Brain, Zap } from 'lucide-react';

interface ProactiveWritingAssistantProps {
  content: string;
  selectedText: string;
  onContentChange: (newContent: string) => void;
  onTextSelect: (text: string) => void;
}

interface Suggestion {
  id: string;
  type: 'grammar' | 'style' | 'structure' | 'clarity' | 'flow';
  severity: 'low' | 'medium' | 'high';
  position: { start: number; end: number };
  originalText: string;
  suggestion: string;
  reason: string;
  autoApplicable: boolean;
}

interface Analysis {
  overallScore: number;
  wordCount: number;
  readabilityScore: number;
  suggestions: Suggestion[];
  strengths: string[];
  improvements: string[];
}

const ProactiveWritingAssistant: React.FC<ProactiveWritingAssistantProps> = ({
  content,
  selectedText,
  onContentChange,
  onTextSelect
}) => {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [activeSuggestions, setActiveSuggestions] = useState<Suggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ type: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const analysisTimeoutRef = useRef<NodeJS.Timeout>();

  // Real-time text analysis
  const analyzeText = useCallback(async (text: string) => {
    if (!text.trim() || text.length < 50) return;

    setIsAnalyzing(true);

    // Simulate AI analysis with sophisticated patterns
    setTimeout(() => {
      const analysis = performTextAnalysis(text);
      setAnalysis(analysis);
      setActiveSuggestions(analysis.suggestions.filter(s => s.severity === 'high'));
      setIsAnalyzing(false);

      // Auto-generate contextual chat response
      generateContextualResponse(analysis, text);
    }, 1500);
  }, []);

  // Debounced analysis trigger
  useEffect(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    analysisTimeoutRef.current = setTimeout(() => {
      if (content.length > 50) {
        analyzeText(content);
      }
    }, 2000);

    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [content, analyzeText]);

  const performTextAnalysis = (text: string): Analysis => {
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgWordsPerSentence = words / Math.max(sentences, 1);

    const suggestions: Suggestion[] = [];

    // Grammar and style analysis
    const passiveVoiceMatches = text.match(/\b(was|were|is|are|been)\s+\w+ed\b/g) || [];
    passiveVoiceMatches.forEach((match, index) => {
      const position = text.indexOf(match);
      suggestions.push({
        id: `passive-${index}`,
        type: 'style',
        severity: 'medium',
        position: { start: position, end: position + match.length },
        originalText: match,
        suggestion: 'Consider using active voice for stronger writing',
        reason: 'Active voice makes your writing more direct and engaging',
        autoApplicable: false
      });
    });

    // Repetitive word detection
    const wordFreq: { [key: string]: number } = {};
    const significantWords = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    significantWords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    Object.entries(wordFreq).forEach(([word, count]) => {
      if (count > 3) {
        suggestions.push({
          id: `repetitive-${word}`,
          type: 'style',
          severity: 'low',
          position: { start: 0, end: 0 },
          originalText: word,
          suggestion: `Consider using synonyms for "${word}" (used ${count} times)`,
          reason: 'Varied vocabulary makes writing more engaging',
          autoApplicable: false
        });
      }
    });

    // Sentence length analysis
    const longSentences = text.split(/[.!?]+/).filter(s => s.split(/\s+/).length > 25);
    longSentences.forEach((sentence, index) => {
      const position = text.indexOf(sentence.trim());
      if (position !== -1) {
        suggestions.push({
          id: `long-sentence-${index}`,
          type: 'clarity',
          severity: 'medium',
          position: { start: position, end: position + sentence.length },
          originalText: sentence.trim(),
          suggestion: 'Consider breaking this long sentence into shorter ones',
          reason: 'Shorter sentences improve readability and comprehension',
          autoApplicable: false
        });
      }
    });

    // Paragraph structure analysis
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    paragraphs.forEach((paragraph, index) => {
      const sentenceCount = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
      if (sentenceCount < 3) {
        suggestions.push({
          id: `short-paragraph-${index}`,
          type: 'structure',
          severity: 'low',
          position: { start: 0, end: 0 },
          originalText: paragraph.substring(0, 50) + '...',
          suggestion: 'Consider expanding this paragraph with more supporting details',
          reason: 'Well-developed paragraphs strengthen your arguments',
          autoApplicable: false
        });
      }
    });

    const readabilityScore = Math.max(0, Math.min(100,
      100 - (avgWordsPerSentence * 2) + (words > 100 ? 10 : 0)
    ));

    const overallScore = Math.max(0, 100 - (suggestions.length * 5));

    return {
      overallScore,
      wordCount: words,
      readabilityScore,
      suggestions,
      strengths: [
        words > 200 ? 'Good length and development' : '',
        readabilityScore > 70 ? 'Clear and readable' : '',
        avgWordsPerSentence < 20 ? 'Good sentence variety' : ''
      ].filter(Boolean),
      improvements: suggestions.slice(0, 3).map(s => s.reason)
    };
  };

  const generateContextualResponse = (analysis: Analysis, text: string) => {
    const responses = [];

    if (analysis.overallScore > 80) {
      responses.push("🎉 Your writing is looking excellent! I noticed strong clarity and structure.");
    } else if (analysis.overallScore > 60) {
      responses.push("📝 Good progress! I've identified some areas where we can polish your writing further.");
    } else {
      responses.push("💡 I see great potential here! Let me suggest some improvements to strengthen your essay.");
    }

    if (analysis.suggestions.length > 0) {
      const primaryIssue = analysis.suggestions[0];
      responses.push(`🔍 Primary focus: ${primaryIssue.reason}`);
    }

    if (analysis.strengths.length > 0) {
      responses.push(`✨ Strengths: ${analysis.strengths[0]}`);
    }

    // Add contextual writing tips based on content length and structure
    const wordCount = text.split(/\s+/).length;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    if (wordCount > 100 && wordCount < 300) {
      responses.push("💭 As you develop your ideas, consider adding specific examples or evidence to support your main points.");
    } else if (wordCount > 300 && paragraphs.length < 3) {
      responses.push("📋 Your essay is developing well! Consider organizing your ideas into clear paragraphs with distinct topics.");
    } else if (wordCount > 500) {
      responses.push("🎯 You're building substantial content! Focus on ensuring smooth transitions between your paragraphs.");
    }

    setChatMessages(prev => [...prev, {
      type: 'assistant',
      content: responses.join('\n\n')
    }]);
  };

  const applySuggestion = (suggestion: Suggestion) => {
    if (suggestion.autoApplicable) {
      const newContent = content.substring(0, suggestion.position.start) +
        suggestion.suggestion +
        content.substring(suggestion.position.end);
      onContentChange(newContent);
    }

    setActiveSuggestions(prev => prev.filter(s => s.id !== suggestion.id));

    setChatMessages(prev => [...prev, {
      type: 'assistant',
      content: `✅ Applied suggestion: ${suggestion.reason}`
    }]);
  };

  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;

    setChatMessages(prev => [...prev, { type: 'user', content: chatInput }]);

    // Generate intelligent response based on current analysis and question
    setTimeout(() => {
      let response = '';
      const input = chatInput.toLowerCase();

      if (input.includes('improve') || input.includes('better')) {
        if (analysis) {
          response = `Based on your current text, here are my top recommendations:\n\n${analysis.improvements.slice(0, 2).map(imp => `• ${imp}`).join('\n')}\n\n🎯 Current quality score: ${Math.round(analysis.overallScore)}%`;
        } else {
          response = "I'm analyzing your text now. In the meantime, focus on clear topic sentences and smooth transitions between paragraphs.";
        }
      } else if (input.includes('structure') || input.includes('organize')) {
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        response = `For better structure, ensure each paragraph has:\n• A clear topic sentence\n• 2-3 supporting details\n• A transition to the next idea\n\n📊 Currently you have ${paragraphs.length} paragraph(s). Most essays benefit from 3-5 well-developed paragraphs.`;
      } else if (input.includes('grammar') || input.includes('errors')) {
        const grammarSuggestions = analysis?.suggestions.filter(s => s.type === 'grammar') || [];
        if (grammarSuggestions.length > 0) {
          response = `I found ${grammarSuggestions.length} grammar suggestions. Check the highlighted areas in your text. The most important one is: ${grammarSuggestions[0]?.reason}`;
        } else {
          response = "Your grammar looks good! I'm continuously checking as you write. 📝 Keep up the excellent work!";
        }
      } else if (input.includes('conclusion') || input.includes('ending')) {
        response = "For a strong conclusion:\n• Restate your main argument in fresh words\n• Summarize key supporting points\n• End with broader implications or call to action\n\n💡 Avoid introducing new information in your conclusion.";
      } else if (input.includes('introduction') || input.includes('opening')) {
        response = "For a compelling introduction:\n• Start with a hook (question, quote, or statistic)\n• Provide background context\n• End with a clear thesis statement\n\n🎯 Your thesis should preview your main arguments.";
      } else if (input.includes('thesis') || input.includes('argument')) {
        response = "A strong thesis statement:\n• Takes a clear position\n• Is specific and focused\n• Previews your main supporting points\n• Appears at the end of your introduction\n\n📋 Try completing this: 'Although [opposing view], [your position] because [reason 1], [reason 2], and [reason 3].'";
      } else if (input.includes('transition') || input.includes('flow')) {
        response = "Great transitions connect ideas smoothly:\n• Furthermore, Additionally (for adding ideas)\n• However, Nevertheless (for contrasting)\n• Consequently, Therefore (for showing results)\n• For example, Specifically (for providing evidence)\n\n🔗 Each paragraph should connect to the next logically.";
      } else if (input.includes('evidence') || input.includes('support') || input.includes('example')) {
        response = "Strong evidence includes:\n• Specific examples and statistics\n• Expert quotes and research findings\n• Personal anecdotes (when appropriate)\n• Historical or contemporary cases\n\n📚 Always explain how your evidence supports your argument.";
      } else {
        const wordCount = content.split(/\s+/).length;
        response = analysis
          ? `I understand your question about "${chatInput}". Based on your current writing (${analysis.wordCount} words, ${Math.round(analysis.overallScore)}% quality score), I recommend focusing on ${analysis.improvements[0] || 'developing your ideas further'}.\n\n🤔 Is there a specific aspect of your essay you'd like help with?`
          : `Great question about "${chatInput}"! I'm analyzing your text to give you personalized advice. Keep writing and I'll provide specific feedback.\n\n💭 Current word count: ${wordCount}. Keep developing your ideas!`;
      }

      setChatMessages(prev => [...prev, { type: 'assistant', content: response }]);
    }, 800);

    setChatInput('');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Analysis Status */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            AI Writing Coach
          </h3>
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-blue-600">
              <Zap className="w-4 h-4 animate-pulse" />
              <span className="text-sm">Analyzing...</span>
            </div>
          )}
        </div>

        {analysis && (
          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-lg text-green-600">{Math.round(analysis.overallScore)}%</div>
              <div className="text-gray-600">Quality Score</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg text-blue-600">{analysis.wordCount}</div>
              <div className="text-gray-600">Words</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg text-purple-600">{Math.round(analysis.readabilityScore)}%</div>
              <div className="text-gray-600">Readability</div>
            </div>
          </div>
        )}
      </div>

      {/* Active Suggestions */}
      {activeSuggestions.length > 0 && (
        <div className="p-4 bg-yellow-50 border-b">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-600" />
            Live Suggestions
          </h4>
          <div className="space-y-2">
            {activeSuggestions.slice(0, 2).map((suggestion) => (
              <div key={suggestion.id} className="bg-white p-3 rounded-lg border">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">{suggestion.suggestion}</div>
                    <div className="text-xs text-gray-600 mt-1">{suggestion.reason}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => applySuggestion(suggestion)}
                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setActiveSuggestions(prev => prev.filter(s => s.id !== suggestion.id))}
                      className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMessages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>I'm actively analyzing your writing as you type.</p>
              <p className="text-sm mt-1">Ask me anything about improving your essay!</p>
            </div>
          )}

          {chatMessages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
              placeholder="Ask about writing improvements, structure, clarity..."
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={handleChatSubmit}
              disabled={!chatInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProactiveWritingAssistant;