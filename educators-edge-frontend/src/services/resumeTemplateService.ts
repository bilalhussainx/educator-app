interface ResumeTemplate {
    id: string;
    name: string;
    description: string;
    preview: string;
    style: 'modern' | 'classic' | 'creative' | 'minimalist';
    htmlTemplate: string;
    cssStyles: string;
}

interface ParsedResumeData {
    name?: string;
    contact?: {
        email?: string;
        phone?: string;
        address?: string;
        linkedin?: string;
        website?: string;
    };
    summary?: string;
    experience?: Array<{
        title: string;
        company: string;
        location?: string;
        dates: string;
        description: string[];
    }>;
    education?: Array<{
        degree: string;
        institution: string;
        location?: string;
        dates: string;
        details?: string[];
    }>;
    skills?: {
        technical?: string[];
        languages?: string[];
        other?: string[];
    };
    projects?: Array<{
        name: string;
        description: string;
        technologies?: string[];
        link?: string;
    }>;
}

class ResumeTemplateService {
    private templates: ResumeTemplate[] = [
        {
            id: 'modern-professional',
            name: 'Modern Professional',
            description: 'Clean, modern design with emphasis on readability',
            preview: '📄 Modern layout with clear sections and professional styling',
            style: 'modern',
            htmlTemplate: `
                <div class="resume-modern">
                    <header class="resume-header">
                        <h1 class="name">{{name}}</h1>
                        <div class="contact-info">
                            {{#contact.address}}<span class="contact-item">📍 {{contact.address}}</span>{{/contact.address}}
                            {{#contact.phone}}<span class="contact-item">📞 {{contact.phone}}</span>{{/contact.phone}}
                            {{#contact.email}}<span class="contact-item">📧 <a href="mailto:{{contact.email}}">{{contact.email}}</a></span>{{/contact.email}}
                        </div>
                    </header>

                    {{#summary}}
                    <section class="resume-section">
                        <h2 class="section-title">Professional Summary</h2>
                        <p class="summary-text">{{summary}}</p>
                    </section>
                    {{/summary}}

                    {{#skills.technical}}
                    <section class="resume-section">
                        <h2 class="section-title">Technical Skills</h2>
                        <div class="skills-list">
                            {{#skills.technical}}
                            <span class="skill-item">{{.}}</span>
                            {{/skills.technical}}
                        </div>
                    </section>
                    {{/skills.technical}}

                    {{#experience}}
                    <section class="resume-section">
                        <h2 class="section-title">Professional Experience</h2>
                        {{#experience}}
                        <div class="experience-item">
                            <div class="experience-header">
                                <h3 class="job-title">{{title}}</h3>
                                <span class="company">{{company}}</span>
                                <span class="dates">{{dates}}</span>
                            </div>
                            <ul class="experience-description">
                                {{#description}}
                                <li>{{.}}</li>
                                {{/description}}
                            </ul>
                        </div>
                        {{/experience}}
                    </section>
                    {{/experience}}

                    {{#education}}
                    <section class="resume-section">
                        <h2 class="section-title">Education</h2>
                        {{#education}}
                        <div class="education-item">
                            <h3 class="degree">{{degree}}</h3>
                            <span class="institution">{{institution}}</span>
                            <span class="dates">{{dates}}</span>
                        </div>
                        {{/education}}
                    </section>
                    {{/education}}

                    {{#projects}}
                    <section class="resume-section">
                        <h2 class="section-title">Projects</h2>
                        {{#projects}}
                        <div class="project-item">
                            <h3 class="project-name">{{name}}</h3>
                            <p class="project-description">{{description}}</p>
                        </div>
                        {{/projects}}
                    </section>
                    {{/projects}}
                </div>
            `,
            cssStyles: `
                .resume-modern {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 2rem;
                    line-height: 1.6;
                    color: #333;
                    background: white;
                }

                .resume-header {
                    text-align: center;
                    border-bottom: 3px solid #2563eb;
                    padding-bottom: 1.5rem;
                    margin-bottom: 2rem;
                }

                .name {
                    font-size: 2.5rem;
                    font-weight: 700;
                    margin: 0 0 0.5rem 0;
                    color: #1f2937;
                }

                .contact-info {
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                    font-size: 0.9rem;
                }

                .contact-item {
                    color: #6b7280;
                }

                .contact-item a {
                    color: #2563eb;
                    text-decoration: none;
                }

                .resume-section {
                    margin-bottom: 2rem;
                }

                .section-title {
                    font-size: 1.4rem;
                    font-weight: 600;
                    color: #1f2937;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 0.5rem;
                    margin-bottom: 1rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .summary-text {
                    font-size: 1rem;
                    color: #4b5563;
                    margin: 0;
                }

                .skills-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .skill-item {
                    background: #f3f4f6;
                    padding: 0.25rem 0.75rem;
                    border-radius: 1rem;
                    font-size: 0.9rem;
                    color: #374151;
                }

                .experience-item, .education-item, .project-item {
                    margin-bottom: 1.5rem;
                }

                .experience-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 0.5rem;
                    flex-wrap: wrap;
                }

                .job-title {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #1f2937;
                    margin: 0;
                }

                .company {
                    font-weight: 500;
                    color: #2563eb;
                }

                .dates {
                    color: #6b7280;
                    font-size: 0.9rem;
                }

                .experience-description {
                    margin: 0.5rem 0 0 1rem;
                    padding: 0;
                }

                .experience-description li {
                    margin-bottom: 0.25rem;
                    color: #4b5563;
                }

                .degree, .project-name {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #1f2937;
                    margin: 0 0 0.25rem 0;
                }

                .institution {
                    color: #2563eb;
                    font-weight: 500;
                }

                .project-description {
                    color: #4b5563;
                    margin: 0.5rem 0;
                }

                @media print {
                    .resume-modern {
                        padding: 1rem;
                        box-shadow: none;
                    }
                }
            `
        },
        {
            id: 'classic-elegant',
            name: 'Classic Elegant',
            description: 'Traditional format with elegant typography',
            preview: '📜 Classic layout with serif fonts and traditional spacing',
            style: 'classic',
            htmlTemplate: `
                <div class="resume-classic">
                    <header class="resume-header">
                        <h1 class="name">{{name}}</h1>
                        <div class="contact-info">
                            {{#contact.address}}<div>{{contact.address}}</div>{{/contact.address}}
                            {{#contact.phone}}<div>{{contact.phone}}</div>{{/contact.phone}}
                            {{#contact.email}}<div><a href="mailto:{{contact.email}}">{{contact.email}}</a></div>{{/contact.email}}
                        </div>
                    </header>

                    {{#summary}}
                    <section class="resume-section">
                        <h2 class="section-title">SUMMARY</h2>
                        <p class="summary-text">{{summary}}</p>
                    </section>
                    {{/summary}}

                    {{#experience}}
                    <section class="resume-section">
                        <h2 class="section-title">EXPERIENCE</h2>
                        {{#experience}}
                        <div class="experience-item">
                            <div class="experience-header">
                                <div class="left-column">
                                    <h3 class="job-title">{{title}}</h3>
                                    <div class="company">{{company}}</div>
                                </div>
                                <div class="dates">{{dates}}</div>
                            </div>
                            <ul class="experience-description">
                                {{#description}}
                                <li>{{.}}</li>
                                {{/description}}
                            </ul>
                        </div>
                        {{/experience}}
                    </section>
                    {{/experience}}

                    {{#skills.technical}}
                    <section class="resume-section">
                        <h2 class="section-title">TECHNICAL SKILLS</h2>
                        <p class="skills-text">{{#skills.technical}}{{.}}{{#unless @last}}, {{/unless}}{{/skills.technical}}</p>
                    </section>
                    {{/skills.technical}}

                    {{#education}}
                    <section class="resume-section">
                        <h2 class="section-title">EDUCATION</h2>
                        {{#education}}
                        <div class="education-item">
                            <div class="education-header">
                                <div class="left-column">
                                    <h3 class="degree">{{degree}}</h3>
                                    <div class="institution">{{institution}}</div>
                                </div>
                                <div class="dates">{{dates}}</div>
                            </div>
                        </div>
                        {{/education}}
                    </section>
                    {{/education}}
                </div>
            `,
            cssStyles: `
                .resume-classic {
                    font-family: 'Times New Roman', serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 2rem;
                    line-height: 1.5;
                    color: #000;
                    background: white;
                }

                .resume-header {
                    text-align: center;
                    border-bottom: 1px solid #000;
                    padding-bottom: 1rem;
                    margin-bottom: 1.5rem;
                }

                .name {
                    font-size: 2rem;
                    font-weight: normal;
                    margin: 0 0 0.5rem 0;
                    letter-spacing: 1px;
                }

                .contact-info {
                    font-size: 0.9rem;
                    line-height: 1.4;
                }

                .contact-info a {
                    color: #000;
                    text-decoration: underline;
                }

                .resume-section {
                    margin-bottom: 1.5rem;
                }

                .section-title {
                    font-size: 1rem;
                    font-weight: bold;
                    color: #000;
                    border-bottom: 1px solid #000;
                    padding-bottom: 0.25rem;
                    margin-bottom: 0.75rem;
                    letter-spacing: 1px;
                }

                .summary-text, .skills-text {
                    margin: 0;
                    text-align: justify;
                }

                .experience-item, .education-item {
                    margin-bottom: 1rem;
                }

                .experience-header, .education-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 0.5rem;
                }

                .left-column {
                    flex: 1;
                }

                .job-title, .degree {
                    font-size: 1rem;
                    font-weight: bold;
                    margin: 0;
                }

                .company, .institution {
                    font-style: italic;
                    margin-top: 0.25rem;
                }

                .dates {
                    font-size: 0.9rem;
                    white-space: nowrap;
                }

                .experience-description {
                    margin: 0.5rem 0 0 1rem;
                    padding: 0;
                }

                .experience-description li {
                    margin-bottom: 0.25rem;
                }
            `
        }
    ];

    getTemplates(): ResumeTemplate[] {
        return this.templates;
    }

    getTemplate(id: string): ResumeTemplate | undefined {
        return this.templates.find(template => template.id === id);
    }

    parseResumeContent(content: string): ParsedResumeData {
        const data: ParsedResumeData = {};

        // Extract name (usually first line)
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
            const firstLine = lines[0].trim();
            if (firstLine.length < 50 && !firstLine.includes('@') && !firstLine.includes('|')) {
                data.name = firstLine.replace(/[=*_]/g, '').trim();
            }
        }

        // Extract contact information
        data.contact = {};
        const emailMatch = content.match(/([\w._%+-]+@[\w.-]+\.[A-Z]{2,})/gi);
        if (emailMatch) data.contact.email = emailMatch[0];

        const phoneMatch = content.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
        if (phoneMatch) data.contact.phone = phoneMatch[0];

        const addressMatch = content.match(/(\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5})/);
        if (addressMatch) data.contact.address = addressMatch[0];

        // Extract sections
        const sections = this.extractSections(content);

        // Extract summary/objective
        const summarySection = sections.find(s =>
            /summary|objective|profile|about/i.test(s.title)
        );
        if (summarySection) {
            data.summary = summarySection.content.trim();
        }

        // Extract skills
        const skillsSection = sections.find(s =>
            /skills|technical|technologies|competencies/i.test(s.title)
        );
        if (skillsSection) {
            data.skills = this.parseSkills(skillsSection.content);
        }

        // Extract experience
        const experienceSection = sections.find(s =>
            /experience|employment|work|professional/i.test(s.title)
        );
        if (experienceSection) {
            data.experience = this.parseExperience(experienceSection.content);
        }

        // Extract education
        const educationSection = sections.find(s =>
            /education|academic|school|university|college/i.test(s.title)
        );
        if (educationSection) {
            data.education = this.parseEducation(educationSection.content);
        }

        // Extract projects
        const projectsSection = sections.find(s =>
            /projects|portfolio|work samples/i.test(s.title)
        );
        if (projectsSection) {
            data.projects = this.parseProjects(projectsSection.content);
        }

        return data;
    }

    private extractSections(content: string): Array<{title: string, content: string}> {
        const sections: Array<{title: string, content: string}> = [];
        const lines = content.split('\n');

        let currentSection: {title: string, content: string} | null = null;

        for (const line of lines) {
            const trimmed = line.trim();

            // Check if this is a section header
            if (this.isSectionHeader(trimmed)) {
                // Save previous section
                if (currentSection) {
                    sections.push(currentSection);
                }

                // Start new section
                currentSection = {
                    title: trimmed.replace(/[📋▶━─=*_]/g, '').trim(),
                    content: ''
                };
            } else if (currentSection && trimmed) {
                // Add content to current section
                currentSection.content += line + '\n';
            }
        }

        // Add final section
        if (currentSection) {
            sections.push(currentSection);
        }

        return sections;
    }

    private isSectionHeader(line: string): boolean {
        const cleanLine = line.replace(/[📋▶━─=*_]/g, '').trim().toLowerCase();
        const headerKeywords = [
            'summary', 'objective', 'profile', 'about',
            'experience', 'employment', 'work', 'professional',
            'skills', 'technical', 'technologies', 'competencies',
            'education', 'academic', 'school', 'university',
            'projects', 'portfolio', 'certifications', 'awards',
            'languages', 'contact', 'achievements'
        ];

        return headerKeywords.some(keyword =>
            cleanLine.includes(keyword) && cleanLine.length < 50
        );
    }

    private parseSkills(content: string): {technical?: string[], languages?: string[], other?: string[]} {
        const skills: {technical?: string[], languages?: string[], other?: string[]} = {};

        // Look for bullet points or comma-separated lists
        const bulletMatches = content.match(/•\s*(.+)/g);
        if (bulletMatches) {
            skills.technical = bulletMatches.map(match =>
                match.replace(/•\s*/, '').trim()
            );
        } else {
            // Try comma-separated format
            const lines = content.split('\n').filter(line => line.trim());
            const skillsList = lines.join(' ').split(/[,;]/).map(skill => skill.trim()).filter(skill => skill);
            if (skillsList.length > 0) {
                skills.technical = skillsList;
            }
        }

        return skills;
    }

    private parseExperience(content: string): Array<{title: string, company: string, dates: string, description: string[]}> {
        const experience: Array<{title: string, company: string, dates: string, description: string[]}> = [];

        // This is a simplified parser - could be enhanced based on common patterns
        const jobBlocks = content.split(/\n\s*\n/).filter(block => block.trim());

        for (const block of jobBlocks) {
            const lines = block.split('\n').filter(line => line.trim());
            if (lines.length < 2) continue;

            const firstLine = lines[0].trim();
            const titleCompanyMatch = firstLine.match(/(.+?)\s*[-|@]\s*(.+)/);

            if (titleCompanyMatch) {
                const [, title, company] = titleCompanyMatch;
                const dateMatch = block.match(/(📅\s*)?(\d{4}|\w+\s+\d{4}).*?(\d{4}|present|current)/i);
                const dates = dateMatch ? dateMatch[0].replace('📅', '').trim() : '';

                const description = lines.slice(1)
                    .filter(line => line.trim() && !line.match(/📅/))
                    .map(line => line.replace(/^•\s*/, '').trim())
                    .filter(line => line);

                experience.push({
                    title: title.trim(),
                    company: company.trim(),
                    dates,
                    description
                });
            }
        }

        return experience;
    }

    private parseEducation(content: string): Array<{degree: string, institution: string, dates: string}> {
        const education: Array<{degree: string, institution: string, dates: string}> = [];

        const lines = content.split('\n').filter(line => line.trim());

        for (const line of lines) {
            const degreeMatch = line.match(/(🎓\s*)?(.+?)\s*[-,]\s*(.+?)(?:\s*[-–—]\s*(.+))?$/);
            if (degreeMatch) {
                const [, , degree, institution, dates] = degreeMatch;
                education.push({
                    degree: degree.trim(),
                    institution: institution.trim(),
                    dates: dates?.trim() || ''
                });
            }
        }

        return education;
    }

    private parseProjects(content: string): Array<{name: string, description: string}> {
        const projects: Array<{name: string, description: string}> = [];

        const projectBlocks = content.split(/\n\s*\n/).filter(block => block.trim());

        for (const block of projectBlocks) {
            const lines = block.split('\n').filter(line => line.trim());
            if (lines.length >= 2) {
                projects.push({
                    name: lines[0].trim(),
                    description: lines.slice(1).join(' ').trim()
                });
            }
        }

        return projects;
    }

    generateTemplatedResume(content: string, templateId: string): {html: string, css: string} | null {
        const template = this.getTemplate(templateId);
        if (!template) return null;

        const parsedData = this.parseResumeContent(content);
        const html = this.renderTemplate(template.htmlTemplate, parsedData);

        return {
            html,
            css: template.cssStyles
        };
    }

    private renderTemplate(template: string, data: ParsedResumeData): string {
        // Simple template rendering (in a real app, you'd use a proper template engine)
        let html = template;

        // Replace simple variables
        html = html.replace(/\{\{name\}\}/g, data.name || 'Your Name');
        html = html.replace(/\{\{summary\}\}/g, data.summary || '');

        // Replace contact info
        if (data.contact) {
            html = html.replace(/\{\{contact\.email\}\}/g, data.contact.email || '');
            html = html.replace(/\{\{contact\.phone\}\}/g, data.contact.phone || '');
            html = html.replace(/\{\{contact\.address\}\}/g, data.contact.address || '');
        }

        // Handle conditional sections (simplified)
        html = this.handleConditionals(html, data);

        return html;
    }

    private handleConditionals(html: string, data: ParsedResumeData): string {
        // Remove sections that don't have data
        if (!data.summary) {
            html = html.replace(/\{\{#summary\}\}.*?\{\{\/summary\}\}/gs, '');
        }
        if (!data.skills?.technical) {
            html = html.replace(/\{\{#skills\.technical\}\}.*?\{\{\/skills\.technical\}\}/gs, '');
        }
        if (!data.experience) {
            html = html.replace(/\{\{#experience\}\}.*?\{\{\/experience\}\}/gs, '');
        }
        if (!data.education) {
            html = html.replace(/\{\{#education\}\}.*?\{\{\/education\}\}/gs, '');
        }

        // Clean up remaining template syntax
        html = html.replace(/\{\{[^}]+\}\}/g, '');

        return html;
    }
}

export default new ResumeTemplateService();
export type { ResumeTemplate, ParsedResumeData };