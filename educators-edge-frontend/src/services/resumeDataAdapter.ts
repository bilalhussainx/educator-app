/**
 * Resume Data Adapter
 * Converts Azure-analyzed resume data to CSS PDF Resume Template format
 */

import type { ResumeData, ExperienceItem, EducationItem, SkillCategory } from './cssPdfResumeTemplate';
import type { DocumentStructureResult } from './azureVisionDocumentStructureService';
import type { ResumeTemplate } from './enhancedResumeTemplateEngine';

class ResumeDataAdapter {
  /**
   * Convert Azure Document Intelligence result to ResumeData format
   */
  convertFromAzureAnalysis(analysisResult: DocumentStructureResult): ResumeData {
    console.log('🔄 Converting Azure analysis to ResumeData format...');

    const resumeData: ResumeData = {
      personalInfo: this.extractPersonalInfo(analysisResult),
      summary: this.extractSummary(analysisResult),
      experience: this.extractExperience(analysisResult),
      education: this.extractEducation(analysisResult),
      skills: this.extractSkills(analysisResult),
      projects: this.extractProjects(analysisResult),
      certifications: this.extractCertifications(analysisResult),
      customSections: this.extractCustomSections(analysisResult)
    };

    console.log('✅ Conversion complete:', {
      hasSummary: !!resumeData.summary,
      experienceCount: resumeData.experience?.length || 0,
      educationCount: resumeData.education?.length || 0,
      skillsCount: Array.isArray(resumeData.skills) ? resumeData.skills.length : 0
    });

    return resumeData;
  }

  /**
   * Convert from processed result format (from ModernResumeOptimizationPage or VisualContextResumeEditor)
   */
  convertFromProcessedResult(processedResult: any): ResumeData {
    console.log('🔄 Converting processed result to ResumeData format...', {
      hasStructuredData: !!processedResult.structuredData,
      hasSections: !!processedResult.sections,
      hasHTML: !!processedResult.editableHTML || !!processedResult.preservedHTML,
      hasText: !!processedResult.extractedText
    });

    // Extract from the structured data if available
    if (processedResult.structuredData) {
      return this.convertFromAzureAnalysis(processedResult.structuredData);
    }

    // Extract from HTML if available (from Visual Context Resume Editor)
    let extractedText = processedResult.extractedText || '';
    if (!extractedText && (processedResult.editableHTML || processedResult.preservedHTML)) {
      const html = processedResult.editableHTML || processedResult.preservedHTML;
      extractedText = this.extractTextFromHTML(html);
      console.log('📝 Extracted text from HTML:', extractedText.substring(0, 200));
    }

    // Extract name from text or HTML
    const name = processedResult.name || this.extractNameFromText(extractedText);
    const contact = this.extractContactInfo(extractedText);

    const resumeData: ResumeData = {
      personalInfo: {
        name: name || 'Your Name',
        email: contact.email,
        phone: contact.phone,
        location: contact.location,
        linkedin: contact.linkedin,
        website: contact.website
      },
      summary: this.extractSummaryFromText(extractedText),
      experience: this.parseExperienceFromSections(processedResult.sections || []),
      education: this.parseEducationFromSections(processedResult.sections || []),
      skills: this.parseSkillsFromSections(processedResult.sections || []),
    };

    console.log('✅ Resume data conversion complete:', {
      name: resumeData.personalInfo.name,
      hasSummary: !!resumeData.summary,
      experienceCount: resumeData.experience?.length || 0
    });

    return resumeData;
  }

  /**
   * Convert from ResumeTemplate format
   */
  convertFromTemplate(template: ResumeTemplate): ResumeData {
    console.log('🔄 Converting ResumeTemplate to ResumeData format...');

    const resumeData: ResumeData = {
      personalInfo: {
        name: template.personalInfo.name?.text || 'Your Name',
        email: template.personalInfo.email?.text,
        phone: template.personalInfo.phone?.text,
        location: template.personalInfo.address?.text,
        linkedin: template.personalInfo.linkedin?.text,
        website: template.personalInfo.website?.text
      },
      summary: this.extractSummaryFromSections(template.sections),
      experience: this.extractExperienceFromSections(template.sections),
      education: this.extractEducationFromSections(template.sections),
      skills: this.extractSkillsFromSections(template.sections),
      projects: this.extractProjectsFromSections(template.sections),
      certifications: this.extractCertificationsFromSections(template.sections)
    };

    return resumeData;
  }

  // ==================== AZURE ANALYSIS EXTRACTION ====================

  private extractPersonalInfo(analysisResult: DocumentStructureResult): ResumeData['personalInfo'] {
    const info = analysisResult.personalInfo;
    return {
      name: info.name || 'Your Name',
      email: info.email,
      phone: info.phone,
      location: info.address,
      linkedin: info.linkedin,
      website: info.website
    };
  }

  private extractSummary(analysisResult: DocumentStructureResult): string | undefined {
    const summarySection = analysisResult.sections.find(s =>
      s.type.toLowerCase().includes('summary') ||
      s.type.toLowerCase().includes('objective') ||
      s.type.toLowerCase().includes('profile')
    );

    if (summarySection?.elements && summarySection.elements.length > 0) {
      return summarySection.elements
        .filter(e => e.role === 'text' || e.role === 'paragraph')
        .map(e => e.text)
        .join(' ');
    }

    return undefined;
  }

  private extractExperience(analysisResult: DocumentStructureResult): ExperienceItem[] {
    const experienceSection = analysisResult.sections.find(s =>
      s.type.toLowerCase().includes('experience') ||
      s.type.toLowerCase().includes('work') ||
      s.type.toLowerCase().includes('employment')
    );

    if (!experienceSection?.elements) return [];

    const jobs: ExperienceItem[] = [];
    let currentJob: Partial<ExperienceItem> | null = null;

    for (const element of experienceSection.elements) {
      if (element.hierarchy === 1 || element.fontWeight === 'bold') {
        // New job entry
        if (currentJob && currentJob.position && currentJob.company) {
          jobs.push(currentJob as ExperienceItem);
        }

        const text = element.text;
        const dateMatch = text.match(/(\w+\s+\d{4})\s*[-–—]\s*(\w+\s+\d{4}|Present)/i);

        currentJob = {
          position: text.replace(/\s*[-–—]\s*\w+\s+\d{4}.*$/i, '').trim(),
          company: '',
          startDate: dateMatch?.[1] || '',
          endDate: dateMatch?.[2] || '',
          achievements: []
        };
      } else if (element.role === 'bulletPoint' && currentJob) {
        currentJob.achievements = currentJob.achievements || [];
        currentJob.achievements.push(element.text);
      } else if (element.role === 'text' && currentJob && !currentJob.company) {
        currentJob.company = element.text;
      }
    }

    if (currentJob && currentJob.position && currentJob.company) {
      jobs.push(currentJob as ExperienceItem);
    }

    return jobs;
  }

  private extractEducation(analysisResult: DocumentStructureResult): EducationItem[] {
    const educationSection = analysisResult.sections.find(s =>
      s.type.toLowerCase().includes('education')
    );

    if (!educationSection?.elements) return [];

    const education: EducationItem[] = [];
    let currentEdu: Partial<EducationItem> | null = null;

    for (const element of educationSection.elements) {
      if (element.hierarchy === 1 || element.fontWeight === 'bold') {
        if (currentEdu && currentEdu.degree && currentEdu.institution) {
          education.push(currentEdu as EducationItem);
        }

        currentEdu = {
          degree: element.text,
          institution: '',
          graduationDate: this.extractDateFromText(element.text),
          honors: []
        };
      } else if (element.role === 'text' && currentEdu && !currentEdu.institution) {
        currentEdu.institution = element.text;
      } else if (element.role === 'bulletPoint' && currentEdu) {
        currentEdu.honors = currentEdu.honors || [];
        currentEdu.honors.push(element.text);
      }
    }

    if (currentEdu && currentEdu.degree && currentEdu.institution) {
      education.push(currentEdu as EducationItem);
    }

    return education;
  }

  private extractSkills(analysisResult: DocumentStructureResult): string[] | SkillCategory[] {
    const skillsSection = analysisResult.sections.find(s =>
      s.type.toLowerCase().includes('skill') ||
      s.type.toLowerCase().includes('technical') ||
      s.type.toLowerCase().includes('competencies')
    );

    if (!skillsSection?.elements) return [];

    const skills: string[] = [];
    skillsSection.elements.forEach(element => {
      if (element.role === 'bulletPoint' || element.role === 'text') {
        // Split by common delimiters
        const skillList = element.text.split(/[,;|•]/).map(s => s.trim()).filter(s => s);
        skills.push(...skillList);
      }
    });

    return skills;
  }

  private extractProjects(analysisResult: DocumentStructureResult): any[] {
    const projectsSection = analysisResult.sections.find(s =>
      s.type.toLowerCase().includes('project')
    );

    if (!projectsSection?.elements) return [];

    const projects: any[] = [];
    let currentProject: any = null;

    for (const element of projectsSection.elements) {
      if (element.hierarchy === 1 || element.fontWeight === 'bold') {
        if (currentProject) projects.push(currentProject);
        currentProject = {
          name: element.text,
          description: '',
          technologies: []
        };
      } else if (element.role === 'text' && currentProject && !currentProject.description) {
        currentProject.description = element.text;
      } else if (element.role === 'bulletPoint' && currentProject) {
        currentProject.description += ' ' + element.text;
      }
    }

    if (currentProject) projects.push(currentProject);
    return projects;
  }

  private extractCertifications(analysisResult: DocumentStructureResult): string[] {
    const certsSection = analysisResult.sections.find(s =>
      s.type.toLowerCase().includes('certification') ||
      s.type.toLowerCase().includes('license')
    );

    if (!certsSection?.elements) return [];

    return certsSection.elements
      .filter(e => e.role === 'bulletPoint' || e.role === 'text')
      .map(e => e.text);
  }

  private extractCustomSections(analysisResult: DocumentStructureResult): any[] {
    // Extract sections that don't match standard types
    const standardTypes = ['experience', 'education', 'skills', 'summary', 'projects', 'certifications'];

    return analysisResult.sections
      .filter(s => !standardTypes.some(type => s.type.toLowerCase().includes(type)))
      .map(section => ({
        title: section.type,
        content: section.elements.map(e => e.text)
      }));
  }

  // ==================== TEMPLATE SECTION EXTRACTION ====================

  private extractSummaryFromSections(sections: any[]): string | undefined {
    const summarySection = sections.find(s =>
      s.title?.toLowerCase().includes('summary') ||
      s.title?.toLowerCase().includes('objective')
    );

    if (summarySection?.content) {
      return summarySection.content.map((c: any) => c.text).join(' ');
    }

    return undefined;
  }

  private extractExperienceFromSections(sections: any[]): ExperienceItem[] {
    const experienceSection = sections.find(s =>
      s.title?.toLowerCase().includes('experience')
    );

    if (!experienceSection?.content) return [];

    // Group content into job entries
    const jobs: ExperienceItem[] = [];
    let currentJob: Partial<ExperienceItem> | null = null;

    for (const item of experienceSection.content) {
      if (item.type === 'job-header' || item.hierarchy === 1) {
        if (currentJob && currentJob.position) {
          jobs.push(currentJob as ExperienceItem);
        }
        currentJob = {
          position: item.text,
          company: '',
          startDate: '',
          endDate: '',
          achievements: []
        };
      } else if (item.type === 'company' && currentJob) {
        currentJob.company = item.text;
      } else if (item.type === 'date-range' && currentJob) {
        const dates = item.text.split(/[-–—]/);
        currentJob.startDate = dates[0]?.trim() || '';
        currentJob.endDate = dates[1]?.trim() || '';
      } else if (item.type === 'bullet' && currentJob) {
        currentJob.achievements = currentJob.achievements || [];
        currentJob.achievements.push(item.text);
      }
    }

    if (currentJob && currentJob.position) {
      jobs.push(currentJob as ExperienceItem);
    }

    return jobs;
  }

  private extractEducationFromSections(sections: any[]): EducationItem[] {
    const educationSection = sections.find(s =>
      s.title?.toLowerCase().includes('education')
    );

    if (!educationSection?.content) return [];

    const education: EducationItem[] = [];
    let currentEdu: Partial<EducationItem> | null = null;

    for (const item of educationSection.content) {
      if (item.hierarchy === 1) {
        if (currentEdu && currentEdu.degree) {
          education.push(currentEdu as EducationItem);
        }
        currentEdu = {
          degree: item.text,
          institution: '',
          graduationDate: '',
          honors: []
        };
      } else if (item.type === 'text' && currentEdu && !currentEdu.institution) {
        currentEdu.institution = item.text;
      }
    }

    if (currentEdu && currentEdu.degree) {
      education.push(currentEdu as EducationItem);
    }

    return education;
  }

  private extractSkillsFromSections(sections: any[]): string[] {
    const skillsSection = sections.find(s =>
      s.title?.toLowerCase().includes('skill')
    );

    if (!skillsSection?.content) return [];

    return skillsSection.content
      .filter((c: any) => c.type === 'bullet' || c.type === 'text')
      .map((c: any) => c.text);
  }

  private extractProjectsFromSections(sections: any[]): any[] {
    const projectsSection = sections.find(s =>
      s.title?.toLowerCase().includes('project')
    );

    if (!projectsSection?.content) return [];

    // Simple extraction
    return [{
      name: 'Projects',
      description: projectsSection.content.map((c: any) => c.text).join(' ')
    }];
  }

  private extractCertificationsFromSections(sections: any[]): string[] {
    const certsSection = sections.find(s =>
      s.title?.toLowerCase().includes('certification')
    );

    if (!certsSection?.content) return [];

    return certsSection.content.map((c: any) => c.text);
  }

  // ==================== TEXT PARSING HELPERS ====================

  private parseExperienceFromSections(sections: any[]): ExperienceItem[] {
    if (!sections || sections.length === 0) {
      console.log('⚠️ No sections provided for experience extraction');
      return [];
    }

    console.log('🔍 Parsing experience from sections:', sections.map(s => s.title || s.type));

    const experienceSection = sections.find((s: any) =>
      s.title?.toLowerCase().includes('experience') ||
      s.title?.toLowerCase().includes('work') ||
      s.title?.toLowerCase().includes('employment') ||
      s.type?.toLowerCase().includes('experience')
    );

    if (!experienceSection) {
      console.log('⚠️ No experience section found');
      return [];
    }

    console.log('✅ Found experience section:', experienceSection.title || experienceSection.type);

    const experiences: ExperienceItem[] = [];

    // Extract from formattedHtml or content
    if (experienceSection.formattedHtml) {
      console.log('📄 Parsing from formattedHtml');
      const text = experienceSection.formattedHtml.replace(/<[^>]*>/g, '\n');
      const lines = text.split('\n').filter((l: string) => l.trim());

      const achievements: string[] = [];
      const liMatches = experienceSection.formattedHtml.matchAll(/<li[^>]*>(.*?)<\/li>/gs);
      for (const match of liMatches) {
        const cleanText = match[1].replace(/<[^>]*>/g, '').trim();
        if (cleanText) achievements.push(cleanText);
      }

      // Try to parse position/company from strong/bold tags
      const strongMatches = experienceSection.formattedHtml.matchAll(/<strong[^>]*>(.*?)<\/strong>/gs);
      const boldTexts = Array.from(strongMatches).map(m => m[1].replace(/<[^>]*>/g, '').trim());

      if (boldTexts.length > 0) {
        experiences.push({
          position: boldTexts[0] || 'Position',
          company: boldTexts[1] || 'Company',
          startDate: 'Start Date',
          endDate: 'Present',
          achievements: achievements
        });
      } else if (achievements.length > 0) {
        experiences.push({
          position: 'Professional Experience',
          company: 'Company',
          startDate: 'Start Date',
          endDate: 'Present',
          achievements: achievements
        });
      }
    }

    // Fallback: parse from content array
    if (experiences.length === 0 && experienceSection.content) {
      console.log('📄 Parsing from content array');
      const content = Array.isArray(experienceSection.content)
        ? experienceSection.content
        : [experienceSection.content];

      const achievements = content
        .filter((c: any) => typeof c === 'string' || c?.text)
        .map((c: any) => typeof c === 'string' ? c : c.text)
        .filter(Boolean);

      if (achievements.length > 0) {
        experiences.push({
          position: 'Professional Experience',
          company: 'See Details',
          startDate: 'Various',
          endDate: 'Present',
          achievements: achievements
        });
      }
    }

    console.log(`✅ Extracted ${experiences.length} experience items with ${experiences.reduce((sum, e) => sum + (e.achievements?.length || 0), 0)} total achievements`);

    return experiences;
  }

  private parseEducationFromSections(sections: any[]): EducationItem[] {
    const educationSection = sections.find((s: any) =>
      s.title?.toLowerCase().includes('education')
    );

    if (!educationSection) return [];

    return [{
      degree: 'Degree',
      institution: 'Institution',
      graduationDate: 'Graduation Date'
    }];
  }

  private parseSkillsFromSections(sections: any[]): string[] {
    if (!sections || sections.length === 0) return [];

    const skillsSection = sections.find((s: any) =>
      s.title?.toLowerCase().includes('skill') ||
      s.title?.toLowerCase().includes('technical') ||
      s.type?.toLowerCase().includes('skill')
    );

    if (!skillsSection) {
      console.log('⚠️ No skills section found');
      return [];
    }

    console.log('✅ Found skills section:', skillsSection.title || skillsSection.type);

    const skills: string[] = [];

    // Parse from formattedHtml
    if (skillsSection.formattedHtml) {
      console.log('📄 Parsing skills from formattedHtml');

      // Extract from list items
      const liMatches = skillsSection.formattedHtml.matchAll(/<li[^>]*>(.*?)<\/li>/gs);
      for (const match of liMatches) {
        const cleanText = match[1].replace(/<[^>]*>/g, '').trim();
        if (cleanText) {
          // Split by common delimiters
          const splitSkills = cleanText.split(/[,;•|]/).map(s => s.trim()).filter(Boolean);
          skills.push(...splitSkills);
        }
      }

      // If no list items, parse from text
      if (skills.length === 0) {
        const text = skillsSection.formattedHtml.replace(/<[^>]*>/g, ' ');
        const splitSkills = text.split(/[,;•|\n]/).map((s: string) => s.trim()).filter(Boolean);
        skills.push(...splitSkills);
      }
    }

    // Parse from content array
    if (skills.length === 0 && skillsSection.content) {
      console.log('📄 Parsing skills from content array');
      const content = Array.isArray(skillsSection.content)
        ? skillsSection.content
        : [skillsSection.content];

      content.forEach((c: any) => {
        const text = typeof c === 'string' ? c : c?.text || '';
        if (text) {
          const splitSkills = text.split(/[,;•|]/).map((s: string) => s.trim()).filter(Boolean);
          skills.push(...splitSkills);
        }
      });
    }

    console.log(`✅ Extracted ${skills.length} skills`);
    return skills.slice(0, 20); // Limit to first 20 skills
  }

  private extractNameFromText(text: string): string | null {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.length < 50 && /^[A-Za-z\s.'-]+$/.test(firstLine)) {
        return firstLine;
      }
    }
    return null;
  }

  private extractContactInfo(text: string) {
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = text.match(/(?:\+?1[-.]?)?(?:\(?[0-9]{3}\)?[-.]?[0-9]{3}[-.]?[0-9]{4})/);
    const linkedinMatch = text.match(/(?:linkedin\.com\/in\/|linkedin:)\s*([a-zA-Z0-9-]+)/i);

    return {
      email: emailMatch?.[0],
      phone: phoneMatch?.[0],
      location: undefined,
      linkedin: linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : undefined,
      website: undefined
    };
  }

  private extractSummaryFromText(text: string): string | undefined {
    const lines = text.split('\n');
    const summaryStart = lines.findIndex(l =>
      l.toLowerCase().includes('summary') ||
      l.toLowerCase().includes('objective')
    );

    if (summaryStart >= 0 && summaryStart < lines.length - 1) {
      // Get next few lines after summary heading
      return lines.slice(summaryStart + 1, summaryStart + 5)
        .filter(l => l.trim() && !l.match(/^[A-Z\s]+$/))
        .join(' ')
        .substring(0, 500);
    }

    return undefined;
  }

  private extractDateFromText(text: string): string {
    const dateMatch = text.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{4})\b/i);
    return dateMatch?.[0] || '';
  }

  /**
   * Extract text from HTML
   */
  private extractTextFromHTML(html: string): string {
    if (typeof document !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      return tempDiv.textContent || tempDiv.innerText || '';
    }
    // Fallback: strip HTML tags with regex
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

export default new ResumeDataAdapter();
