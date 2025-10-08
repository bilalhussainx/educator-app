import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Lightbulb, X, Check, RefreshCw, MessageSquare, Edit, Zap } from 'lucide-react';

interface InlineSuggestion {
  id: string;
  position: number;
  type: 'grammar' | 'style' | 'clarity' | 'flow' | 'structure';
  severity: 'low' | 'medium' | 'high';
  originalText: string;
  suggestedText: string;
  explanation: string;
  confidence: number;
}

interface InlineAISuggestionsProps {
  content: string;
  onContentChange: (newContent: string) => void;
  enabled: boolean;
}

const InlineAISuggestions: React.FC<InlineAISuggestionsProps> = ({
  content,
  onContentChange,
  enabled
}) => {
  const [suggestions, setSuggestions] = useState<InlineSuggestion[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisTimeoutRef = useRef<NodeJS.Timeout>();

  const generateSuggestions = useCallback((text: string) => {
    if (!text || text.length < 100) return [];

    const newSuggestions: InlineSuggestion[] = [];

    // Grammar suggestions
    const grammarPatterns = [
      { pattern: /\b(their|there|they're)\b/gi, message: "Check if you're using the correct form" },
      { pattern: /\b(its|it's)\b/gi, message: "Verify contraction vs. possessive" },
      { pattern: /\b(your|you're)\b/gi, message: "Check if you're using the correct form" },
      { pattern: /\b(to|too|two)\b/gi, message: "Ensure correct usage" }
    ];

    grammarPatterns.forEach((pattern, index) => {
      const matches = Array.from(text.matchAll(pattern.pattern));
      matches.forEach((match, matchIndex) => {
        if (match.index !== undefined) {
          newSuggestions.push({
            id: `grammar-${index}-${matchIndex}`,
            position: match.index,
            type: 'grammar',
            severity: 'medium',
            originalText: match[0],
            suggestedText: match[0], // Keep same for verification
            explanation: pattern.message,
            confidence: 0.7
          });
        }
      });
    });

    // Style suggestions - passive voice
    const passivePattern = /\b(was|were|is|are|been)\s+\w+ed\b/gi;
    const passiveMatches = Array.from(text.matchAll(passivePattern));
    passiveMatches.forEach((match, index) => {
      if (match.index !== undefined) {
        newSuggestions.push({
          id: `passive-${index}`,
          position: match.index,
          type: 'style',
          severity: 'low',
          originalText: match[0],
          suggestedText: `Consider rewriting in active voice`,
          explanation: 'Active voice often makes writing more direct and engaging',
          confidence: 0.8
        });
      }
    });

    // Clarity suggestions - long sentences
    const sentences = text.split(/[.!?]+/);
    let currentPosition = 0;
    sentences.forEach((sentence, index) => {
      const words = sentence.trim().split(/\s+/);
      if (words.length > 25 && sentence.trim().length > 0) {
        newSuggestions.push({
          id: `long-sentence-${index}`,
          position: currentPosition,
          type: 'clarity',
          severity: 'medium',
          originalText: sentence.trim(),
          suggestedText: 'Consider breaking into shorter sentences',
          explanation: 'Shorter sentences improve readability and comprehension',
          confidence: 0.85
        });
      }
      currentPosition += sentence.length + 1;
    });

    // Flow suggestions - repetitive words
    const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    Object.entries(wordCount).forEach(([word, count]) => {
      if (count > 4) {
        const firstIndex = text.toLowerCase().indexOf(word);
        newSuggestions.push({
          id: `repetitive-${word}`,
          position: firstIndex,
          type: 'flow',
          severity: 'low',
          originalText: word,
          suggestedText: `Consider using synonyms for "${word}"`,
          explanation: `Word "${word}" appears ${count} times - variety improves flow`,
          confidence: 0.6
        });
      }
    });

    // Structure suggestions - paragraph length
    const paragraphs = text.split(/\n\s*\n/);
    let paragraphPosition = 0;
    paragraphs.forEach((paragraph, index) => {
      const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length < 3 && paragraph.trim().length > 50) {
        newSuggestions.push({
          id: `short-paragraph-${index}`,
          position: paragraphPosition,
          type: 'structure',
          severity: 'low',
          originalText: paragraph.substring(0, 50) + '...',
          suggestedText: 'Consider expanding this paragraph',
          explanation: 'Well-developed paragraphs typically contain 3-5 sentences',
          confidence: 0.7
        });
      }
      paragraphPosition += paragraph.length + 2;
    });

    return newSuggestions.slice(0, 10); // Limit to top 10 suggestions
  }, []);

  const analyzeSuggestions = useCallback(() => {
    if (!enabled || !content.trim()) return;

    setIsAnalyzing(true);
    const newSuggestions = generateSuggestions(content);

    setTimeout(() => {
      setSuggestions(newSuggestions);
      setIsAnalyzing(false);
    }, 1000);
  }, [content, enabled, generateSuggestions]);

  // Debounced analysis
  useEffect(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    if (enabled && content.length > 100) {
      analysisTimeoutRef.current = setTimeout(analyzeSuggestions, 2000);
    }

    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [content, enabled, analyzeSuggestions]);

  const applySuggestion = useCallback((suggestion: InlineSuggestion) => {
    if (suggestion.type === 'grammar' || suggestion.suggestedText.includes('Consider')) {
      // For suggestions that require manual review, just highlight
      setActiveSuggestion(suggestion.id);
      return;
    }

    // Apply direct text replacement
    const newContent =
      content.substring(0, suggestion.position) +
      suggestion.suggestedText +
      content.substring(suggestion.position + suggestion.originalText.length);

    onContentChange(newContent);
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  }, [content, onContentChange]);

  const dismissSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    if (activeSuggestion === suggestionId) {
      setActiveSuggestion(null);
    }
  }, [activeSuggestion]);

  if (!enabled) return null;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'grammar': return 'text-red-600 bg-red-50 border-red-200';
      case 'style': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'clarity': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'flow': return 'text-green-600 bg-green-50 border-green-200';
      case 'structure': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'grammar': return <Edit className="w-3 h-3" />;
      case 'style': return <Zap className="w-3 h-3" />;
      case 'clarity': return <Lightbulb className="w-3 h-3" />;
      case 'flow': return <RefreshCw className="w-3 h-3" />;
      case 'structure': return <MessageSquare className="w-3 h-3" />;
      default: return <Lightbulb className="w-3 h-3" />;
    }
  };

  return (
    <div className="absolute top-0 right-0 w-80 bg-white border-l border-gray-200 h-full overflow-hidden z-10">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            Live Suggestions
          </h3>
          <div className="flex items-center gap-2">
            {isAnalyzing && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            )}
            <span className="text-sm text-gray-500">{suggestions.length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {suggestions.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-500 text-sm">
              {isAnalyzing ? 'Analyzing your writing...' : 'No suggestions available'}
            </p>
            {!isAnalyzing && content.length < 100 && (
              <p className="text-gray-400 text-xs mt-1">
                Write at least 100 characters to get suggestions
              </p>
            )}
          </div>
        ) : (
          suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className={`p-3 rounded-lg border ${getTypeColor(suggestion.type)} ${
                activeSuggestion === suggestion.id ? 'ring-2 ring-blue-300' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getTypeIcon(suggestion.type)}
                  <span className="text-xs font-medium uppercase tracking-wide">
                    {suggestion.type}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs px-1.5 py-0.5 bg-white rounded">
                    {Math.round(suggestion.confidence * 100)}%
                  </span>
                  <button
                    onClick={() => dismissSuggestion(suggestion.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm">
                  <div className="font-medium text-gray-900 mb-1">Original:</div>
                  <div className="text-gray-700 bg-white p-2 rounded text-xs">
                    {suggestion.originalText.length > 60
                      ? suggestion.originalText.substring(0, 60) + '...'
                      : suggestion.originalText}
                  </div>
                </div>

                <div className="text-sm">
                  <div className="font-medium text-gray-900 mb-1">Suggestion:</div>
                  <div className="text-gray-700 bg-white p-2 rounded text-xs">
                    {suggestion.suggestedText}
                  </div>
                </div>

                <div className="text-xs text-gray-600">
                  {suggestion.explanation}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => applySuggestion(suggestion)}
                    className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                  >
                    <Check className="w-3 h-3" />
                    Apply
                  </button>
                  <button
                    onClick={() => setActiveSuggestion(
                      activeSuggestion === suggestion.id ? null : suggestion.id
                    )}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                  >
                    <Lightbulb className="w-3 h-3" />
                    {activeSuggestion === suggestion.id ? 'Hide' : 'Review'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={analyzeSuggestions}
            disabled={isAnalyzing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Re-analyze
          </button>
        </div>
      )}
    </div>
  );
};

export default InlineAISuggestions;