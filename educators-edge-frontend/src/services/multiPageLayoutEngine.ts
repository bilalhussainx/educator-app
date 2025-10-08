// Multi-page Resume Layout Engine
export interface PageContent {
    pageNumber: number;
    sections: {
        title: string;
        content: string;
        isPartial?: boolean;
        continuesFrom?: number;
        continuesTo?: number;
    }[];
    estimatedHeight: number;
}

export interface MultiPageLayout {
    pages: PageContent[];
    totalPages: number;
    pageBreakPoints: number[];
}

export class MultiPageLayoutEngine {
    private static readonly PAGE_HEIGHT = 11; // inches
    private static readonly PAGE_WIDTH = 8.5; // inches
    private static readonly MARGIN = 0.75; // inches
    private static readonly USABLE_HEIGHT = 9.5; // inches (11 - 1.5 for margins)
    private static readonly LINES_PER_INCH = 6; // Approximate lines per inch
    private static readonly MAX_LINES_PER_PAGE = 57; // 9.5 * 6

    static calculateMultiPageLayout(
        sections: { title: string; content: string }[],
        templateStyle: string = 'modern'
    ): MultiPageLayout {
        console.log('📄 Multi-page Engine: Calculating layout for', sections.length, 'sections');

        const pages: PageContent[] = [];
        let currentPage: PageContent = {
            pageNumber: 1,
            sections: [],
            estimatedHeight: 0
        };

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            const sectionHeight = this.estimateSectionHeight(section, templateStyle);

            // Check if section fits on current page
            if (currentPage.estimatedHeight + sectionHeight <= this.MAX_LINES_PER_PAGE) {
                // Section fits completely
                currentPage.sections.push({
                    title: section.title,
                    content: section.content
                });
                currentPage.estimatedHeight += sectionHeight;
            } else {
                // Section doesn't fit, need to split or move to next page
                const remainingSpace = this.MAX_LINES_PER_PAGE - currentPage.estimatedHeight;

                if (remainingSpace > 10 && this.canSplitSection(section)) {
                    // Split section across pages
                    const splitResult = this.splitSectionContent(section, remainingSpace, templateStyle);

                    // Add first part to current page
                    currentPage.sections.push({
                        title: section.title,
                        content: splitResult.firstPart,
                        isPartial: true,
                        continuesTo: currentPage.pageNumber + 1
                    });
                    currentPage.estimatedHeight = this.MAX_LINES_PER_PAGE;

                    // Start new page with continuation
                    pages.push(currentPage);
                    currentPage = {
                        pageNumber: currentPage.pageNumber + 1,
                        sections: [{
                            title: `${section.title} (continued)`,
                            content: splitResult.secondPart,
                            isPartial: true,
                            continuesFrom: currentPage.pageNumber
                        }],
                        estimatedHeight: this.estimateContentHeight(splitResult.secondPart, templateStyle)
                    };
                } else {
                    // Move entire section to next page
                    pages.push(currentPage);
                    currentPage = {
                        pageNumber: currentPage.pageNumber + 1,
                        sections: [{
                            title: section.title,
                            content: section.content
                        }],
                        estimatedHeight: sectionHeight
                    };
                }
            }
        }

        // Add final page
        if (currentPage.sections.length > 0) {
            pages.push(currentPage);
        }

        const layout: MultiPageLayout = {
            pages,
            totalPages: pages.length,
            pageBreakPoints: pages.map(p => p.pageNumber - 1)
        };

        console.log(`✅ Multi-page Engine: Generated ${layout.totalPages} pages`);
        return layout;
    }

    static generateMultiPageHTML(
        layout: MultiPageLayout,
        templateStyle: string = 'modern',
        colors: any,
        parsedResume: any
    ): string {
        const pages = layout.pages.map(page => this.generatePageHTML(page, templateStyle, colors, parsedResume));

        return `
            <div class="resume-container multi-page">
                ${pages.join('')}
            </div>
        `;
    }

    private static generatePageHTML(
        page: PageContent,
        templateStyle: string,
        colors: any,
        parsedResume: any
    ): string {
        const headerContent = page.pageNumber === 1 ? this.generateFirstPageHeader(parsedResume, colors) : this.generateContinuationHeader(parsedResume, colors);

        return `
            <div class="resume-page" data-page="${page.pageNumber}">
                ${headerContent}
                <main class="page-content">
                    ${page.sections.map(section => this.generateSectionHTML(section, templateStyle, colors)).join('')}
                </main>
                ${page.pageNumber > 1 ? `<div class="page-footer">Page ${page.pageNumber}</div>` : ''}
            </div>
        `;
    }

    private static generateFirstPageHeader(parsedResume: any, colors: any): string {
        const contact = parsedResume.contact || {};

        return `
            <header class="page-header first-page-header">
                <h1 class="name">${parsedResume.name || 'Professional Resume'}</h1>
                <div class="contact-info">
                    ${contact.email ? `<span class="contact-item">📧 ${contact.email}</span>` : ''}
                    ${contact.phone ? `<span class="contact-item">📞 ${contact.phone}</span>` : ''}
                    ${contact.address ? `<span class="contact-item">📍 ${contact.address}</span>` : ''}
                    ${contact.linkedin ? `<span class="contact-item">🔗 ${contact.linkedin}</span>` : ''}
                </div>
            </header>
        `;
    }

    private static generateContinuationHeader(parsedResume: any, colors: any): string {
        return `
            <header class="page-header continuation-header">
                <h2 class="continuation-name">${parsedResume.name || 'Professional Resume'}</h2>
                <div class="page-indicator">Continued from previous page</div>
            </header>
        `;
    }

    private static generateSectionHTML(
        section: { title: string; content: string; isPartial?: boolean; continuesFrom?: number; continuesTo?: number },
        templateStyle: string,
        colors: any
    ): string {
        const continuationIndicator = section.isPartial ?
            (section.continuesTo ? `<div class="continues-indicator">→ Continues on page ${section.continuesTo}</div>` :
             section.continuesFrom ? `<div class="continues-indicator">← Continued from page ${section.continuesFrom}</div>` : '') : '';

        return `
            <section class="resume-section ${section.isPartial ? 'partial-section' : ''}">
                <h2 class="section-title">${section.title}</h2>
                <div class="section-content">${this.formatSectionContent(section.content)}</div>
                ${continuationIndicator}
            </section>
        `;
    }

    private static formatSectionContent(content: string): string {
        // Convert plain text to HTML with proper formatting
        return content
            .replace(/^[\s]*•\s+(.+)$/gm, '<li>$1</li>')
            .replace(/^[\s]*-\s+(.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>\s*)+/gs, '<ul>$&</ul>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .split('\n\n')
            .map(para => para.trim() ? `<p>${para.replace(/\n/g, '<br>')}</p>` : '')
            .join('');
    }

    private static estimateSectionHeight(section: { title: string; content: string }, templateStyle: string): number {
        // Estimate section height in lines
        let height = 2; // Section title

        // Count content lines
        const contentLines = section.content.split('\n').filter(line => line.trim());
        height += contentLines.length;

        // Add spacing
        height += 1; // Bottom margin

        return height;
    }

    private static estimateContentHeight(content: string, templateStyle: string): number {
        const lines = content.split('\n').filter(line => line.trim());
        return lines.length + 1; // Add spacing
    }

    private static canSplitSection(section: { title: string; content: string }): boolean {
        // Sections that can be split across pages
        const splittableSections = ['work experience', 'experience', 'projects', 'achievements', 'publications'];
        return splittableSections.some(type =>
            section.title.toLowerCase().includes(type));
    }

    private static splitSectionContent(
        section: { title: string; content: string },
        availableLines: number,
        templateStyle: string
    ): { firstPart: string; secondPart: string } {
        const lines = section.content.split('\n');
        const splitPoint = Math.min(availableLines - 3, Math.floor(lines.length * 0.6)); // Leave 3 lines for title

        // Find a natural break point (preferably at a bullet point or paragraph break)
        let actualSplitPoint = splitPoint;
        for (let i = splitPoint; i < Math.min(splitPoint + 5, lines.length); i++) {
            if (lines[i].trim() === '' || lines[i].trim().startsWith('•') || lines[i].trim().startsWith('-')) {
                actualSplitPoint = i;
                break;
            }
        }

        const firstPart = lines.slice(0, actualSplitPoint).join('\n');
        const secondPart = lines.slice(actualSplitPoint).join('\n');

        return { firstPart, secondPart };
    }

    static generateMultiPageCSS(): string {
        return `
            /* Multi-page specific styles */
            .multi-page {
                display: flex;
                flex-direction: column;
                gap: 0.5in;
            }

            .page-header {
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 0.5rem;
                margin-bottom: 1rem;
            }

            .first-page-header .name {
                font-size: 28px;
                font-weight: 700;
                color: #1f2937;
                margin-bottom: 0.5rem;
            }

            .first-page-header .contact-info {
                display: flex;
                flex-wrap: wrap;
                gap: 1rem;
                font-size: 14px;
                color: #6b7280;
            }

            .continuation-header {
                padding: 0.5rem 0;
                border-bottom: 1px solid #e5e7eb;
            }

            .continuation-name {
                font-size: 18px;
                font-weight: 600;
                color: #374151;
                margin: 0;
            }

            .page-indicator {
                font-size: 12px;
                color: #9ca3af;
                font-style: italic;
            }

            .continues-indicator {
                font-size: 12px;
                color: #6b7280;
                font-style: italic;
                text-align: right;
                margin-top: 0.5rem;
                padding-top: 0.5rem;
                border-top: 1px dashed #d1d5db;
            }

            .partial-section {
                position: relative;
            }

            .page-footer {
                position: absolute;
                bottom: 0.5in;
                right: 0.75in;
                font-size: 10px;
                color: #9ca3af;
            }

            /* Print optimizations */
            @media print {
                .resume-page {
                    page-break-after: always;
                    margin-bottom: 0;
                    box-shadow: none;
                }

                .resume-page:last-child {
                    page-break-after: auto;
                }
            }

            /* Screen display optimizations */
            @media screen {
                .resume-container.multi-page {
                    max-width: none;
                    width: auto;
                    padding: 1rem;
                    background: #f3f4f6;
                }

                .resume-page {
                    margin: 0 auto 2rem auto;
                }
            }
        `;
    }
}

export default MultiPageLayoutEngine;