/**
 * CSS PDF Resume Template
 * Generates print-ready HTML/CSS resume templates that can be exported as PDF
 * Focus: Clean, professional layouts optimized for browser-to-PDF rendering
 */

export interface ResumeData {
  personalInfo: {
    name: string;
    title?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    website?: string;
    portfolio?: string;
  };
  summary?: string;
  experience?: ExperienceItem[];
  education?: EducationItem[];
  skills?: string[] | SkillCategory[];
  projects?: ProjectItem[];
  certifications?: string[];
  customSections?: CustomSection[];
}

export interface ExperienceItem {
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate: string;
  description?: string;
  achievements?: string[];
}

export interface EducationItem {
  institution: string;
  degree: string;
  field?: string;
  location?: string;
  graduationDate: string;
  gpa?: string;
  honors?: string[];
}

export interface SkillCategory {
  category: string;
  skills: string[];
}

export interface ProjectItem {
  name: string;
  description: string;
  technologies?: string[];
  link?: string;
  date?: string;
}

export interface CustomSection {
  title: string;
  content: string | string[];
}

export type TemplateStyle = 'modern' | 'classic' | 'minimal' | 'executive';

export interface TemplateOptions {
  style?: TemplateStyle;
  accentColor?: string;
  fontSize?: number;
  lineHeight?: number;
  sectionSpacing?: number;
}

class CssPdfResumeTemplate {
  /**
   * Generate complete HTML resume with embedded CSS
   */
  generateResume(data: ResumeData, options: TemplateOptions = {}): string {
    const style = options.style || 'modern';

    switch (style) {
      case 'modern':
        return this.generateModernTemplate(data, options);
      case 'classic':
        return this.generateClassicTemplate(data, options);
      case 'minimal':
        return this.generateMinimalTemplate(data, options);
      case 'executive':
        return this.generateExecutiveTemplate(data, options);
      default:
        return this.generateModernTemplate(data, options);
    }
  }

  /**
   * Modern template - clean, professional with accent colors
   */
  private generateModernTemplate(data: ResumeData, options: TemplateOptions): string {
    const accentColor = options.accentColor || '#2563eb';
    const fontSize = options.fontSize || 11;

    const css = this.getModernCSS(accentColor, fontSize);
    const html = this.buildModernHTML(data);

    return this.wrapInDocument(html, css, 'Modern Professional Resume');
  }

  /**
   * Classic template - traditional, conservative styling
   */
  private generateClassicTemplate(data: ResumeData, options: TemplateOptions): string {
    const accentColor = options.accentColor || '#000000';
    const fontSize = options.fontSize || 11;

    const css = this.getClassicCSS(accentColor, fontSize);
    const html = this.buildClassicHTML(data);

    return this.wrapInDocument(html, css, 'Classic Resume');
  }

  /**
   * Minimal template - ultra-clean, content-focused
   */
  private generateMinimalTemplate(data: ResumeData, options: TemplateOptions): string {
    const accentColor = options.accentColor || '#333333';
    const fontSize = options.fontSize || 10.5;

    const css = this.getMinimalCSS(accentColor, fontSize);
    const html = this.buildMinimalHTML(data);

    return this.wrapInDocument(html, css, 'Minimal Resume');
  }

  /**
   * Executive template - bold, impactful for senior positions
   */
  private generateExecutiveTemplate(data: ResumeData, options: TemplateOptions): string {
    const accentColor = options.accentColor || '#1a1a1a';
    const fontSize = options.fontSize || 11;

    const css = this.getExecutiveCSS(accentColor, fontSize);
    const html = this.buildExecutiveHTML(data);

    return this.wrapInDocument(html, css, 'Executive Resume');
  }

  /**
   * Modern CSS Styles
   */
  private getModernCSS(accentColor: string, fontSize: number): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      @page {
        size: A4;
        margin: 0;
      }

      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }

      body {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: ${fontSize}pt;
        line-height: 1.5;
        color: #1a1a1a;
        background: white;
        padding: 0.75in;
        max-width: 8.5in;
        margin: 0 auto;
      }

      .header {
        text-align: center;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 3px solid ${accentColor};
      }

      .header h1 {
        font-size: ${fontSize + 10}pt;
        font-weight: 700;
        color: #000000;
        margin-bottom: 4px;
        letter-spacing: 0.5px;
      }

      .header .title {
        font-size: ${fontSize + 2}pt;
        color: ${accentColor};
        font-weight: 600;
        margin-bottom: 8px;
      }

      .contact-info {
        font-size: ${fontSize - 1}pt;
        color: #4a5568;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px 16px;
      }

      .contact-info span::after {
        content: '|';
        margin-left: 16px;
        color: #cbd5e0;
      }

      .contact-info span:last-child::after {
        content: '';
      }

      .section {
        margin-bottom: 20px;
        page-break-inside: avoid;
      }

      .section-title {
        font-size: ${fontSize + 3}pt;
        font-weight: 700;
        color: ${accentColor};
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 12px;
        padding-bottom: 4px;
        border-bottom: 2px solid ${accentColor};
      }

      .summary {
        font-size: ${fontSize}pt;
        line-height: 1.6;
        color: #2d3748;
        text-align: justify;
      }

      .experience-item,
      .education-item,
      .project-item {
        margin-bottom: 16px;
        page-break-inside: avoid;
      }

      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 4px;
      }

      .item-title {
        font-size: ${fontSize + 1}pt;
        font-weight: 700;
        color: #1a202c;
      }

      .item-subtitle {
        font-size: ${fontSize}pt;
        font-weight: 600;
        color: #4a5568;
        margin-bottom: 2px;
      }

      .item-date {
        font-size: ${fontSize - 0.5}pt;
        color: #718096;
        font-style: italic;
        white-space: nowrap;
      }

      .item-location {
        font-size: ${fontSize - 0.5}pt;
        color: #718096;
        margin-bottom: 6px;
      }

      .description {
        font-size: ${fontSize - 0.5}pt;
        color: #4a5568;
        margin-bottom: 6px;
        line-height: 1.5;
      }

      .achievements {
        list-style-type: none;
        padding-left: 0;
      }

      .achievements li {
        font-size: ${fontSize - 0.5}pt;
        color: #2d3748;
        line-height: 1.5;
        margin-bottom: 4px;
        padding-left: 16px;
        position: relative;
      }

      .achievements li::before {
        content: '▸';
        position: absolute;
        left: 0;
        color: ${accentColor};
        font-weight: bold;
      }

      .skills-container {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .skill-tag {
        background: ${accentColor}15;
        color: ${accentColor};
        padding: 4px 12px;
        border-radius: 4px;
        font-size: ${fontSize - 1}pt;
        font-weight: 500;
        border: 1px solid ${accentColor}30;
      }

      .skill-category {
        margin-bottom: 10px;
      }

      .skill-category-title {
        font-size: ${fontSize}pt;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 6px;
      }

      .skill-category-items {
        font-size: ${fontSize - 0.5}pt;
        color: #4a5568;
        line-height: 1.5;
      }

      .certification-list {
        list-style-type: none;
        padding-left: 0;
      }

      .certification-list li {
        font-size: ${fontSize}pt;
        color: #2d3748;
        margin-bottom: 6px;
        padding-left: 16px;
        position: relative;
      }

      .certification-list li::before {
        content: '✓';
        position: absolute;
        left: 0;
        color: ${accentColor};
        font-weight: bold;
      }

      a {
        color: ${accentColor};
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }
    `;
  }

  /**
   * Classic CSS Styles
   */
  private getClassicCSS(accentColor: string, fontSize: number): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      @page {
        size: A4;
        margin: 0;
      }

      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }

      body {
        font-family: 'Times New Roman', serif;
        font-size: ${fontSize}pt;
        line-height: 1.4;
        color: #000000;
        background: white;
        padding: 1in;
        max-width: 8.5in;
        margin: 0 auto;
      }

      .header {
        text-align: center;
        margin-bottom: 24px;
        padding-bottom: 12px;
        border-bottom: 2px solid #000000;
      }

      .header h1 {
        font-size: ${fontSize + 6}pt;
        font-weight: 700;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 2px;
      }

      .contact-info {
        font-size: ${fontSize - 1}pt;
        line-height: 1.6;
      }

      .section {
        margin-bottom: 18px;
        page-break-inside: avoid;
      }

      .section-title {
        font-size: ${fontSize + 2}pt;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        margin-bottom: 10px;
        padding-bottom: 3px;
        border-bottom: 1px solid #000000;
      }

      .experience-item,
      .education-item {
        margin-bottom: 14px;
        page-break-inside: avoid;
      }

      .item-header {
        margin-bottom: 4px;
      }

      .item-title {
        font-size: ${fontSize + 1}pt;
        font-weight: 700;
      }

      .item-subtitle {
        font-size: ${fontSize}pt;
        font-style: italic;
        margin-bottom: 2px;
      }

      .item-date {
        font-size: ${fontSize - 0.5}pt;
        margin-bottom: 6px;
      }

      .achievements {
        list-style-type: disc;
        margin-left: 20px;
      }

      .achievements li {
        font-size: ${fontSize - 0.5}pt;
        line-height: 1.4;
        margin-bottom: 3px;
      }
    `;
  }

  /**
   * Minimal CSS Styles
   */
  private getMinimalCSS(accentColor: string, fontSize: number): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      @page {
        size: A4;
        margin: 0;
      }

      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }

      body {
        font-family: 'Helvetica', 'Arial', sans-serif;
        font-size: ${fontSize}pt;
        line-height: 1.6;
        color: #333333;
        background: white;
        padding: 0.5in;
        max-width: 8.5in;
        margin: 0 auto;
      }

      .header {
        margin-bottom: 32px;
      }

      .header h1 {
        font-size: ${fontSize + 12}pt;
        font-weight: 300;
        margin-bottom: 6px;
        letter-spacing: -0.5px;
      }

      .contact-info {
        font-size: ${fontSize - 1}pt;
        color: #666666;
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }

      .section {
        margin-bottom: 28px;
        page-break-inside: avoid;
      }

      .section-title {
        font-size: ${fontSize + 1}pt;
        font-weight: 600;
        margin-bottom: 12px;
        padding-bottom: 6px;
        border-bottom: 1px solid #e0e0e0;
      }

      .experience-item,
      .education-item {
        margin-bottom: 18px;
        page-break-inside: avoid;
      }

      .item-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
      }

      .item-title {
        font-size: ${fontSize + 1}pt;
        font-weight: 600;
      }

      .item-subtitle {
        font-size: ${fontSize}pt;
        color: #666666;
        margin-bottom: 6px;
      }

      .item-date {
        font-size: ${fontSize - 1}pt;
        color: #999999;
      }

      .achievements {
        list-style: none;
        padding-left: 0;
      }

      .achievements li {
        font-size: ${fontSize - 0.5}pt;
        line-height: 1.5;
        margin-bottom: 4px;
        padding-left: 12px;
        position: relative;
      }

      .achievements li::before {
        content: '–';
        position: absolute;
        left: 0;
      }
    `;
  }

  /**
   * Executive CSS Styles
   */
  private getExecutiveCSS(accentColor: string, fontSize: number): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      @page {
        size: A4;
        margin: 0;
      }

      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }

      body {
        font-family: 'Georgia', serif;
        font-size: ${fontSize}pt;
        line-height: 1.5;
        color: #1a1a1a;
        background: white;
        padding: 0.75in;
        max-width: 8.5in;
        margin: 0 auto;
      }

      .header {
        margin-bottom: 28px;
        padding-bottom: 20px;
        border-bottom: 4px solid ${accentColor};
      }

      .header h1 {
        font-size: ${fontSize + 14}pt;
        font-weight: 700;
        margin-bottom: 8px;
        letter-spacing: 1px;
      }

      .header .title {
        font-size: ${fontSize + 3}pt;
        font-weight: 600;
        color: #4a4a4a;
        margin-bottom: 12px;
      }

      .contact-info {
        font-size: ${fontSize}pt;
        color: #5a5a5a;
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
      }

      .section {
        margin-bottom: 24px;
        page-break-inside: avoid;
      }

      .section-title {
        font-size: ${fontSize + 4}pt;
        font-weight: 700;
        margin-bottom: 14px;
        padding-bottom: 6px;
        border-bottom: 3px solid ${accentColor};
      }

      .summary {
        font-size: ${fontSize + 1}pt;
        line-height: 1.7;
        font-style: italic;
        color: #2a2a2a;
      }

      .experience-item {
        margin-bottom: 20px;
        page-break-inside: avoid;
      }

      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 6px;
      }

      .item-title {
        font-size: ${fontSize + 2}pt;
        font-weight: 700;
      }

      .item-subtitle {
        font-size: ${fontSize + 1}pt;
        font-weight: 600;
        color: #4a4a4a;
        margin-bottom: 4px;
      }

      .item-date {
        font-size: ${fontSize}pt;
        color: #6a6a6a;
      }

      .achievements {
        list-style: none;
        padding-left: 0;
      }

      .achievements li {
        font-size: ${fontSize}pt;
        line-height: 1.6;
        margin-bottom: 6px;
        padding-left: 20px;
        position: relative;
      }

      .achievements li::before {
        content: '●';
        position: absolute;
        left: 0;
        color: ${accentColor};
        font-size: 8pt;
      }
    `;
  }

  /**
   * Build Modern HTML
   */
  private buildModernHTML(data: ResumeData): string {
    let html = '<div class="resume-container">';

    // Header
    html += this.buildHeader(data.personalInfo);

    // Summary
    if (data.summary) {
      html += `
        <div class="section">
          <div class="section-title">Professional Summary</div>
          <div class="summary">${this.escapeHtml(data.summary)}</div>
        </div>
      `;
    }

    // Experience
    if (data.experience && data.experience.length > 0) {
      html += '<div class="section">';
      html += '<div class="section-title">Professional Experience</div>';
      data.experience.forEach(exp => {
        html += this.buildExperienceItem(exp);
      });
      html += '</div>';
    }

    // Education
    if (data.education && data.education.length > 0) {
      html += '<div class="section">';
      html += '<div class="section-title">Education</div>';
      data.education.forEach(edu => {
        html += this.buildEducationItem(edu);
      });
      html += '</div>';
    }

    // Skills
    if (data.skills && data.skills.length > 0) {
      html += '<div class="section">';
      html += '<div class="section-title">Skills</div>';
      html += this.buildSkills(data.skills);
      html += '</div>';
    }

    // Projects
    if (data.projects && data.projects.length > 0) {
      html += '<div class="section">';
      html += '<div class="section-title">Projects</div>';
      data.projects.forEach(project => {
        html += this.buildProjectItem(project);
      });
      html += '</div>';
    }

    // Certifications
    if (data.certifications && data.certifications.length > 0) {
      html += '<div class="section">';
      html += '<div class="section-title">Certifications</div>';
      html += '<ul class="certification-list">';
      data.certifications.forEach(cert => {
        html += `<li>${this.escapeHtml(cert)}</li>`;
      });
      html += '</ul></div>';
    }

    // Custom Sections
    if (data.customSections && data.customSections.length > 0) {
      data.customSections.forEach(section => {
        html += this.buildCustomSection(section);
      });
    }

    html += '</div>';
    return html;
  }

  private buildClassicHTML(data: ResumeData): string {
    return this.buildModernHTML(data); // Same structure, different CSS
  }

  private buildMinimalHTML(data: ResumeData): string {
    return this.buildModernHTML(data); // Same structure, different CSS
  }

  private buildExecutiveHTML(data: ResumeData): string {
    return this.buildModernHTML(data); // Same structure, different CSS
  }

  /**
   * Build header section
   */
  private buildHeader(info: ResumeData['personalInfo']): string {
    let html = '<div class="header">';
    html += `<h1>${this.escapeHtml(info.name)}</h1>`;

    if (info.title) {
      html += `<div class="title">${this.escapeHtml(info.title)}</div>`;
    }

    html += '<div class="contact-info">';
    const contacts = [];
    if (info.email) contacts.push(`<span>${this.escapeHtml(info.email)}</span>`);
    if (info.phone) contacts.push(`<span>${this.escapeHtml(info.phone)}</span>`);
    if (info.location) contacts.push(`<span>${this.escapeHtml(info.location)}</span>`);
    if (info.linkedin) contacts.push(`<span><a href="${info.linkedin}">LinkedIn</a></span>`);
    if (info.website) contacts.push(`<span><a href="${info.website}">Website</a></span>`);
    if (info.portfolio) contacts.push(`<span><a href="${info.portfolio}">Portfolio</a></span>`);

    html += contacts.join('\n');
    html += '</div></div>';

    return html;
  }

  /**
   * Build experience item
   */
  private buildExperienceItem(exp: ExperienceItem): string {
    let html = '<div class="experience-item">';
    html += '<div class="item-header">';
    html += `<div class="item-title">${this.escapeHtml(exp.position)}</div>`;
    html += `<div class="item-date">${this.escapeHtml(exp.startDate)} – ${this.escapeHtml(exp.endDate)}</div>`;
    html += '</div>';
    html += `<div class="item-subtitle">${this.escapeHtml(exp.company)}</div>`;

    if (exp.location) {
      html += `<div class="item-location">${this.escapeHtml(exp.location)}</div>`;
    }

    if (exp.description) {
      html += `<div class="description">${this.escapeHtml(exp.description)}</div>`;
    }

    if (exp.achievements && exp.achievements.length > 0) {
      html += '<ul class="achievements">';
      exp.achievements.forEach(achievement => {
        html += `<li>${this.escapeHtml(achievement)}</li>`;
      });
      html += '</ul>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Build education item
   */
  private buildEducationItem(edu: EducationItem): string {
    let html = '<div class="education-item">';
    html += '<div class="item-header">';
    html += `<div class="item-title">${this.escapeHtml(edu.degree)}${edu.field ? ' in ' + this.escapeHtml(edu.field) : ''}</div>`;
    html += `<div class="item-date">${this.escapeHtml(edu.graduationDate)}</div>`;
    html += '</div>';
    html += `<div class="item-subtitle">${this.escapeHtml(edu.institution)}</div>`;

    if (edu.location) {
      html += `<div class="item-location">${this.escapeHtml(edu.location)}</div>`;
    }

    if (edu.gpa) {
      html += `<div class="description">GPA: ${this.escapeHtml(edu.gpa)}</div>`;
    }

    if (edu.honors && edu.honors.length > 0) {
      html += '<ul class="achievements">';
      edu.honors.forEach(honor => {
        html += `<li>${this.escapeHtml(honor)}</li>`;
      });
      html += '</ul>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Build skills section
   */
  private buildSkills(skills: string[] | SkillCategory[]): string {
    if (Array.isArray(skills) && skills.length > 0) {
      if (typeof skills[0] === 'string') {
        // Simple skill list
        return `
          <div class="skills-container">
            ${(skills as string[]).map(skill =>
              `<span class="skill-tag">${this.escapeHtml(skill)}</span>`
            ).join('\n')}
          </div>
        `;
      } else {
        // Categorized skills
        return (skills as SkillCategory[]).map(category => `
          <div class="skill-category">
            <div class="skill-category-title">${this.escapeHtml(category.category)}</div>
            <div class="skill-category-items">${category.skills.map(s => this.escapeHtml(s)).join(' • ')}</div>
          </div>
        `).join('');
      }
    }
    return '';
  }

  /**
   * Build project item
   */
  private buildProjectItem(project: ProjectItem): string {
    let html = '<div class="project-item">';
    html += '<div class="item-header">';
    html += `<div class="item-title">${this.escapeHtml(project.name)}</div>`;
    if (project.date) {
      html += `<div class="item-date">${this.escapeHtml(project.date)}</div>`;
    }
    html += '</div>';

    html += `<div class="description">${this.escapeHtml(project.description)}</div>`;

    if (project.technologies && project.technologies.length > 0) {
      html += `<div class="description"><strong>Technologies:</strong> ${project.technologies.map(t => this.escapeHtml(t)).join(', ')}</div>`;
    }

    if (project.link) {
      html += `<div class="description"><a href="${project.link}">${project.link}</a></div>`;
    }

    html += '</div>';
    return html;
  }

  /**
   * Build custom section
   */
  private buildCustomSection(section: CustomSection): string {
    let html = '<div class="section">';
    html += `<div class="section-title">${this.escapeHtml(section.title)}</div>`;

    if (typeof section.content === 'string') {
      html += `<div class="description">${this.escapeHtml(section.content)}</div>`;
    } else {
      html += '<ul class="achievements">';
      section.content.forEach(item => {
        html += `<li>${this.escapeHtml(item)}</li>`;
      });
      html += '</ul>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Wrap HTML in complete document
   */
  private wrapInDocument(html: string, css: string, title: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${css}</style>
</head>
<body>
  ${html}
</body>
</html>`;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Convert resume HTML to PDF via browser print
   */
  printToPDF(htmlContent: string): void {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  }

  /**
   * Download HTML file
   */
  downloadHTML(htmlContent: string, filename: string = 'resume.html'): void {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export default new CssPdfResumeTemplate();
