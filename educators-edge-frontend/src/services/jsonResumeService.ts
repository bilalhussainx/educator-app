// JSON Resume Schema v1.0.0 - The Open Source Standard
interface JSONResume {
    $schema: string;
    basics: {
        name: string;
        label?: string;
        image?: string;
        email?: string;
        phone?: string;
        url?: string;
        summary?: string;
        location?: {
            address?: string;
            postalCode?: string;
            city?: string;
            countryCode?: string;
            region?: string;
        };
        profiles?: Array<{
            network: string;
            username: string;
            url: string;
        }>;
    };
    work?: Array<{
        name: string;
        position: string;
        url?: string;
        startDate: string;
        endDate?: string;
        summary?: string;
        highlights?: string[];
    }>;
    volunteer?: Array<{
        organization: string;
        position: string;
        url?: string;
        startDate: string;
        endDate?: string;
        summary?: string;
        highlights?: string[];
    }>;
    education?: Array<{
        institution: string;
        url?: string;
        area: string;
        studyType: string;
        startDate?: string;
        endDate?: string;
        score?: string;
        courses?: string[];
    }>;
    awards?: Array<{
        title: string;
        date: string;
        awarder: string;
        summary?: string;
    }>;
    certificates?: Array<{
        name: string;
        date: string;
        issuer: string;
        url?: string;
    }>;
    publications?: Array<{
        name: string;
        publisher: string;
        releaseDate: string;
        url?: string;
        summary?: string;
    }>;
    skills?: Array<{
        name: string;
        level?: string;
        keywords?: string[];
    }>;
    languages?: Array<{
        language: string;
        fluency: string;
    }>;
    interests?: Array<{
        name: string;
        keywords?: string[];
    }>;
    references?: Array<{
        name: string;
        reference: string;
    }>;
    projects?: Array<{
        name: string;
        description?: string;
        highlights?: string[];
        keywords?: string[];
        startDate?: string;
        endDate?: string;
        url?: string;
        roles?: string[];
        entity?: string;
        type?: string;
    }>;
    meta?: {
        canonical?: string;
        version?: string;
        lastModified?: string;
        theme?: string;
    };
}

interface ModernResumeTheme {
    id: string;
    name: string;
    description: string;
    author: string;
    preview: string;
    category: 'modern' | 'classic' | 'creative' | 'minimal';
    colors: string[];
    features: string[];
    render: (resume: JSONResume) => { html: string; css: string };
}

class JSONResumeService {
    private themes: ModernResumeTheme[] = [
        {
            id: 'modern-professional-2024',
            name: 'Modern Professional 2024',
            description: 'Clean, contemporary design with subtle color accents and modern typography',
            author: 'Educators Edge',
            preview: '✨ Modern layout with clean lines, professional color scheme, and optimal white space',
            category: 'modern',
            colors: ['#2563eb', '#1f2937', '#f8fafc', '#64748b'],
            features: ['Responsive Design', 'Print Optimized', 'ATS Friendly', 'Dark Mode Ready'],
            render: this.renderModernProfessional2024.bind(this)
        },
        {
            id: 'minimalist-tech-2024',
            name: 'Minimalist Tech 2024',
            description: 'Ultra-clean design focused on content with technical skill highlighting',
            author: 'Educators Edge',
            preview: '🎯 Minimal design with focus on technical skills and clean typography',
            category: 'minimal',
            colors: ['#0f172a', '#475569', '#ffffff', '#22d3ee'],
            features: ['Tech Focused', 'Skills Emphasis', 'Clean Layout', 'GitHub Integration'],
            render: this.renderMinimalistTech2024.bind(this)
        },
        {
            id: 'executive-premium-2024',
            name: 'Executive Premium 2024',
            description: 'Sophisticated design for senior professionals and executives',
            author: 'Educators Edge',
            preview: '👔 Premium executive design with elegant typography and professional presence',
            category: 'classic',
            colors: ['#1e293b', '#dc2626', '#f1f5f9', '#6b7280'],
            features: ['Executive Focus', 'Premium Design', 'Leadership Emphasis', 'Board Ready'],
            render: this.renderExecutivePremium2024.bind(this)
        }
    ];

    convertToJSONResume(content: string): JSONResume {
        console.log('🔄 Converting content to JSON Resume format...');

        // Parse the content using our universal parser
        const lines = content.split('\n').filter(line => line.trim());
        const resume: JSONResume = {
            $schema: "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
            basics: {
                name: this.extractName(lines),
                email: this.extractEmail(content),
                phone: this.extractPhone(content),
                summary: this.extractSummary(content),
                location: this.extractLocation(content),
                profiles: this.extractProfiles(content)
            },
            work: this.extractWork(content),
            education: this.extractEducation(content),
            skills: this.extractSkills(content),
            projects: this.extractProjects(content),
            meta: {
                version: "v1.0.0",
                lastModified: new Date().toISOString(),
                theme: "modern-professional-2024"
            }
        };

        console.log('✅ JSON Resume conversion complete:', resume.basics.name);
        return resume;
    }

    private extractName(lines: string[]): string {
        for (const line of lines.slice(0, 5)) {
            const cleaned = line.replace(/[*=_\-📄🎓💼📧📞📍]/g, '').trim();
            if (cleaned.length > 2 && cleaned.length < 50 &&
                !cleaned.includes('@') && !cleaned.includes('http') &&
                !/^\d/.test(cleaned)) {
                const words = cleaned.split(/\s+/);
                if (words.length >= 2 && words.length <= 4) {
                    return cleaned;
                }
            }
        }
        return 'Professional Resume';
    }

    private extractEmail(content: string): string | undefined {
        const emailMatch = content.match(/([\w._%+-]+@[\w.-]+\.[A-Z]{2,})/gi);
        return emailMatch ? emailMatch[0] : undefined;
    }

    private extractPhone(content: string): string | undefined {
        const phoneMatch = content.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
        return phoneMatch ? phoneMatch[0] : undefined;
    }

    private extractSummary(content: string): string | undefined {
        const summaryRegex = /(summary|objective|profile|about)[\s\S]*?(?=\n\s*\n|\n\s*[A-Z\s]{3,}|$)/gi;
        const match = content.match(summaryRegex);
        if (match) {
            return match[0].replace(/(summary|objective|profile|about)\s*:?\s*/gi, '').trim();
        }
        return undefined;
    }

    private extractLocation(content: string): JSONResume['basics']['location'] | undefined {
        const locationMatch = content.match(/([A-Za-z\s]+),\s*([A-Z]{2})(?:\s+(\d{5}))?/);
        if (locationMatch) {
            return {
                city: locationMatch[1].trim(),
                region: locationMatch[2],
                postalCode: locationMatch[3]
            };
        }
        return undefined;
    }

    private extractProfiles(content: string): JSONResume['basics']['profiles'] | undefined {
        const profiles: JSONResume['basics']['profiles'] = [];

        const linkedinMatch = content.match(/(linkedin\.com\/in\/[\w-]+)/gi);
        if (linkedinMatch) {
            profiles.push({
                network: "LinkedIn",
                username: linkedinMatch[0].split('/').pop() || '',
                url: `https://${linkedinMatch[0]}`
            });
        }

        const githubMatch = content.match(/(github\.com\/[\w-]+)/gi);
        if (githubMatch) {
            profiles.push({
                network: "GitHub",
                username: githubMatch[0].split('/').pop() || '',
                url: `https://${githubMatch[0]}`
            });
        }

        return profiles.length > 0 ? profiles : undefined;
    }

    private extractWork(content: string): JSONResume['work'] | undefined {
        const workSection = this.extractSection(content, ['experience', 'work', 'employment']);
        if (!workSection) return undefined;

        const jobs: JSONResume['work'] = [];
        const jobBlocks = workSection.split(/\n\s*\n/).filter(block => block.trim());

        for (const block of jobBlocks) {
            const lines = block.split('\n').filter(line => line.trim());
            if (lines.length < 2) continue;

            const firstLine = lines[0].trim();
            const titleCompanyMatch = firstLine.match(/(.+?)\s*[-|@]\s*(.+)/);

            if (titleCompanyMatch) {
                const [, position, company] = titleCompanyMatch;
                const dateMatch = block.match(/(\d{4}|\w+\s+\d{4}).*?(\d{4}|present|current)/i);

                const highlights = lines.slice(1)
                    .filter(line => line.trim() && !line.match(/\d{4}/))
                    .map(line => line.replace(/^•\s*/, '').trim())
                    .filter(line => line);

                jobs.push({
                    name: company.trim(),
                    position: position.trim(),
                    startDate: dateMatch ? this.parseDate(dateMatch[1]) : '',
                    endDate: dateMatch && !dateMatch[2].match(/present|current/i) ? this.parseDate(dateMatch[2]) : undefined,
                    highlights
                });
            }
        }

        return jobs.length > 0 ? jobs : undefined;
    }

    private extractEducation(content: string): JSONResume['education'] | undefined {
        const educationSection = this.extractSection(content, ['education', 'academic']);
        if (!educationSection) return undefined;

        const education: JSONResume['education'] = [];
        const eduBlocks = educationSection.split(/\n\s*\n/).filter(block => block.trim());

        for (const block of eduBlocks) {
            const lines = block.split('\n').filter(line => line.trim());
            for (const line of lines) {
                const eduMatch = line.match(/(Bachelor|Master|PhD|B\.A\.|B\.S\.|M\.A\.|M\.S\.|MBA)([^,\n]*),?\s*(.+?)(?:\s*[-–—]\s*(.+))?$/);
                if (eduMatch) {
                    const [, studyType, area, institution, date] = eduMatch;
                    education.push({
                        institution: institution.trim(),
                        area: area.trim(),
                        studyType: studyType.trim(),
                        endDate: date ? this.parseDate(date) : undefined
                    });
                }
            }
        }

        return education.length > 0 ? education : undefined;
    }

    private extractSkills(content: string): JSONResume['skills'] | undefined {
        const skillsSection = this.extractSection(content, ['skills', 'technical', 'technologies']);
        if (!skillsSection) return undefined;

        const skills: JSONResume['skills'] = [];
        const lines = skillsSection.split('\n').filter(line => line.trim());

        for (const line of lines) {
            if (line.includes('•') || line.includes('-')) {
                const skillText = line.replace(/[•\-]/g, '').trim();
                const keywords = skillText.split(/[,;]/).map(s => s.trim()).filter(s => s);
                if (keywords.length > 0) {
                    skills.push({
                        name: keywords[0],
                        keywords: keywords.slice(1)
                    });
                }
            }
        }

        return skills.length > 0 ? skills : undefined;
    }

    private extractProjects(content: string): JSONResume['projects'] | undefined {
        const projectsSection = this.extractSection(content, ['projects', 'portfolio']);
        if (!projectsSection) return undefined;

        const projects: JSONResume['projects'] = [];
        const projectBlocks = projectsSection.split(/\n\s*\n/).filter(block => block.trim());

        for (const block of projectBlocks) {
            const lines = block.split('\n').filter(line => line.trim());
            if (lines.length >= 2) {
                projects.push({
                    name: lines[0].trim(),
                    description: lines.slice(1).join(' ').trim()
                });
            }
        }

        return projects.length > 0 ? projects : undefined;
    }

    private extractSection(content: string, keywords: string[]): string | null {
        const lines = content.split('\n');
        let sectionStart = -1;
        let sectionEnd = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase().replace(/[📋▶━─=*_\-:]/g, '').trim();
            if (keywords.some(keyword => line.includes(keyword))) {
                sectionStart = i + 1;
                break;
            }
        }

        if (sectionStart === -1) return null;

        // Find section end
        for (let i = sectionStart; i < lines.length; i++) {
            const line = lines[i].toLowerCase().replace(/[📋▶━─=*_\-:]/g, '').trim();
            if (line.length > 0 && line.length < 30 && /^[a-z\s]{3,}$/.test(line)) {
                sectionEnd = i;
                break;
            }
        }

        if (sectionEnd === -1) sectionEnd = lines.length;

        return lines.slice(sectionStart, sectionEnd).join('\n').trim();
    }

    private parseDate(dateStr: string): string {
        // Convert various date formats to ISO format
        const trimmed = dateStr.trim();
        if (/^\d{4}$/.test(trimmed)) {
            return `${trimmed}-12-01`;
        }
        if (/^\w+\s+\d{4}$/.test(trimmed)) {
            const [month, year] = trimmed.split(' ');
            const monthNum = new Date(`${month} 1, 2000`).getMonth() + 1;
            return `${year}-${monthNum.toString().padStart(2, '0')}-01`;
        }
        return trimmed;
    }

    getThemes(): ModernResumeTheme[] {
        return this.themes;
    }

    renderResume(resume: JSONResume, themeId: string): { html: string; css: string } | null {
        const theme = this.themes.find(t => t.id === themeId);
        if (!theme) return null;

        return theme.render(resume);
    }

    private renderModernProfessional2024(resume: JSONResume): { html: string; css: string } {
        const html = `
            <div class="resume-container">
                <header class="resume-header">
                    <div class="header-content">
                        <h1 class="name">${resume.basics.name}</h1>
                        ${resume.basics.label ? `<p class="title">${resume.basics.label}</p>` : ''}
                        ${resume.basics.summary ? `<p class="summary">${resume.basics.summary}</p>` : ''}
                    </div>
                    <div class="contact-info">
                        ${resume.basics.email ? `<div class="contact-item"><i class="icon-email"></i>${resume.basics.email}</div>` : ''}
                        ${resume.basics.phone ? `<div class="contact-item"><i class="icon-phone"></i>${resume.basics.phone}</div>` : ''}
                        ${resume.basics.location ? `<div class="contact-item"><i class="icon-location"></i>${resume.basics.location.city}, ${resume.basics.location.region}</div>` : ''}
                        ${resume.basics.profiles?.map(profile =>
                            `<div class="contact-item"><i class="icon-link"></i><a href="${profile.url}" target="_blank">${profile.network}</a></div>`
                        ).join('') || ''}
                    </div>
                </header>

                <main class="resume-main">
                    ${resume.work && resume.work.length > 0 ? `
                        <section class="section">
                            <h2 class="section-title">Professional Experience</h2>
                            ${resume.work.map(job => `
                                <div class="work-item">
                                    <div class="work-header">
                                        <div class="work-title">
                                            <h3>${job.position}</h3>
                                            <h4>${job.name}</h4>
                                        </div>
                                        <div class="work-dates">
                                            ${job.startDate}${job.endDate ? ` - ${job.endDate}` : ' - Present'}
                                        </div>
                                    </div>
                                    ${job.summary ? `<p class="work-summary">${job.summary}</p>` : ''}
                                    ${job.highlights && job.highlights.length > 0 ? `
                                        <ul class="work-highlights">
                                            ${job.highlights.map(highlight => `<li>${highlight}</li>`).join('')}
                                        </ul>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </section>
                    ` : ''}

                    ${resume.skills && resume.skills.length > 0 ? `
                        <section class="section">
                            <h2 class="section-title">Technical Skills</h2>
                            <div class="skills-grid">
                                ${resume.skills.map(skill => `
                                    <div class="skill-item">
                                        <span class="skill-name">${skill.name}</span>
                                        ${skill.keywords && skill.keywords.length > 0 ? `
                                            <div class="skill-keywords">
                                                ${skill.keywords.map(keyword => `<span class="keyword">${keyword}</span>`).join('')}
                                            </div>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </section>
                    ` : ''}

                    ${resume.education && resume.education.length > 0 ? `
                        <section class="section">
                            <h2 class="section-title">Education</h2>
                            ${resume.education.map(edu => `
                                <div class="education-item">
                                    <div class="education-header">
                                        <div>
                                            <h3>${edu.studyType} in ${edu.area}</h3>
                                            <h4>${edu.institution}</h4>
                                        </div>
                                        ${edu.endDate ? `<div class="education-date">${edu.endDate}</div>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </section>
                    ` : ''}

                    ${resume.projects && resume.projects.length > 0 ? `
                        <section class="section">
                            <h2 class="section-title">Notable Projects</h2>
                            ${resume.projects.map(project => `
                                <div class="project-item">
                                    <h3>${project.name}</h3>
                                    ${project.description ? `<p>${project.description}</p>` : ''}
                                    ${project.url ? `<a href="${project.url}" target="_blank" class="project-link">View Project</a>` : ''}
                                </div>
                            `).join('')}
                        </section>
                    ` : ''}
                </main>
            </div>
        `;

        const css = `
            .resume-container {
                max-width: 850px;
                margin: 0 auto;
                background: white;
                font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                border-radius: 8px;
                overflow: hidden;
            }

            .resume-header {
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                color: white;
                padding: 2.5rem 2rem;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 2rem;
            }

            .header-content {
                flex: 1;
            }

            .name {
                font-size: 2.5rem;
                font-weight: 700;
                margin: 0 0 0.5rem 0;
                letter-spacing: -0.025em;
            }

            .title {
                font-size: 1.25rem;
                margin: 0 0 1rem 0;
                opacity: 0.9;
                font-weight: 500;
            }

            .summary {
                font-size: 1rem;
                margin: 0;
                opacity: 0.95;
                line-height: 1.7;
                max-width: 600px;
            }

            .contact-info {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                min-width: 200px;
            }

            .contact-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.9rem;
            }

            .contact-item a {
                color: white;
                text-decoration: none;
            }

            .contact-item a:hover {
                text-decoration: underline;
            }

            .resume-main {
                padding: 2rem;
            }

            .section {
                margin-bottom: 2.5rem;
            }

            .section-title {
                font-size: 1.5rem;
                font-weight: 700;
                color: #2563eb;
                margin: 0 0 1.5rem 0;
                padding-bottom: 0.5rem;
                border-bottom: 2px solid #e5e7eb;
                position: relative;
            }

            .section-title::before {
                content: '';
                position: absolute;
                bottom: -2px;
                left: 0;
                width: 60px;
                height: 2px;
                background: #2563eb;
            }

            .work-item {
                margin-bottom: 2rem;
                padding-bottom: 1.5rem;
                border-bottom: 1px solid #f3f4f6;
            }

            .work-item:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }

            .work-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 1rem;
                gap: 1rem;
            }

            .work-title h3 {
                font-size: 1.25rem;
                font-weight: 600;
                margin: 0;
                color: #1f2937;
            }

            .work-title h4 {
                font-size: 1.1rem;
                font-weight: 500;
                margin: 0.25rem 0 0 0;
                color: #2563eb;
            }

            .work-dates {
                font-size: 0.95rem;
                color: #6b7280;
                font-weight: 500;
                white-space: nowrap;
            }

            .work-summary {
                margin: 0 0 1rem 0;
                color: #4b5563;
                font-style: italic;
            }

            .work-highlights {
                margin: 0;
                padding-left: 1.25rem;
            }

            .work-highlights li {
                margin-bottom: 0.5rem;
                color: #374151;
            }

            .skills-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.5rem;
            }

            .skill-item {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 1rem;
            }

            .skill-name {
                font-weight: 600;
                color: #1e293b;
                display: block;
                margin-bottom: 0.5rem;
            }

            .skill-keywords {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
            }

            .keyword {
                background: #2563eb;
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 1rem;
                font-size: 0.8rem;
                font-weight: 500;
            }

            .education-item {
                margin-bottom: 1.5rem;
            }

            .education-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 1rem;
            }

            .education-header h3 {
                font-size: 1.1rem;
                font-weight: 600;
                margin: 0;
                color: #1f2937;
            }

            .education-header h4 {
                font-size: 1rem;
                font-weight: 500;
                margin: 0.25rem 0 0 0;
                color: #2563eb;
            }

            .education-date {
                font-size: 0.95rem;
                color: #6b7280;
                font-weight: 500;
            }

            .project-item {
                margin-bottom: 1.5rem;
                padding: 1rem;
                background: #f9fafb;
                border-radius: 8px;
                border-left: 4px solid #2563eb;
            }

            .project-item h3 {
                font-size: 1.1rem;
                font-weight: 600;
                margin: 0 0 0.5rem 0;
                color: #1f2937;
            }

            .project-item p {
                margin: 0 0 1rem 0;
                color: #4b5563;
            }

            .project-link {
                color: #2563eb;
                text-decoration: none;
                font-weight: 500;
                font-size: 0.9rem;
            }

            .project-link:hover {
                text-decoration: underline;
            }

            @media print {
                .resume-container {
                    box-shadow: none;
                    border-radius: 0;
                    max-width: none;
                }

                .resume-header {
                    background: #2563eb !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }

            @media (max-width: 768px) {
                .resume-header {
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .contact-info {
                    min-width: auto;
                }

                .work-header {
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .skills-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;

        return { html, css };
    }

    private renderMinimalistTech2024(resume: JSONResume): { html: string; css: string } {
        const html = `
            <div class="resume-container minimal-tech">
                <header class="resume-header">
                    <div class="header-line">
                        <h1 class="name">${resume.basics.name}</h1>
                        <div class="contact-bar">
                            ${resume.basics.email ? `<span>${resume.basics.email}</span>` : ''}
                            ${resume.basics.phone ? `<span>${resume.basics.phone}</span>` : ''}
                            ${resume.basics.profiles?.map(p => `<span><a href="${p.url}">${p.network}</a></span>`).join('') || ''}
                        </div>
                    </div>
                    ${resume.basics.label ? `<p class="title">${resume.basics.label}</p>` : ''}
                    ${resume.basics.summary ? `<p class="summary">${resume.basics.summary}</p>` : ''}
                </header>

                <main class="resume-main">
                    ${resume.skills && resume.skills.length > 0 ? `
                        <section class="section">
                            <h2 class="section-title">// Technical Skills</h2>
                            <div class="tech-stack">
                                ${resume.skills.map(skill => `
                                    <div class="tech-category">
                                        <span class="tech-name">${skill.name}:</span>
                                        <span class="tech-list">${skill.keywords?.join(', ') || ''}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </section>
                    ` : ''}

                    ${resume.work && resume.work.length > 0 ? `
                        <section class="section">
                            <h2 class="section-title">// Experience</h2>
                            ${resume.work.map(job => `
                                <div class="work-block">
                                    <div class="work-meta">
                                        <span class="position">${job.position}</span>
                                        <span class="company">@ ${job.name}</span>
                                        <span class="dates">${job.startDate}${job.endDate ? ` - ${job.endDate}` : ' - Present'}</span>
                                    </div>
                                    ${job.highlights && job.highlights.length > 0 ? `
                                        <div class="highlights">
                                            ${job.highlights.map(highlight => `<div class="highlight">• ${highlight}</div>`).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </section>
                    ` : ''}

                    ${resume.projects && resume.projects.length > 0 ? `
                        <section class="section">
                            <h2 class="section-title">// Projects</h2>
                            ${resume.projects.map(project => `
                                <div class="project-block">
                                    <div class="project-header">
                                        <span class="project-name">${project.name}</span>
                                        ${project.url ? `<a href="${project.url}" class="project-url">[view]</a>` : ''}
                                    </div>
                                    ${project.description ? `<div class="project-desc">${project.description}</div>` : ''}
                                </div>
                            `).join('')}
                        </section>
                    ` : ''}

                    ${resume.education && resume.education.length > 0 ? `
                        <section class="section">
                            <h2 class="section-title">// Education</h2>
                            ${resume.education.map(edu => `
                                <div class="edu-block">
                                    <span class="degree">${edu.studyType} ${edu.area}</span>
                                    <span class="school">@ ${edu.institution}</span>
                                    ${edu.endDate ? `<span class="edu-date">${edu.endDate}</span>` : ''}
                                </div>
                            `).join('')}
                        </section>
                    ` : ''}
                </main>
            </div>
        `;

        const css = `
            .minimal-tech {
                font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
                background: #ffffff;
                color: #0f172a;
                border: 1px solid #e2e8f0;
                max-width: 800px;
                margin: 0 auto;
                line-height: 1.5;
            }

            .minimal-tech .resume-header {
                background: none;
                color: #0f172a;
                border-bottom: 2px solid #22d3ee;
                padding: 2rem;
            }

            .minimal-tech .header-line {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }

            .minimal-tech .name {
                font-size: 1.8rem;
                font-weight: 600;
                margin: 0;
                color: #0f172a;
            }

            .minimal-tech .contact-bar {
                display: flex;
                gap: 1.5rem;
                font-size: 0.85rem;
                color: #475569;
            }

            .minimal-tech .contact-bar a {
                color: #22d3ee;
                text-decoration: none;
            }

            .minimal-tech .title {
                font-size: 1rem;
                color: #64748b;
                margin: 0.5rem 0;
                font-weight: 400;
            }

            .minimal-tech .summary {
                font-size: 0.9rem;
                color: #475569;
                margin: 1rem 0 0 0;
                max-width: 600px;
            }

            .minimal-tech .resume-main {
                padding: 0 2rem 2rem 2rem;
            }

            .minimal-tech .section {
                margin-bottom: 2rem;
            }

            .minimal-tech .section-title {
                font-size: 1.1rem;
                font-weight: 600;
                color: #22d3ee;
                margin: 0 0 1rem 0;
                font-family: inherit;
            }

            .minimal-tech .tech-stack {
                display: grid;
                gap: 0.5rem;
            }

            .minimal-tech .tech-category {
                display: flex;
                gap: 1rem;
                font-size: 0.9rem;
            }

            .minimal-tech .tech-name {
                font-weight: 600;
                color: #0f172a;
                min-width: 120px;
            }

            .minimal-tech .tech-list {
                color: #475569;
            }

            .minimal-tech .work-block {
                margin-bottom: 1.5rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid #f1f5f9;
            }

            .minimal-tech .work-block:last-child {
                border-bottom: none;
            }

            .minimal-tech .work-meta {
                display: flex;
                gap: 1rem;
                align-items: center;
                margin-bottom: 0.5rem;
                font-size: 0.9rem;
            }

            .minimal-tech .position {
                font-weight: 600;
                color: #0f172a;
            }

            .minimal-tech .company {
                color: #22d3ee;
                font-weight: 500;
            }

            .minimal-tech .dates {
                color: #64748b;
                margin-left: auto;
            }

            .minimal-tech .highlights {
                margin-top: 0.5rem;
            }

            .minimal-tech .highlight {
                font-size: 0.85rem;
                color: #475569;
                margin-bottom: 0.25rem;
            }

            .minimal-tech .project-block {
                margin-bottom: 1rem;
            }

            .minimal-tech .project-header {
                display: flex;
                gap: 1rem;
                align-items: center;
                margin-bottom: 0.25rem;
            }

            .minimal-tech .project-name {
                font-weight: 600;
                color: #0f172a;
                font-size: 0.9rem;
            }

            .minimal-tech .project-url {
                color: #22d3ee;
                text-decoration: none;
                font-size: 0.8rem;
            }

            .minimal-tech .project-desc {
                font-size: 0.85rem;
                color: #475569;
            }

            .minimal-tech .edu-block {
                display: flex;
                gap: 1rem;
                align-items: center;
                font-size: 0.9rem;
                margin-bottom: 0.5rem;
            }

            .minimal-tech .degree {
                font-weight: 600;
                color: #0f172a;
            }

            .minimal-tech .school {
                color: #22d3ee;
            }

            .minimal-tech .edu-date {
                color: #64748b;
                margin-left: auto;
            }

            @media (max-width: 768px) {
                .minimal-tech .header-line {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.5rem;
                }

                .minimal-tech .contact-bar {
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .minimal-tech .work-meta {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.25rem;
                }

                .minimal-tech .dates {
                    margin-left: 0;
                }
            }
        `;

        return { html, css };
    }

    private renderExecutivePremium2024(resume: JSONResume): { html: string; css: string } {
        const html = `
            <div class="resume-container executive-premium">
                <header class="resume-header">
                    <div class="executive-brand">
                        <h1 class="name">${resume.basics.name}</h1>
                        ${resume.basics.label ? `<p class="executive-title">${resume.basics.label}</p>` : ''}
                        ${resume.basics.summary ? `<p class="executive-summary">${resume.basics.summary}</p>` : ''}
                    </div>
                    <div class="contact-sidebar">
                        ${resume.basics.email ? `<div class="contact-item"><span class="label">Email</span><span class="value">${resume.basics.email}</span></div>` : ''}
                        ${resume.basics.phone ? `<div class="contact-item"><span class="label">Phone</span><span class="value">${resume.basics.phone}</span></div>` : ''}
                        ${resume.basics.location ? `<div class="contact-item"><span class="label">Location</span><span class="value">${resume.basics.location.city}, ${resume.basics.location.region}</span></div>` : ''}
                        ${resume.basics.profiles?.map(profile => `
                            <div class="contact-item"><span class="label">${profile.network}</span><a href="${profile.url}" class="value link">${profile.username}</a></div>
                        `).join('') || ''}
                    </div>
                </header>

                <main class="resume-main">
                    ${resume.work && resume.work.length > 0 ? `
                        <section class="section">
                            <h2 class="section-title">Executive Experience</h2>
                            ${resume.work.map(job => `
                                <div class="executive-role">
                                    <div class="role-header">
                                        <div class="role-info">
                                            <h3 class="position">${job.position}</h3>
                                            <h4 class="company">${job.name}</h4>
                                        </div>
                                        <div class="tenure">
                                            ${job.startDate}${job.endDate ? ` – ${job.endDate}` : ' – Present'}
                                        </div>
                                    </div>
                                    ${job.summary ? `<p class="role-summary">${job.summary}</p>` : ''}
                                    ${job.highlights && job.highlights.length > 0 ? `
                                        <div class="achievements">
                                            <h5 class="achievements-title">Key Achievements</h5>
                                            <ul class="achievement-list">
                                                ${job.highlights.map(highlight => `<li>${highlight}</li>`).join('')}
                                            </ul>
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </section>
                    ` : ''}

                    <div class="two-column">
                        <div class="left-column">
                            ${resume.education && resume.education.length > 0 ? `
                                <section class="section">
                                    <h2 class="section-title">Education</h2>
                                    ${resume.education.map(edu => `
                                        <div class="education-item">
                                            <h3 class="degree">${edu.studyType} in ${edu.area}</h3>
                                            <p class="institution">${edu.institution}</p>
                                            ${edu.endDate ? `<p class="graduation">${edu.endDate}</p>` : ''}
                                        </div>
                                    `).join('')}
                                </section>
                            ` : ''}

                            ${resume.skills && resume.skills.length > 0 ? `
                                <section class="section">
                                    <h2 class="section-title">Core Competencies</h2>
                                    <div class="competencies">
                                        ${resume.skills.map(skill => `
                                            <div class="competency-area">
                                                <h4 class="competency-title">${skill.name}</h4>
                                                ${skill.keywords && skill.keywords.length > 0 ? `
                                                    <p class="competency-details">${skill.keywords.join(' • ')}</p>
                                                ` : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                </section>
                            ` : ''}
                        </div>

                        <div class="right-column">
                            ${resume.projects && resume.projects.length > 0 ? `
                                <section class="section">
                                    <h2 class="section-title">Notable Initiatives</h2>
                                    ${resume.projects.map(project => `
                                        <div class="initiative">
                                            <h3 class="initiative-name">${project.name}</h3>
                                            ${project.description ? `<p class="initiative-desc">${project.description}</p>` : ''}
                                            ${project.url ? `<a href="${project.url}" class="initiative-link">View Details →</a>` : ''}
                                        </div>
                                    `).join('')}
                                </section>
                            ` : ''}
                        </div>
                    </div>
                </main>
            </div>
        `;

        const css = `
            .executive-premium {
                font-family: 'Crimson Text', 'Playfair Display', 'Georgia', serif;
                background: #ffffff;
                color: #1e293b;
                max-width: 900px;
                margin: 0 auto;
                line-height: 1.6;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            }

            .executive-premium .resume-header {
                background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                color: #ffffff;
                padding: 3rem 2.5rem;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 3rem;
            }

            .executive-premium .executive-brand {
                flex: 1;
                max-width: 500px;
            }

            .executive-premium .name {
                font-size: 3rem;
                font-weight: 400;
                margin: 0 0 0.5rem 0;
                letter-spacing: -0.02em;
                font-family: 'Playfair Display', serif;
            }

            .executive-premium .executive-title {
                font-size: 1.4rem;
                margin: 0 0 1.5rem 0;
                color: #dc2626;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                font-family: 'Inter', sans-serif;
            }

            .executive-premium .executive-summary {
                font-size: 1.1rem;
                margin: 0;
                opacity: 0.95;
                line-height: 1.7;
                font-style: italic;
            }

            .executive-premium .contact-sidebar {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                min-width: 220px;
                background: rgba(255, 255, 255, 0.1);
                padding: 1.5rem;
                border-radius: 8px;
                backdrop-filter: blur(10px);
            }

            .executive-premium .contact-item {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }

            .executive-premium .label {
                font-size: 0.8rem;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                color: rgba(255, 255, 255, 0.7);
                font-family: 'Inter', sans-serif;
                font-weight: 500;
            }

            .executive-premium .value {
                font-size: 0.95rem;
                color: #ffffff;
            }

            .executive-premium .link {
                text-decoration: none;
                border-bottom: 1px solid rgba(220, 38, 38, 0.5);
            }

            .executive-premium .link:hover {
                border-bottom-color: #dc2626;
            }

            .executive-premium .resume-main {
                padding: 2.5rem;
            }

            .executive-premium .section {
                margin-bottom: 3rem;
            }

            .executive-premium .section-title {
                font-size: 1.6rem;
                font-weight: 400;
                color: #dc2626;
                margin: 0 0 2rem 0;
                padding-bottom: 0.75rem;
                border-bottom: 2px solid #f1f5f9;
                position: relative;
                font-family: 'Playfair Display', serif;
            }

            .executive-premium .section-title::after {
                content: '';
                position: absolute;
                bottom: -2px;
                left: 0;
                width: 80px;
                height: 2px;
                background: #dc2626;
            }

            .executive-premium .executive-role {
                margin-bottom: 2.5rem;
                padding-bottom: 2rem;
                border-bottom: 1px solid #e2e8f0;
            }

            .executive-premium .executive-role:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }

            .executive-premium .role-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 1.5rem;
                gap: 2rem;
            }

            .executive-premium .position {
                font-size: 1.4rem;
                font-weight: 600;
                margin: 0;
                color: #1e293b;
                font-family: 'Inter', sans-serif;
            }

            .executive-premium .company {
                font-size: 1.1rem;
                font-weight: 400;
                margin: 0.5rem 0 0 0;
                color: #dc2626;
                font-style: italic;
            }

            .executive-premium .tenure {
                font-size: 1rem;
                color: #6b7280;
                font-weight: 500;
                white-space: nowrap;
                font-family: 'Inter', sans-serif;
            }

            .executive-premium .role-summary {
                font-size: 1.05rem;
                margin: 0 0 1.5rem 0;
                color: #374151;
                font-style: italic;
                line-height: 1.7;
            }

            .executive-premium .achievements-title {
                font-size: 1.1rem;
                font-weight: 600;
                margin: 0 0 1rem 0;
                color: #1e293b;
                font-family: 'Inter', sans-serif;
            }

            .executive-premium .achievement-list {
                margin: 0;
                padding-left: 1.5rem;
                list-style: none;
            }

            .executive-premium .achievement-list li {
                margin-bottom: 0.75rem;
                color: #374151;
                position: relative;
                padding-left: 1rem;
            }

            .executive-premium .achievement-list li::before {
                content: '▸';
                position: absolute;
                left: 0;
                color: #dc2626;
                font-weight: bold;
            }

            .executive-premium .two-column {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 3rem;
                margin-top: 2rem;
            }

            .executive-premium .education-item {
                margin-bottom: 1.5rem;
            }

            .executive-premium .degree {
                font-size: 1.1rem;
                font-weight: 600;
                margin: 0 0 0.5rem 0;
                color: #1e293b;
            }

            .executive-premium .institution {
                font-size: 1rem;
                margin: 0 0 0.25rem 0;
                color: #dc2626;
                font-style: italic;
            }

            .executive-premium .graduation {
                font-size: 0.9rem;
                margin: 0;
                color: #6b7280;
            }

            .executive-premium .competency-area {
                margin-bottom: 1.5rem;
            }

            .executive-premium .competency-title {
                font-size: 1rem;
                font-weight: 600;
                margin: 0 0 0.5rem 0;
                color: #1e293b;
            }

            .executive-premium .competency-details {
                font-size: 0.9rem;
                margin: 0;
                color: #6b7280;
                line-height: 1.6;
            }

            .executive-premium .initiative {
                margin-bottom: 1.5rem;
                padding: 1.25rem;
                background: #f8fafc;
                border-left: 4px solid #dc2626;
                border-radius: 0 4px 4px 0;
            }

            .executive-premium .initiative-name {
                font-size: 1.1rem;
                font-weight: 600;
                margin: 0 0 0.75rem 0;
                color: #1e293b;
            }

            .executive-premium .initiative-desc {
                font-size: 0.95rem;
                margin: 0 0 1rem 0;
                color: #4b5563;
                line-height: 1.6;
            }

            .executive-premium .initiative-link {
                color: #dc2626;
                text-decoration: none;
                font-weight: 600;
                font-size: 0.9rem;
                font-family: 'Inter', sans-serif;
            }

            .executive-premium .initiative-link:hover {
                text-decoration: underline;
            }

            @media print {
                .executive-premium {
                    box-shadow: none;
                    max-width: none;
                }

                .executive-premium .resume-header {
                    background: #1e293b !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }

            @media (max-width: 768px) {
                .executive-premium .resume-header {
                    flex-direction: column;
                    gap: 2rem;
                }

                .executive-premium .contact-sidebar {
                    min-width: auto;
                    width: 100%;
                }

                .executive-premium .role-header {
                    flex-direction: column;
                    gap: 1rem;
                }

                .executive-premium .two-column {
                    grid-template-columns: 1fr;
                    gap: 2rem;
                }
            }
        `;

        return { html, css };
    }
}

export default new JSONResumeService();
export type { JSONResume, ModernResumeTheme };