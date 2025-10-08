import { InlineComment } from '../components/analysis/InlineCommentSystem';

interface CommentGenerationConfig {
    density: 'light' | 'moderate' | 'dense' | 'very_dense';
    focusAreas: string[];
    documentType: 'college_essay' | 'academic_paper' | 'creative_writing' | 'business_document';
    userLevel: 'beginner' | 'intermediate' | 'advanced';
}

class InlineCommentGenerator {
    private commentPatterns = {
        // Sentence starters that often need improvement
        weakStarters: [
            'I think', 'I believe', 'I feel', 'In my opinion', 'There are many', 'It is important',
            'First of all', 'To begin with', 'In conclusion', 'In summary', 'This shows that'
        ],

        // Transition words to analyze
        transitions: [
            'however', 'therefore', 'furthermore', 'moreover', 'consequently', 'nevertheless',
            'additionally', 'meanwhile', 'subsequently', 'thus', 'hence', 'accordingly'
        ],

        // Academic words to praise or suggest alternatives
        academicWords: [
            'demonstrate', 'illustrate', 'emphasize', 'significant', 'substantial', 'crucial',
            'fundamental', 'comprehensive', 'analyze', 'evaluate', 'synthesize'
        ],

        // Common weak words to flag
        weakWords: [
            'very', 'really', 'quite', 'pretty', 'sort of', 'kind of', 'a lot', 'things', 'stuff'
        ],

        // Repetitive phrases
        repetitivePatterns: [
            /\b(\w+)\b.*?\b\1\b/gi, // Same word repeated within proximity
            /\b(the|and|but|or|so|that|this|these|those)\b/gi // Overused words
        ]
    };

    generateInlineComments(content: string, config: CommentGenerationConfig): InlineComment[] {
        const comments: InlineComment[] = [];
        const sentences = this.splitIntoSentences(content);
        const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);

        let currentOffset = 0;

        // Generate comments for each sentence
        sentences.forEach((sentence, sentenceIndex) => {
            const sentenceStart = content.indexOf(sentence, currentOffset);
            const sentenceEnd = sentenceStart + sentence.length;
            currentOffset = sentenceEnd;

            // Generate multiple types of comments for each sentence
            const sentenceComments = this.generateSentenceComments(
                sentence,
                sentenceStart,
                sentenceEnd,
                sentenceIndex,
                config
            );

            comments.push(...sentenceComments);
        });

        // Generate paragraph-level comments
        let paragraphOffset = 0;
        paragraphs.forEach((paragraph, paragraphIndex) => {
            const paragraphStart = content.indexOf(paragraph, paragraphOffset);
            const paragraphEnd = paragraphStart + paragraph.length;
            paragraphOffset = paragraphEnd;

            const paragraphComments = this.generateParagraphComments(
                paragraph,
                paragraphStart,
                paragraphEnd,
                paragraphIndex,
                config
            );

            comments.push(...paragraphComments);
        });

        // Generate overall flow comments
        const flowComments = this.generateFlowComments(content, paragraphs, config);
        comments.push(...flowComments);

        // Filter and limit based on density setting
        return this.filterCommentsByDensity(comments, config.density);
    }

    private generateSentenceComments(
        sentence: string,
        start: number,
        end: number,
        index: number,
        config: CommentGenerationConfig
    ): InlineComment[] {
        const comments: InlineComment[] = [];
        const words = sentence.split(/\s+/);

        // Check for weak sentence starters
        const firstPhrase = words.slice(0, 3).join(' ').toLowerCase();
        for (const weakStarter of this.commentPatterns.weakStarters) {
            if (firstPhrase.includes(weakStarter.toLowerCase())) {
                const targetText = words.slice(0, 3).join(' ');
                const targetStart = start;
                const targetEnd = start + targetText.length;

                comments.push({
                    id: `weak-starter-${index}`,
                    startOffset: targetStart,
                    endOffset: targetEnd,
                    text: sentence,
                    highlightedText: targetText,
                    type: 'suggestion',
                    severity: 'moderate',
                    message: `Consider starting with a stronger, more direct statement.`,
                    suggestion: `Try: "${this.generateStrongerOpening(sentence)}"`,
                    explanation: 'Weak openings like "I think" or "I believe" make your argument sound uncertain. Academic writing benefits from confident, direct statements.',
                    alternatives: [
                        this.generateStrongerOpening(sentence),
                        this.generateAlternativeOpening(sentence),
                        this.generateAcademicOpening(sentence)
                    ],
                    confidence: 0.85,
                    category: 'Sentence Structure',
                    timestamp: new Date()
                });
                break;
            }
        }

        // Check for weak words
        words.forEach((word, wordIndex) => {
            if (this.commentPatterns.weakWords.includes(word.toLowerCase())) {
                const wordStart = start + sentence.indexOf(word);
                const wordEnd = wordStart + word.length;

                comments.push({
                    id: `weak-word-${index}-${wordIndex}`,
                    startOffset: wordStart,
                    endOffset: wordEnd,
                    text: sentence,
                    highlightedText: word,
                    type: 'suggestion',
                    severity: 'minor',
                    message: `"${word}" is a weak modifier. Consider more specific language.`,
                    suggestion: this.suggestStrongerWord(word, sentence),
                    explanation: 'Weak modifiers like "very" and "really" dilute your message. Specific, precise language is more impactful.',
                    alternatives: this.generateWordAlternatives(word),
                    confidence: 0.75,
                    category: 'Word Choice',
                    timestamp: new Date()
                });
            }
        });

        // Check for academic vocabulary and praise good usage
        words.forEach((word, wordIndex) => {
            if (this.commentPatterns.academicWords.includes(word.toLowerCase())) {
                const wordStart = start + sentence.indexOf(word);
                const wordEnd = wordStart + word.length;

                comments.push({
                    id: `academic-praise-${index}-${wordIndex}`,
                    startOffset: wordStart,
                    endOffset: wordEnd,
                    text: sentence,
                    highlightedText: word,
                    type: 'praise',
                    severity: 'positive',
                    message: `Excellent academic vocabulary! "${word}" shows sophisticated thinking.`,
                    explanation: 'Academic vocabulary like this demonstrates your understanding of formal writing conventions and enhances your credibility.',
                    confidence: 0.90,
                    category: 'Academic Language',
                    timestamp: new Date()
                });
            }
        });

        // Check sentence length - only flag extremely long sentences (35+ words) and vary the feedback
        if (words.length > 35) {
            const hasCommas = sentence.includes(',');
            const hasConjunctions = /\b(and|but|or|yet|so)\b/i.test(sentence);

            let specificMessage = `This sentence is ${words.length} words long.`;
            let specificSuggestion = this.suggestSentenceBreak(sentence);

            if (hasCommas && hasConjunctions) {
                specificMessage += ' Consider splitting at a comma or conjunction for better flow.';
            } else if (hasCommas) {
                specificMessage += ' Try breaking this into separate sentences at the commas.';
            } else {
                specificMessage += ' Consider where you can naturally divide this into two thoughts.';
            }

            // Only add this comment 20% of the time to avoid repetition
            if (Math.random() < 0.2) {
                comments.push({
                    id: `long-sentence-${index}`,
                    startOffset: start,
                    endOffset: end,
                    text: sentence,
                    highlightedText: sentence.substring(0, Math.min(100, sentence.length)),
                    type: 'suggestion',
                    severity: 'moderate',
                    message: specificMessage,
                    suggestion: 'Look for natural breaking points: commas, semicolons, or conjunctions (and/but/or). Each sentence should express one clear idea.',
                    explanation: 'Long sentences can lose readers. Breaking complex ideas into shorter sentences improves clarity and keeps your reader engaged.',
                    confidence: 0.70,
                    category: 'Sentence Length',
                    timestamp: new Date()
                });
            }
        }

        // Disabled passive voice checker - too many false positives
        // The detection algorithm needs significant improvement before re-enabling

        return comments;
    }

    private generateParagraphComments(
        paragraph: string,
        start: number,
        end: number,
        index: number,
        config: CommentGenerationConfig
    ): InlineComment[] {
        const comments: InlineComment[] = [];
        const sentences = this.splitIntoSentences(paragraph);

        // Check paragraph length
        if (sentences.length < 3) {
            comments.push({
                id: `short-paragraph-${index}`,
                startOffset: start,
                endOffset: start + 50, // First 50 characters
                text: paragraph,
                highlightedText: paragraph.substring(0, 50) + '...',
                type: 'suggestion',
                severity: 'moderate',
                message: 'This paragraph could be developed further. Consider adding more supporting details.',
                suggestion: 'Add specific examples, evidence, or explanation to strengthen this point.',
                explanation: 'Well-developed paragraphs typically contain 4-6 sentences with a main idea and supporting details.',
                confidence: 0.75,
                category: 'Paragraph Development',
                timestamp: new Date()
            });
        }

        // Check for topic sentence
        if (index === 0 && config.documentType === 'college_essay') {
            const firstSentence = sentences[0];
            if (firstSentence && this.isWeakTopicSentence(firstSentence)) {
                comments.push({
                    id: `weak-topic-${index}`,
                    startOffset: start,
                    endOffset: start + firstSentence.length,
                    text: paragraph,
                    highlightedText: firstSentence,
                    type: 'suggestion',
                    severity: 'major',
                    message: 'Your opening sentence could be more engaging. Consider starting with a hook.',
                    suggestion: this.suggestBetterHook(firstSentence),
                    explanation: 'The opening sentence is crucial for grabbing your reader\'s attention. A strong hook draws them into your essay.',
                    alternatives: [
                        'Start with a surprising fact or statistic',
                        'Begin with a thought-provoking question',
                        'Open with a vivid scene or description',
                        'Use a relevant quote or dialogue'
                    ],
                    confidence: 0.85,
                    category: 'Opening Hook',
                    timestamp: new Date()
                });
            }
        }

        // Check paragraph transitions
        if (index > 0) {
            const firstSentence = sentences[0];
            if (firstSentence && !this.hasTransition(firstSentence)) {
                comments.push({
                    id: `missing-transition-${index}`,
                    startOffset: start,
                    endOffset: start + firstSentence.length,
                    text: paragraph,
                    highlightedText: firstSentence,
                    type: 'suggestion',
                    severity: 'moderate',
                    message: 'Consider adding a transition to connect this paragraph to the previous one.',
                    suggestion: this.suggestTransition(firstSentence),
                    explanation: 'Transitions help your reader follow your argument and create smooth flow between ideas.',
                    alternatives: [
                        'Furthermore, ' + firstSentence,
                        'Additionally, ' + firstSentence,
                        'However, ' + firstSentence,
                        'In contrast, ' + firstSentence
                    ],
                    confidence: 0.80,
                    category: 'Transitions',
                    timestamp: new Date()
                });
            }
        }

        return comments;
    }

    private generateFlowComments(
        content: string,
        paragraphs: string[],
        config: CommentGenerationConfig
    ): InlineComment[] {
        const comments: InlineComment[] = [];

        // Check overall structure for college essays
        if (config.documentType === 'college_essay' && paragraphs.length >= 3) {
            const conclusion = paragraphs[paragraphs.length - 1];
            const conclusionStart = content.lastIndexOf(conclusion);

            if (this.isWeakConclusion(conclusion)) {
                comments.push({
                    id: 'weak-conclusion',
                    startOffset: conclusionStart,
                    endOffset: conclusionStart + Math.min(conclusion.length, 100),
                    text: conclusion,
                    highlightedText: conclusion.substring(0, 100),
                    type: 'suggestion',
                    severity: 'major',
                    message: 'Your conclusion could be stronger. Avoid simply restating what you\'ve already said.',
                    suggestion: 'End with insight, reflection, or a call to action that leaves a lasting impression.',
                    explanation: 'Strong conclusions don\'t just summarize—they show growth, insight, or the broader significance of your story.',
                    alternatives: [
                        'Reflect on what you learned from this experience',
                        'Connect your story to your future goals',
                        'Show how this experience changed your perspective',
                        'End with a forward-looking statement'
                    ],
                    confidence: 0.85,
                    category: 'Conclusion',
                    timestamp: new Date()
                });
            }
        }

        return comments;
    }

    private filterCommentsByDensity(comments: InlineComment[], density: string): InlineComment[] {
        const maxComments: { [key: string]: number } = {
            light: Math.min(comments.length, 5),
            moderate: Math.min(comments.length, 15),
            dense: Math.min(comments.length, 30),
            very_dense: comments.length // No limit
        };

        // Sort by severity and confidence
        const sortedComments = comments.sort((a, b) => {
            const severityOrder: { [key: string]: number } = { major: 3, moderate: 2, minor: 1, positive: 0 };
            const aSeverity = severityOrder[a.severity] || 0;
            const bSeverity = severityOrder[b.severity] || 0;

            if (aSeverity !== bSeverity) return bSeverity - aSeverity;
            return b.confidence - a.confidence;
        });

        return sortedComments.slice(0, maxComments[density] || comments.length);
    }

    // Helper methods
    private splitIntoSentences(text: string): string[] {
        return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    }

    private generateStrongerOpening(sentence: string): string {
        return sentence.replace(/^(I think|I believe|I feel|In my opinion)\s+/i, '').trim();
    }

    private generateAlternativeOpening(sentence: string): string {
        const alternatives = ['Research shows that', 'Evidence suggests that', 'Studies indicate that'];
        return alternatives[Math.floor(Math.random() * alternatives.length)] + ' ' +
               sentence.replace(/^(I think|I believe|I feel|In my opinion)\s+/i, '').toLowerCase();
    }

    private generateAcademicOpening(sentence: string): string {
        const academic = ['Analysis reveals that', 'Data demonstrates that', 'Findings suggest that'];
        return academic[Math.floor(Math.random() * academic.length)] + ' ' +
               sentence.replace(/^(I think|I believe|I feel|In my opinion)\s+/i, '').toLowerCase();
    }

    private suggestStrongerWord(word: string, sentence: string): string {
        const alternatives: { [key: string]: string[] } = {
            'very': ['extremely', 'remarkably', 'exceptionally'],
            'really': ['genuinely', 'truly', 'significantly'],
            'quite': ['considerably', 'substantially', 'notably'],
            'pretty': ['rather', 'fairly', 'moderately']
        };

        const alts = alternatives[word.toLowerCase()] || ['more precise'];
        return alts[Math.floor(Math.random() * alts.length)];
    }

    private generateWordAlternatives(word: string): string[] {
        const alternatives: { [key: string]: string[] } = {
            'very': ['extremely', 'remarkably', 'exceptionally', 'considerably'],
            'really': ['genuinely', 'truly', 'significantly', 'substantially'],
            'quite': ['considerably', 'substantially', 'notably', 'remarkably'],
            'pretty': ['rather', 'fairly', 'moderately', 'somewhat']
        };

        return alternatives[word.toLowerCase()] || ['more specific language'];
    }

    private suggestSentenceBreak(sentence: string): string {
        const midpoint = Math.floor(sentence.length / 2);
        const breakPoint = sentence.indexOf(' ', midpoint);
        if (breakPoint !== -1) {
            return sentence.substring(0, breakPoint) + '. ' + sentence.substring(breakPoint + 1);
        }
        return sentence;
    }

    private isPassiveVoice(sentence: string): boolean {
        const passiveIndicators = /\b(was|were|is|are|been|being)\s+\w+ed\b/i;
        return passiveIndicators.test(sentence);
    }

    private convertToActiveVoice(sentence: string): string {
        // Simple passive to active conversion (would be more sophisticated in practice)
        return sentence.replace(/was (\w+ed) by/g, '$1').replace(/were (\w+ed) by/g, '$1');
    }

    private isWeakTopicSentence(sentence: string): boolean {
        const weakPatterns = /^(I am|My name is|This essay is about|I want to write about|I will discuss)/i;
        return weakPatterns.test(sentence.trim());
    }

    private suggestBetterHook(sentence: string): string {
        return 'Consider starting with a compelling scene, question, or surprising fact that draws the reader in immediately.';
    }

    private hasTransition(sentence: string): boolean {
        const transitions = /^(However|Furthermore|Moreover|Additionally|In addition|Nevertheless|Therefore|Thus|Consequently)/i;
        return transitions.test(sentence.trim());
    }

    private suggestTransition(sentence: string): string {
        const transitions = ['Furthermore, ', 'Additionally, ', 'Moreover, ', 'In addition, '];
        const randomTransition = transitions[Math.floor(Math.random() * transitions.length)];
        return randomTransition + sentence.charAt(0).toLowerCase() + sentence.slice(1);
    }

    private isWeakConclusion(conclusion: string): boolean {
        const weakPatterns = /^(In conclusion|In summary|To conclude|Finally|To sum up)/i;
        return weakPatterns.test(conclusion.trim()) || conclusion.length < 100;
    }
}

export default new InlineCommentGenerator();