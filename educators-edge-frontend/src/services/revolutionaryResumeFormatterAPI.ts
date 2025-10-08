/**
 * 🚀 REVOLUTIONARY RESUME FORMATTER API
 * Transforms analyzed documents into properly formatted resume templates
 */

export interface DocumentAnalysis {
    rawContent: string;
    detectedElements: {
        bullets: BulletPoint[];
        boldText: BoldElement[];
        sections: ResumeSection[];
        contactInfo: ContactInfo;
        dates: DateRange[];
    };
    confidence: {
        overall: number;
        formatting: number;
        structure: number;
    };
}

export interface BulletPoint {
    line: number;
    originalText: string;
    cleanedText: string;
    bulletType: 'unicode' | 'dash' | 'asterisk' | 'numbered';
    section: string;
}

export interface BoldElement {
    text: string;
    type: 'header' | 'emphasis' | 'section' | 'name';
    confidence: number;
}

export interface ResumeSection {
    title: string;
    content: string[];
    type: 'header' | 'summary' | 'experience' | 'education' | 'skills' | 'contact';
    bullets: BulletPoint[];
}

export interface ContactInfo {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    linkedin?: string;
}

export interface DateRange {
    text: string;
    startYear?: number;
    endYear?: number;
    isCurrent: boolean;
}

export interface FormattedResumeTemplate {
    name: string;
    html: string;
    css: string;
    improvements: string[];
    detectionStats: {
        bulletsDetected: number;
        boldElementsDetected: number;
        sectionsDetected: number;
        confidenceScore: number;
    };
}

export class RevolutionaryResumeFormatterAPI {

    /**
     * 🔍 ANALYZE DOCUMENT CONTENT
     * Actually detect bullets, bold text, and sections
     */
    analyzeDocument(content: string): DocumentAnalysis {
        console.log('🔍 ANALYZING DOCUMENT WITH REVOLUTIONARY FORMATTER API...');

        // 🔧 ENHANCED DEBUG LOGGING
        console.log('📋 CONTENT ANALYSIS DEBUG INFO:');
        console.log(`   📄 Total content length: ${content.length} characters`);
        console.log(`   📝 Content preview (first 500 chars):`, content.substring(0, 500));
        console.log(`   🔤 Content contains bullets: ${content.includes('•') ? 'YES' : 'NO'}`);
        console.log(`   🔤 Content contains dashes: ${content.includes('-') ? 'YES' : 'NO'}`);
        console.log(`   🔤 Content contains numbers: ${/\d+\./.test(content) ? 'YES' : 'NO'}`);

        const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        console.log(`   📊 Total lines after processing: ${lines.length}`);
        console.log(`   📝 Sample lines:`, lines.slice(0, 15));

        // 🔹 DETECT BULLETS - ENHANCED DETECTION
        const bullets = this.detectBullets(lines);
        console.log(`🔹 Bullets detected: ${bullets.length}`);

        // 📝 DETECT BOLD TEXT
        const boldText = this.detectBoldText(lines);
        console.log(`📝 Bold elements detected: ${boldText.length}`);

        // 📋 DETECT SECTIONS
        const sections = this.detectSections(lines, bullets);
        console.log(`📋 Sections detected: ${sections.length}`);

        // 📧 DETECT CONTACT INFO
        const contactInfo = this.detectContactInfo(lines);

        // 📅 DETECT DATES
        const dates = this.detectDates(lines);

        const confidence = {
            overall: Math.min(0.95, 0.6 + (bullets.length * 0.05) + (sections.length * 0.05)),
            formatting: bullets.length > 0 ? 0.9 : 0.3,
            structure: sections.length > 2 ? 0.9 : 0.5
        };

        console.log(`📊 Analysis confidence: ${Math.round(confidence.overall * 100)}%`);

        return {
            rawContent: content,
            detectedElements: {
                bullets,
                boldText,
                sections,
                contactInfo,
                dates
            },
            confidence
        };
    }

    /**
     * 🔹 DETECT BULLETS - ENHANCED FOR WORD DOCUMENTS
     */
    private detectBullets(lines: string[]): BulletPoint[] {
        const bullets: BulletPoint[] = [];
        let currentSection = 'UNKNOWN';

        console.log('🔍 ENHANCED BULLET DETECTION - Analyzing lines:', {
            totalLines: lines.length,
            sampleLines: lines.slice(0, 10)
        });

        lines.forEach((line, index) => {
            // Update current section
            if (this.isSectionHeader(line)) {
                currentSection = line.toUpperCase();
                return;
            }

            // 🔧 ENHANCED: Check for bullet patterns (more flexible whitespace)
            let bulletType: BulletPoint['bulletType'] | null = null;
            let cleanedText = line;

            // Unicode bullets (including those from Word documents)
            if (/^[\s]*[•▪▫◦‣⁃▸▹▪▫⦿⦾]\s*/.test(line)) {
                bulletType = 'unicode';
                cleanedText = line.replace(/^[\s]*[•▪▫◦‣⁃▸▹▪▫⦿⦾]\s*/, '').trim();
            }
            // Dash bullets (flexible spacing)
            else if (/^[\s]*[-–—]\s+/.test(line)) {
                bulletType = 'dash';
                cleanedText = line.replace(/^[\s]*[-–—]\s*/, '').trim();
            }
            // Asterisk bullets
            else if (/^[\s]*\*\s+/.test(line)) {
                bulletType = 'asterisk';
                cleanedText = line.replace(/^[\s]*\*\s*/, '').trim();
            }
            // Numbered lists
            else if (/^[\s]*\d+\.\s+/.test(line)) {
                bulletType = 'numbered';
                cleanedText = line.replace(/^[\s]*\d+\.\s*/, '').trim();
            }
            // 🔧 NEW: Word-style indented lines that should be bullets
            else if (/^[\s]{2,}[A-Za-z]/.test(line) && line.length > 10 && !this.isSectionHeader(line)) {
                // Detect indented lines that look like bullet content
                bulletType = 'unicode';
                cleanedText = line.trim();
                line = `• ${cleanedText}`; // Add bullet for consistency
            }
            // 🔧 ENHANCED: Detect experience bullets without explicit bullet chars
            else if (currentSection.includes('EXPERIENCE') || currentSection.includes('WORK')) {
                // In experience sections, lines that are descriptive and long are likely bullets
                if (line.length > 20 &&
                    !line.includes('@') &&
                    !line.includes('|') &&
                    !line.includes('–') &&
                    !line.match(/^\d{4}/) &&
                    !this.isSectionHeader(line) &&
                    !line.includes(currentSection)) {

                    // Check if this looks like an achievement/responsibility
                    const achievementWords = ['managed', 'developed', 'implemented', 'created', 'led', 'coordinated', 'organized', 'provided', 'maintained', 'utilized', 'improved', 'reduced', 'increased'];
                    const hasAchievementWord = achievementWords.some(word => line.toLowerCase().includes(word));

                    if (hasAchievementWord || line.length > 30) {
                        bulletType = 'unicode';
                        cleanedText = line.trim();
                        line = `• ${cleanedText}`;
                        console.log(`🔹 EXPERIENCE BULLET INFERRED: "${cleanedText.substring(0, 50)}..."`);
                    }
                }
            }

            if (bulletType && cleanedText.length > 3) { // Lowered threshold for better detection
                bullets.push({
                    line: index + 1,
                    originalText: line,
                    cleanedText,
                    bulletType,
                    section: currentSection
                });

                console.log(`🔹 Bullet detected: "${cleanedText.substring(0, 50)}..." (type: ${bulletType})`);
            }
        });

        console.log(`✅ Total bullets detected: ${bullets.length}`);
        return bullets;
    }

    /**
     * 📝 DETECT BOLD TEXT - ENHANCED FOR WORD DOCUMENTS
     */
    private detectBoldText(lines: string[]): BoldElement[] {
        const boldElements: BoldElement[] = [];

        console.log('📝 ENHANCED BOLD TEXT DETECTION - Analyzing content...');

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();

            // 🔧 ENHANCED: Name detection (first non-empty line)
            if (index <= 2 && trimmedLine.length < 50 && /^[A-Za-z\s.,-]+$/.test(trimmedLine) && trimmedLine.length > 5) {
                boldElements.push({
                    text: trimmedLine,
                    type: 'name',
                    confidence: 0.95
                });
                console.log(`📝 Name detected: "${trimmedLine}"`);
            }
            // 🔧 ENHANCED: Section headers (more flexible detection)
            else if (this.isSectionHeader(trimmedLine)) {
                boldElements.push({
                    text: trimmedLine,
                    type: 'section',
                    confidence: 0.9
                });

                // 🔧 NEW: Look for bold text WITHIN section headers
                const wordsInHeader = trimmedLine.split(/\s+/);
                wordsInHeader.forEach(word => {
                    if (word.length > 2 && /^[A-Z][a-z]*$/.test(word)) {
                        boldElements.push({
                            text: word,
                            type: 'header',
                            confidence: 0.8
                        });
                    }
                });

                console.log(`📝 Section header detected: "${trimmedLine}"`);
            }
            // 🔧 ENHANCED: Job titles and company names (lines near bullets)
            else if (trimmedLine.length < 100 && trimmedLine.length > 8 && !trimmedLine.includes('@') && !trimmedLine.includes('•')) {
                // Check if this looks like a job title or company
                const words = trimmedLine.split(/\s+/);
                const capitalizedWords = words.filter(word => /^[A-Z]/.test(word)).length;
                const totalWords = words.length;

                // If more than 40% of words are capitalized, it's likely a title/company
                if (totalWords > 1 && (capitalizedWords / totalWords) > 0.4) {
                    boldElements.push({
                        text: trimmedLine,
                        type: 'emphasis',
                        confidence: 0.75
                    });
                    console.log(`📝 Emphasis text detected: "${trimmedLine}"`);
                }

                // 🔧 NEW: Detect individual bold words within lines
                words.forEach(word => {
                    // Look for words that should be bold (ALL CAPS, Title Case, etc.)
                    if (word.length > 2) {
                        if (/^[A-Z]{2,}$/.test(word)) {
                            // ALL CAPS words
                            boldElements.push({
                                text: word,
                                type: 'emphasis',
                                confidence: 0.8
                            });
                        } else if (/^[A-Z][a-z]+$/.test(word) && ['Manager', 'Director', 'Engineer', 'Developer', 'Analyst', 'Specialist', 'Coordinator', 'Lead', 'Senior', 'Junior'].includes(word)) {
                            // Job title keywords
                            boldElements.push({
                                text: word,
                                type: 'emphasis',
                                confidence: 0.7
                            });
                        }
                    }
                });
            }
            // 🔧 NEW: Email and contact info (should be emphasized)
            else if (trimmedLine.includes('@') || /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(trimmedLine)) {
                boldElements.push({
                    text: trimmedLine,
                    type: 'emphasis',
                    confidence: 0.85
                });
                console.log(`📝 Contact info detected: "${trimmedLine}"`);
            }
        });

        console.log(`✅ Total bold elements detected: ${boldElements.length}`);
        return boldElements;
    }

    /**
     * 📋 DETECT SECTIONS
     */
    private detectSections(lines: string[], bullets: BulletPoint[]): ResumeSection[] {
        const sections: ResumeSection[] = [];
        let currentSection: ResumeSection | null = null;

        lines.forEach((line, index) => {
            if (this.isSectionHeader(line)) {
                // Save previous section
                if (currentSection && currentSection.content.length > 0) {
                    sections.push(currentSection);
                }

                // Start new section
                currentSection = {
                    title: line,
                    content: [],
                    type: this.classifySection(line),
                    bullets: []
                };
            } else if (currentSection && line.length > 0) {
                currentSection.content.push(line);

                // Add bullets to this section
                const sectionBullets = bullets.filter(b => b.section === currentSection!.title.toUpperCase());
                currentSection.bullets = sectionBullets;
            }
        });

        // Add final section
        if (currentSection && currentSection.content.length > 0) {
            sections.push(currentSection);
        }

        return sections;
    }

    /**
     * 🎯 IS SECTION HEADER
     */
    private isSectionHeader(line: string): boolean {
        return line === line.toUpperCase() &&
               line.length >= 3 &&
               line.length <= 30 &&
               /^[A-Z\s&-]+$/.test(line) &&
               !line.includes('@') &&
               !line.includes('(') &&
               !line.includes('•');
    }

    /**
     * 🏷️ CLASSIFY SECTION TYPE
     */
    private classifySection(title: string): ResumeSection['type'] {
        const lower = title.toLowerCase();
        if (lower.includes('experience') || lower.includes('work') || lower.includes('employment')) return 'experience';
        if (lower.includes('education') || lower.includes('school') || lower.includes('university')) return 'education';
        if (lower.includes('skill') || lower.includes('technical') || lower.includes('competenc')) return 'skills';
        if (lower.includes('summary') || lower.includes('profile') || lower.includes('objective')) return 'summary';
        if (lower.includes('contact') || lower.includes('info')) return 'contact';
        return 'header';
    }

    /**
     * 📧 DETECT CONTACT INFO
     */
    private detectContactInfo(lines: string[]): ContactInfo {
        const contactInfo: ContactInfo = {};

        const allText = lines.join(' ');

        // Email
        const emailMatch = allText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) contactInfo.email = emailMatch[0];

        // Phone
        const phoneMatch = allText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        if (phoneMatch) contactInfo.phone = phoneMatch[0];

        // Name (first line typically)
        if (lines[0] && lines[0].length < 50 && /^[A-Za-z\s]+$/.test(lines[0])) {
            contactInfo.name = lines[0];
        }

        // LinkedIn
        const linkedinMatch = allText.match(/linkedin\.com\/in\/[a-zA-Z0-9-]+/);
        if (linkedinMatch) contactInfo.linkedin = linkedinMatch[0];

        return contactInfo;
    }

    /**
     * 💼 FORMAT WORK EXPERIENCE SECTION WITH JOB TITLES
     * Enhanced to properly format job titles, companies, dates, and bullets
     */
    private formatWorkExperienceSection(section: ResumeSection, allBullets: BulletPoint[]): string {
        let html = '';
        const content = section.content;

        // More inclusive bullet filtering - if strict filtering returns nothing, use all bullets
        let sectionBullets = allBullets.filter(b =>
            b.section.includes('EXPERIENCE') ||
            b.section.includes('WORK') ||
            b.section.includes('Employment') ||
            b.section.includes('Career')
        );

        // Fallback: if no bullets found with section filtering, use all bullets
        if (sectionBullets.length === 0) {
            sectionBullets = allBullets;
            console.log('🔄 Using all bullets as fallback for work experience section');
        }

        console.log('💼 Formatting work experience section...');
        console.log(`   Content lines: ${content.length}`);
        console.log(`   Section bullets: ${sectionBullets.length}`);

        let currentJobHtml = '';
        let pendingBullets: string[] = [];
        let jobTitleDetected = false;

        for (let i = 0; i < content.length; i++) {
            const line = content[i].trim();

            // Skip empty lines
            if (!line) continue;

            // Skip lines that are just bullets (they'll be handled separately)
            if (/^[•▪▫◦‣⁃▸▹▪▫⦿⦾\-–—*]\s/.test(line)) continue;

            // More inclusive job title detection - look for multiple patterns
            const hasJobIndicators = /\b(facilitator|administrator|specialist|manager|director|engineer|developer|analyst|coordinator|lead|senior|junior|assistant|support|office|program|curriculum|administrative|supervisor|representative|associate|executive|technician|officer|consultant)\b/i.test(line);
            const hasCompanyIndicators = line.includes('–') || line.includes('|') || line.includes(',') || line.includes(' - ');
            const hasCapitalizedWords = /[A-Z][a-z]+/.test(line);
            const isLikelyJobTitle = hasJobIndicators || (hasCompanyIndicators && hasCapitalizedWords && line.length < 150);

            // Detect date line (lines with years, locations, or date patterns)
            const hasDatePattern = /\b(20\d{2}|19\d{2})\b/.test(line) || /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(line);
            const hasLocationPattern = /\b[A-Z][a-z]+,\s*[A-Z]{2}\b/.test(line) || line.includes('USA') || line.includes('Canada');
            const isLikelyDateLine = hasDatePattern || hasLocationPattern;

            if (isLikelyJobTitle && !isLikelyDateLine) {
                // This is a job title line
                if (currentJobHtml && pendingBullets.length > 0) {
                    // Finish previous job entry
                    currentJobHtml += `<ul class="bullet-list">`;
                    pendingBullets.forEach(bullet => {
                        currentJobHtml += `<li class="bullet-item">${bullet}</li>`;
                    });
                    currentJobHtml += `</ul></div>`;
                    html += currentJobHtml;
                }

                // Start new job entry
                currentJobHtml = `<div class="job-entry">
                    <h3 class="job-title">${line}</h3>`;
                pendingBullets = [];
                jobTitleDetected = true;

                console.log(`   📋 Job title detected: "${line}"`);
            }
            else if (isLikelyDateLine && jobTitleDetected) {
                // This is a date/location line
                currentJobHtml += `<div class="job-details">${line}</div>`;
                console.log(`   📅 Job details detected: "${line}"`);
            }
            else if (line.length > 20) {
                // This might be a bullet point without explicit bullet character
                const bulletText = sectionBullets.find(b => b.cleanedText.includes(line.substring(0, 30)));
                if (bulletText) {
                    pendingBullets.push(bulletText.cleanedText);
                    console.log(`   🔹 Bullet matched: "${bulletText.cleanedText.substring(0, 50)}..."`);
                } else {
                    // Check if this line matches content from detected bullets
                    const matchingBullet = sectionBullets.find(b =>
                        b.cleanedText.toLowerCase().includes(line.toLowerCase()) ||
                        line.toLowerCase().includes(b.cleanedText.toLowerCase())
                    );
                    if (matchingBullet) {
                        pendingBullets.push(matchingBullet.cleanedText);
                        console.log(`   🔹 Bullet content matched: "${matchingBullet.cleanedText.substring(0, 50)}..."`);
                    } else {
                        // Treat as potential bullet content
                        pendingBullets.push(line);
                        console.log(`   🔹 Line treated as bullet: "${line.substring(0, 50)}..."`);
                    }
                }
            }
        }

        // Handle remaining content
        if (currentJobHtml && pendingBullets.length > 0) {
            currentJobHtml += `<ul class="bullet-list">`;
            pendingBullets.forEach(bullet => {
                currentJobHtml += `<li class="bullet-item">${bullet}</li>`;
            });
            currentJobHtml += `</ul></div>`;
            html += currentJobHtml;
        }

        // PRIORITY FALLBACK: Always show ALL bullets - this ensures authentic content display
        if (!html || html.length < 100) {
            console.log(`   🔄 PRIORITY FALLBACK: Ensuring ALL ${sectionBullets.length} bullets are displayed`);
            html = `<div class="work-experience-section">
                <h3 class="section-header">Work Experience</h3>`;

            // Show all content lines AND all bullets to ensure nothing is missed
            if (content.length > 0) {
                html += `<div class="full-content-display">`;
                content.forEach(line => {
                    const trimmedLine = line.trim();
                    if (trimmedLine && trimmedLine.length > 5) {
                        // Format as job title if it looks like one
                        if (trimmedLine.includes('–') || trimmedLine.includes('|') ||
                            /\b(facilitator|administrator|specialist|manager|director|assistant|support|office)\b/i.test(trimmedLine)) {
                            html += `<div class="job-title">${trimmedLine}</div>`;
                        } else {
                            html += `<div class="content-line">${trimmedLine}</div>`;
                        }
                    }
                });
                html += `</div>`;
            }

            // ALSO show all detected bullets to ensure nothing is lost
            if (sectionBullets.length > 0) {
                html += `<div class="all-bullets-display">
                    <h4>Detected Achievements & Responsibilities:</h4>
                    <ul class="bullet-list">`;
                sectionBullets.forEach(bullet => {
                    html += `<li class="bullet-item">${bullet.cleanedText}</li>`;
                });
                html += `</ul></div>`;
            }

            html += `</div>`;
        }

        // Additional fallback: If still no HTML and we have content, create comprehensive structure
        if (!html && content.length > 0) {
            console.log(`   🔄 Final fallback: Creating comprehensive structure from ${content.length} content lines`);
            html = `<div class="work-experience-section">
                <h3 class="section-header">Work Experience</h3>
                <div class="experience-content">`;

            // Identify and format job titles and content more intelligently
            content.forEach((line, index) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return;

                // Check if this looks like a job title (contains job keywords or company indicators)
                const looksLikeJobTitle = /\b(facilitator|administrator|specialist|manager|director|engineer|developer|analyst|coordinator|lead|senior|junior|assistant|support|office|program|curriculum|administrative|supervisor|representative|associate|executive|technician|officer|consultant)\b/i.test(trimmedLine) ||
                    (trimmedLine.includes('–') || trimmedLine.includes('|') || trimmedLine.includes(',') || trimmedLine.includes(' - '));

                // Check if this looks like a bullet point or task description
                const looksLikeBullet = trimmedLine.length > 30 && (
                    trimmedLine.startsWith('•') ||
                    trimmedLine.startsWith('-') ||
                    trimmedLine.startsWith('*') ||
                    /^[A-Z][a-z]+(ed|ing|d)\b/.test(trimmedLine) // Starts with action word
                );

                if (looksLikeJobTitle) {
                    html += `<div class="job-entry">
                        <h4 class="job-title">${trimmedLine}</h4>`;
                } else if (looksLikeBullet) {
                    html += `<li class="bullet-item">${trimmedLine}</li>`;
                } else {
                    html += `<p class="experience-line">${trimmedLine}</p>`;
                }
            });

            html += `</div></div>`;
        }

        console.log(`   ✅ Work experience formatted: ${html.length} characters generated`);
        return html;
    }

    /**
     * 📅 DETECT DATES
     */
    private detectDates(lines: string[]): DateRange[] {
        const dates: DateRange[] = [];
        const datePattern = /\b(19|20)\d{2}\b/g;

        lines.forEach(line => {
            const yearMatches = line.match(datePattern);
            if (yearMatches) {
                dates.push({
                    text: line,
                    startYear: parseInt(yearMatches[0]),
                    endYear: yearMatches[1] ? parseInt(yearMatches[1]) : undefined,
                    isCurrent: /present|current|now/i.test(line)
                });
            }
        });

        return dates;
    }

    /**
     * 🎨 FORMAT INTO RESUME TEMPLATE
     * Transform analysis into actual formatted resume
     */
    formatToResumeTemplate(analysis: DocumentAnalysis, templateStyle: 'professional' | 'modern' | 'creative' = 'professional'): FormattedResumeTemplate {
        console.log('🎨 FORMATTING TO RESUME TEMPLATE...');

        const { detectedElements, confidence } = analysis;
        let html = '';
        let improvements: string[] = [];

        // Generate CSS based on style
        const css = this.generateCSS(templateStyle);

        // Helper function to apply bold formatting to detected bold elements
        const applyBoldFormatting = (text: string): string => {
            let formattedText = text;
            if (detectedElements.boldElements && detectedElements.boldElements.length > 0) {
                detectedElements.boldElements.forEach(boldElement => {
                    if (boldElement.text && text.includes(boldElement.text)) {
                        // Replace the text with bold wrapped version
                        formattedText = formattedText.replace(
                            new RegExp(boldElement.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                            `<strong class="bold-text">${boldElement.text}</strong>`
                        );
                    }
                });
            }
            return formattedText;
        };

        // Format header with contact info
        if (detectedElements.contactInfo.name) {
            html += `<div class="resume-header">
                <h1 class="name">${detectedElements.contactInfo.name}</h1>`;

            const contactParts = [];
            if (detectedElements.contactInfo.email) contactParts.push(detectedElements.contactInfo.email);
            if (detectedElements.contactInfo.phone) contactParts.push(detectedElements.contactInfo.phone);
            if (detectedElements.contactInfo.linkedin) contactParts.push(detectedElements.contactInfo.linkedin);

            if (contactParts.length > 0) {
                html += `<div class="contact-info">${contactParts.join(' | ')}</div>`;
            }
            html += `</div>`;
            improvements.push(`✅ Contact information formatted: ${contactParts.length} elements`);
        }

        // Format sections with enhanced job entry detection
        detectedElements.sections.forEach(section => {
            html += `<div class="resume-section">
                <h2 class="section-title">${section.title}</h2>
                <div class="section-content">`;

            // Enhanced formatting for WORK EXPERIENCE section
            if (section.type === 'experience' || section.title.toUpperCase().includes('EXPERIENCE') || section.title.toUpperCase().includes('WORK')) {
                html += this.formatWorkExperienceSection(section, detectedElements.bullets);
                improvements.push(`💼 Work experience formatted with job titles and ${section.bullets.length} bullets`);
            }
            // Standard section formatting for other sections
            else if (section.bullets.length > 0) {
                html += `<ul class="bullet-list">`;
                section.bullets.forEach(bullet => {
                    html += `<li class="bullet-item">${bullet.cleanedText}</li>`;
                });
                html += `</ul>`;
                improvements.push(`🔹 ${section.bullets.length} bullets formatted in ${section.title}`);
            } else {
                section.content.forEach(item => {
                    if (!item.includes('•') && !item.includes('-') && item.length > 10) {
                        html += `<p class="section-text">${item}</p>`;
                    }
                });
            }

            html += `</div></div>`;
        });

        // Bold text emphasis
        detectedElements.boldText.forEach(bold => {
            const regex = new RegExp(`\\b${bold.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            html = html.replace(regex, `<strong class="bold-emphasis">${bold.text}</strong>`);
        });

        if (detectedElements.boldText.length > 0) {
            improvements.push(`📝 ${detectedElements.boldText.length} bold elements emphasized`);
        }

        const detectionStats = {
            bulletsDetected: detectedElements.bullets.length,
            boldElementsDetected: detectedElements.boldText.length,
            sectionsDetected: detectedElements.sections.length,
            confidenceScore: Math.round(confidence.overall * 100)
        };

        return {
            name: `Revolutionary ${templateStyle.charAt(0).toUpperCase() + templateStyle.slice(1)} Template`,
            html: `<div class="revolutionary-resume">${html}</div>`,
            css,
            improvements,
            detectionStats
        };
    }

    /**
     * 🎨 GENERATE CSS
     */
    private generateCSS(style: string): string {
        const baseCSS = `
        .revolutionary-resume {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            line-height: 1.6;
        }

        .resume-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #2c3e50;
        }

        .name {
            font-size: 32px;
            font-weight: bold;
            color: #2c3e50;
            margin: 0 0 10px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .contact-info {
            font-size: 16px;
            color: #3498db;
            font-weight: 500;
        }

        .resume-section {
            margin-bottom: 25px;
        }

        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
            text-transform: uppercase;
            margin: 20px 0 15px 0;
            padding-bottom: 5px;
            border-bottom: 1px solid #3498db;
            letter-spacing: 1px;
        }

        .bullet-list {
            margin: 15px 0;
            padding-left: 0;
            list-style: none;
        }

        .bullet-item {
            position: relative;
            margin: 12px 0;
            padding-left: 25px;
            color: #2c3e50;
            font-size: 15px;
            line-height: 1.6;
        }

        .bullet-item:before {
            content: "•";
            position: absolute;
            left: 0;
            color: #3498db;
            font-weight: bold;
            font-size: 18px;
        }

        .section-text {
            margin: 10px 0;
            color: #34495e;
            font-size: 15px;
        }

        .bold-emphasis {
            font-weight: bold;
            color: #2c3e50;
        }

        /* Job Entry Styles */
        .job-entry {
            margin-bottom: 25px;
            padding: 15px 0;
            border-left: 3px solid #3498db;
            padding-left: 15px;
        }

        .job-title {
            font-size: 17px;
            font-weight: bold;
            color: #2c3e50;
            margin: 0 0 8px 0;
            line-height: 1.4;
        }

        .bold-text {
            font-weight: bold;
            color: #2c3e50;
        }

        .experience-line {
            margin: 8px 0;
            line-height: 1.5;
            color: #34495e;
        }

        .content-line {
            margin: 6px 0;
            line-height: 1.5;
            color: #2c3e50;
            padding-left: 10px;
        }

        .full-content-display {
            margin: 15px 0;
            padding: 10px;
            background-color: #f8f9fa;
            border-left: 3px solid #3498db;
        }

        .all-bullets-display {
            margin: 20px 0;
            padding: 15px;
            background-color: #ffffff;
            border: 1px solid #e1e8ed;
            border-radius: 5px;
        }

        .all-bullets-display h4 {
            color: #2c3e50;
            font-size: 16px;
            margin: 0 0 10px 0;
            font-weight: bold;
        }

        .job-details {
            font-size: 14px;
            color: #7f8c8d;
            margin: 5px 0 15px 0;
            font-style: italic;
            font-weight: 500;
        }

        .job-entry .bullet-list {
            margin-top: 10px;
            margin-bottom: 0;
        }

        .job-entry .bullet-item {
            font-size: 14px;
            margin: 8px 0;
            color: #2c3e50;
        }
        `;

        return baseCSS;
    }

    /**
     * 🚀 PROCESS DOCUMENT - MAIN API METHOD
     */
    async processDocument(content: string): Promise<{
        analysis: DocumentAnalysis;
        templates: FormattedResumeTemplate[];
        summary: {
            bulletsFound: number;
            boldElementsFound: number;
            sectionsFound: number;
            confidenceScore: number;
            improvements: string[];
        };
    }> {
        console.log('🚀 REVOLUTIONARY RESUME FORMATTER API - PROCESSING DOCUMENT...');

        // 1. Analyze the document
        const analysis = this.analyzeDocument(content);

        // 2. Generate multiple template variations
        const templates = [
            this.formatToResumeTemplate(analysis, 'professional'),
            this.formatToResumeTemplate(analysis, 'modern'),
            this.formatToResumeTemplate(analysis, 'creative')
        ];

        // 3. Compile summary
        const allImprovements = templates.flatMap(t => t.improvements);
        const summary = {
            bulletsFound: analysis.detectedElements.bullets.length,
            boldElementsFound: analysis.detectedElements.boldText.length,
            sectionsFound: analysis.detectedElements.sections.length,
            confidenceScore: Math.round(analysis.confidence.overall * 100),
            improvements: [...new Set(allImprovements)]
        };

        console.log('✅ DOCUMENT PROCESSING COMPLETE:');
        console.log(`   🔹 Bullets: ${summary.bulletsFound}`);
        console.log(`   📝 Bold elements: ${summary.boldElementsFound}`);
        console.log(`   📋 Sections: ${summary.sectionsFound}`);
        console.log(`   🎯 Confidence: ${summary.confidenceScore}%`);

        return {
            analysis,
            templates,
            summary
        };
    }
}

// Create singleton instance
const revolutionaryResumeFormatterAPI = new RevolutionaryResumeFormatterAPI();
export default revolutionaryResumeFormatterAPI;