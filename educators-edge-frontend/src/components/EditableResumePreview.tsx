import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Type,
    Palette,
    Save,
    Download,
    Undo,
    Redo,
    Eye,
    Edit3,
    Plus,
    Trash2,
    Copy,
    Scissors,
    FileText,
    Highlighter,
    Indent,
    Outdent,
    Search,
    MoreHorizontal,
    Strikethrough,
    Subscript,
    Superscript
} from 'lucide-react';

interface EditableResumePreviewProps {
    initialContent?: string;
    template?: any;
    onSave?: (content: string) => void;
    onDownload?: (format: 'pdf' | 'docx' | 'html') => void;
    isEditable?: boolean;
}

interface FormatCommand {
    command: string;
    value?: string;
}

const EditableResumePreview: React.FC<EditableResumePreviewProps> = ({
    initialContent = '',
    template,
    onSave,
    onDownload,
    isEditable = true
}) => {
    const [content, setContent] = useState(initialContent);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [fontSize, setFontSize] = useState(12);
    const [fontFamily, setFontFamily] = useState('Times New Roman');
    const [textColor, setTextColor] = useState('#000000');
    const [lineSpacing, setLineSpacing] = useState(1.15);
    const [showFindReplace, setShowFindReplace] = useState(false);
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const editorRef = useRef<HTMLDivElement>(null);
    const [history, setHistory] = useState<string[]>([initialContent]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Font options for resumes
    const fontOptions = [
        'Times New Roman',
        'Arial',
        'Calibri',
        'Georgia',
        'Verdana',
        'Helvetica',
        'Garamond'
    ];

    const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24];
    const lineSpacingOptions = [1.0, 1.15, 1.5, 2.0, 2.5, 3.0];
    const textColors = ['#000000', '#1f2937', '#dc2626', '#059669', '#2563eb', '#7c3aed', '#b45309'];

    // Initialize editor content
    useEffect(() => {
        if (editorRef.current && initialContent) {
            // Convert plain text to basic HTML structure for editing
            const htmlContent = convertTextToHTML(initialContent);
            editorRef.current.innerHTML = htmlContent;
        }
    }, [initialContent]);

    // Convert plain text to HTML for editing with enhanced formatting detection
    const convertTextToHTML = (text: string): string => {
        if (!text) return '';

        // Check if the text is already HTML (from Azure Document Intelligence)
        if (text.includes('<') && text.includes('>')) {
            // Text is already formatted HTML, just clean it up
            return text
                .replace(/<li>/g, '<li style="margin: 5px 0; line-height: 1.4;">')
                .replace(/<ul>/g, '<ul style="margin: 10px 0; padding-left: 20px;">')
                .replace(/<p>/g, '<p style="margin: 8px 0; line-height: 1.5;">')
                .replace(/<h3>/g, '<h3 style="font-weight: bold; font-size: 14px; margin: 15px 0 5px 0;">')
                .replace(/<h2>/g, '<h2 style="font-weight: bold; font-size: 16px; margin: 20px 0 10px 0; text-transform: uppercase; border-bottom: 1px solid #333;">');
        }

        // Process plain text with enhanced formatting detection
        const lines = text.split('\n');
        const processedLines: string[] = [];
        let inBulletList = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (!trimmed) {
                if (inBulletList) {
                    processedLines.push('</ul>');
                    inBulletList = false;
                }
                processedLines.push('<br>');
                continue;
            }

            // Detect formatting patterns
            const isSection = trimmed.match(/^[A-Z\s&]+$/) && trimmed.length > 3 && trimmed.length < 50;
            const isJobTitle = trimmed.includes(' - ') || trimmed.includes(' | ');
            const isBullet = /^[•▪▫◦‣⁃▸▹▪▫⦿⦾\-–—*]\s/.test(trimmed);
            const isDate = trimmed.match(/\d{4}|present|current/i) && trimmed.length < 30;

            // Handle bullet points with proper list structure
            if (isBullet) {
                if (!inBulletList) {
                    processedLines.push('<ul style="margin: 10px 0; padding-left: 20px;">');
                    inBulletList = true;
                }
                const bulletText = trimmed.replace(/^[•▪▫◦‣⁃▸▹▪▫⦿⦾\-–—*]\s*/, '');
                processedLines.push(`<li style="margin: 5px 0; line-height: 1.4;">${bulletText}</li>`);
            } else {
                // Close bullet list if we were in one
                if (inBulletList) {
                    processedLines.push('</ul>');
                    inBulletList = false;
                }

                // Process other line types
                if (isSection) {
                    processedLines.push(`<h2 style="font-weight: bold; font-size: 16px; margin: 20px 0 10px 0; text-transform: uppercase; border-bottom: 1px solid #333;">${trimmed}</h2>`);
                } else if (isJobTitle) {
                    processedLines.push(`<h3 style="font-weight: bold; font-size: 14px; margin: 15px 0 5px 0;">${trimmed}</h3>`);
                } else if (isDate) {
                    processedLines.push(`<p style="font-style: italic; color: #666; margin: 5px 0;">${trimmed}</p>`);
                } else {
                    // Check for bold text indicators (all caps short phrases)
                    if (trimmed === trimmed.toUpperCase() && trimmed.length < 30 && /^[A-Z\s&:-]+$/.test(trimmed)) {
                        processedLines.push(`<p style="margin: 8px 0; line-height: 1.5;"><strong>${trimmed}</strong></p>`);
                    } else {
                        processedLines.push(`<p style="margin: 8px 0; line-height: 1.5;">${trimmed}</p>`);
                    }
                }
            }
        }

        // Close any open bullet list
        if (inBulletList) {
            processedLines.push('</ul>');
        }

        return processedLines.join('');
    };

    // Execute formatting command
    const execCommand = useCallback((command: FormatCommand) => {
        if (!editorRef.current) return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        document.execCommand(command.command, false, command.value);

        // Save to history
        const newContent = editorRef.current.innerHTML;
        saveToHistory(newContent);
        setContent(newContent);
    }, []);

    // Enhanced formatting functions
    const setTextColorAction = useCallback((color: string) => {
        setTextColor(color);
        execCommand({ command: 'foreColor', value: color });
    }, [execCommand]);

    const setLineSpacingAction = useCallback((spacing: number) => {
        setLineSpacing(spacing);
        if (editorRef.current) {
            editorRef.current.style.lineHeight = spacing.toString();
            const newContent = editorRef.current.innerHTML;
            saveToHistory(newContent);
            setContent(newContent);
        }
    }, []);

    const findAndReplace = useCallback(() => {
        if (!editorRef.current || !findText) return;

        const content = editorRef.current.innerHTML;
        const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const newContent = content.replace(regex, replaceText);

        editorRef.current.innerHTML = newContent;
        saveToHistory(newContent);
        setContent(newContent);
        setShowFindReplace(false);
        setFindText('');
        setReplaceText('');
    }, [findText, replaceText]);

    const insertBulletPoint = useCallback(() => {
        execCommand({ command: 'insertHTML', value: '<li style="margin: 5px 0;">New bullet point</li>' });
    }, [execCommand]);

    const insertJobEntry = useCallback(() => {
        const jobTemplate = `
            <div style="margin: 20px 0; padding: 15px 0; border-left: 3px solid #3498db; padding-left: 15px;">
                <h3 style="font-size: 17px; font-weight: bold; color: #2c3e50; margin: 0 0 8px 0;">Job Title - Company Name</h3>
                <div style="font-size: 14px; color: #7f8c8d; margin: 5px 0 15px 0; font-style: italic;">Location | Start Date - End Date</div>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li style="margin: 8px 0; color: #2c3e50;">Key responsibility or achievement</li>
                    <li style="margin: 8px 0; color: #2c3e50;">Another responsibility or achievement</li>
                </ul>
            </div>
        `;
        execCommand({ command: 'insertHTML', value: jobTemplate });
    }, [execCommand]);

    // Save content to history for undo/redo
    const saveToHistory = (newContent: string) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newContent);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    // Undo/Redo functionality
    const undo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            const content = history[newIndex];
            if (editorRef.current) {
                editorRef.current.innerHTML = content;
                setContent(content);
                setHistoryIndex(newIndex);
            }
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            const content = history[newIndex];
            if (editorRef.current) {
                editorRef.current.innerHTML = content;
                setContent(content);
                setHistoryIndex(newIndex);
            }
        }
    };

    // Handle content changes
    const handleContentChange = () => {
        if (editorRef.current) {
            const newContent = editorRef.current.innerHTML;
            setContent(newContent);
        }
    };

    // Insert template sections
    // Handle export with full formatting preservation
    const handleExport = async (format: 'pdf' | 'docx' | 'html') => {
        if (!editorRef.current) return;

        try {
            // Get the complete HTML with inline styles preserved
            let htmlContent = editorRef.current.innerHTML;

            // Normalize inline styles to ensure they're captured
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;

            // Convert computed styles to inline styles for better preservation
            const elements = tempDiv.querySelectorAll('*');
            elements.forEach((el: any) => {
                const computedStyle = window.getComputedStyle(el);
                const importantStyles = [
                    'font-family',
                    'font-size',
                    'font-weight',
                    'font-style',
                    'color',
                    'text-align',
                    'text-decoration',
                    'line-height',
                    'margin',
                    'padding',
                    'border'
                ];

                let styleString = el.getAttribute('style') || '';
                importantStyles.forEach(prop => {
                    const value = computedStyle.getPropertyValue(prop);
                    if (value && value !== 'normal' && value !== 'none') {
                        // Only add if not already in style attribute
                        if (!styleString.includes(prop)) {
                            styleString += `${prop}: ${value}; `;
                        }
                    }
                });

                if (styleString) {
                    el.setAttribute('style', styleString);
                }
            });

            htmlContent = tempDiv.innerHTML;

            // Call the backend export endpoint
            const response = await fetch('http://localhost:10000/api/resume-templates/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    htmlContent,
                    format,
                    templateKey: null,
                    options: {
                        margin: {
                            top: '0.5in',
                            right: '0.5in',
                            bottom: '0.5in',
                            left: '0.5in'
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            // Get the file blob
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            // Create download link
            const link = document.createElement('a');
            link.href = url;
            link.download = `resume-${Date.now()}.${format}`;
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            // Call the optional callback
            onDownload?.(format);
        } catch (error) {
            console.error('Export failed:', error);
            alert(`Failed to export resume as ${format.toUpperCase()}. Please try again.`);
        }
    };

    const insertSection = (sectionType: string) => {
        const sections = {
            experience: `
<h2 style="font-weight: bold; font-size: 16px; margin: 20px 0 10px 0; text-transform: uppercase; border-bottom: 1px solid #333;">PROFESSIONAL EXPERIENCE</h2>
<h3 style="font-weight: bold; font-size: 14px; margin: 15px 0 5px 0;">Job Title - Company Name</h3>
<p style="font-style: italic; color: #666; margin: 5px 0;">Start Date - End Date</p>
<ul style="margin: 10px 0; padding-left: 20px;">
    <li style="margin: 5px 0; line-height: 1.4;">Achievement or responsibility here</li>
    <li style="margin: 5px 0; line-height: 1.4;">Another accomplishment with metrics</li>
    <li style="margin: 5px 0; line-height: 1.4;">Additional point demonstrating value</li>
</ul>
`,
            education: `
<h2 style="font-weight: bold; font-size: 16px; margin: 20px 0 10px 0; text-transform: uppercase; border-bottom: 1px solid #333;">EDUCATION</h2>
<h3 style="font-weight: bold; font-size: 14px; margin: 15px 0 5px 0;">Degree - University Name</h3>
<p style="font-style: italic; color: #666; margin: 5px 0;">Graduation Year</p>
<p style="margin: 8px 0; line-height: 1.5;">Relevant coursework, honors, or GPA if notable</p>
`,
            skills: `
<h2 style="font-weight: bold; font-size: 16px; margin: 20px 0 10px 0; text-transform: uppercase; border-bottom: 1px solid #333;">TECHNICAL SKILLS</h2>
<p style="margin: 8px 0; line-height: 1.5;"><strong>Programming Languages:</strong> Language1, Language2, Language3</p>
<p style="margin: 8px 0; line-height: 1.5;"><strong>Frameworks & Tools:</strong> Framework1, Tool1, Tool2</p>
<p style="margin: 8px 0; line-height: 1.5;"><strong>Databases:</strong> Database1, Database2</p>
`
        };

        if (editorRef.current && sections[sectionType as keyof typeof sections]) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();

                const div = document.createElement('div');
                div.innerHTML = sections[sectionType as keyof typeof sections];

                while (div.firstChild) {
                    range.insertNode(div.firstChild);
                }

                saveToHistory(editorRef.current.innerHTML);
                setContent(editorRef.current.innerHTML);
            }
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
            {/* Toolbar */}
            {isEditable && (
                <div className="border-b bg-gray-50 p-3 rounded-t-lg">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* View Toggle */}
                        <div className="flex border rounded-md">
                            <Button
                                size="sm"
                                variant={!isPreviewMode ? "default" : "ghost"}
                                onClick={() => setIsPreviewMode(false)}
                                className="rounded-r-none"
                            >
                                <Edit3 className="w-4 h-4 mr-1" />
                                Edit
                            </Button>
                            <Button
                                size="sm"
                                variant={isPreviewMode ? "default" : "ghost"}
                                onClick={() => setIsPreviewMode(true)}
                                className="rounded-l-none"
                            >
                                <Eye className="w-4 h-4 mr-1" />
                                Preview
                            </Button>
                        </div>

                        <Separator orientation="vertical" className="h-6" />

                        {/* Undo/Redo */}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={undo}
                            disabled={historyIndex <= 0}
                        >
                            <Undo className="w-4 h-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={redo}
                            disabled={historyIndex >= history.length - 1}
                        >
                            <Redo className="w-4 h-4" />
                        </Button>

                        <Separator orientation="vertical" className="h-6" />

                        {/* Font Family */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button size="sm" variant="ghost">
                                    <Type className="w-4 h-4 mr-1" />
                                    {fontFamily}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2">
                                <div className="space-y-1">
                                    {fontOptions.map(font => (
                                        <Button
                                            key={font}
                                            size="sm"
                                            variant="ghost"
                                            className="w-full justify-start"
                                            style={{ fontFamily: font }}
                                            onClick={() => {
                                                setFontFamily(font);
                                                execCommand({ command: 'fontName', value: font });
                                            }}
                                        >
                                            {font}
                                        </Button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Font Size */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button size="sm" variant="ghost">
                                    {fontSize}pt
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-24 p-2">
                                <div className="grid grid-cols-2 gap-1">
                                    {fontSizes.map(size => (
                                        <Button
                                            key={size}
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                setFontSize(size);
                                                execCommand({ command: 'fontSize', value: '3' });
                                                execCommand({ command: 'fontWeight', value: size >= 14 ? 'bold' : 'normal' });
                                            }}
                                        >
                                            {size}
                                        </Button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Separator orientation="vertical" className="h-6" />

                        {/* Text Formatting */}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => execCommand({ command: 'bold' })}
                        >
                            <Bold className="w-4 h-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => execCommand({ command: 'italic' })}
                        >
                            <Italic className="w-4 h-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => execCommand({ command: 'underline' })}
                        >
                            <Underline className="w-4 h-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => execCommand({ command: 'strikeThrough' })}
                        >
                            <Strikethrough className="w-4 h-4" />
                        </Button>

                        <Separator orientation="vertical" className="h-6" />

                        {/* Text Color */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button size="sm" variant="ghost">
                                    <Palette className="w-4 h-4" style={{ color: textColor }} />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2">
                                <div className="grid grid-cols-7 gap-1">
                                    {textColors.map(color => (
                                        <button
                                            key={color}
                                            className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                                            style={{ backgroundColor: color }}
                                            onClick={() => setTextColorAction(color)}
                                        />
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Line Spacing */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button size="sm" variant="ghost">
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-32 p-2">
                                <div className="space-y-1">
                                    <div className="text-xs font-medium text-gray-500 mb-2">Line Spacing</div>
                                    {lineSpacingOptions.map(spacing => (
                                        <Button
                                            key={spacing}
                                            size="sm"
                                            variant="ghost"
                                            className={`w-full justify-start ${lineSpacing === spacing ? 'bg-blue-50' : ''}`}
                                            onClick={() => setLineSpacingAction(spacing)}
                                        >
                                            {spacing}x
                                        </Button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Separator orientation="vertical" className="h-6" />

                        {/* Indentation */}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => execCommand({ command: 'indent' })}
                        >
                            <Indent className="w-4 h-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => execCommand({ command: 'outdent' })}
                        >
                            <Outdent className="w-4 h-4" />
                        </Button>

                        <Separator orientation="vertical" className="h-6" />

                        {/* Lists */}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => execCommand({ command: 'insertUnorderedList' })}
                        >
                            <List className="w-4 h-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => execCommand({ command: 'insertOrderedList' })}
                        >
                            <ListOrdered className="w-4 h-4" />
                        </Button>

                        <Separator orientation="vertical" className="h-6" />

                        {/* Alignment */}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => execCommand({ command: 'justifyLeft' })}
                        >
                            <AlignLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => execCommand({ command: 'justifyCenter' })}
                        >
                            <AlignCenter className="w-4 h-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => execCommand({ command: 'justifyRight' })}
                        >
                            <AlignRight className="w-4 h-4" />
                        </Button>

                        <Separator orientation="vertical" className="h-6" />

                        {/* Insert Sections */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button size="sm" variant="ghost">
                                    <Plus className="w-4 h-4 mr-1" />
                                    Insert
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2">
                                <div className="space-y-1">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full justify-start"
                                        onClick={() => insertSection('experience')}
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Experience Section
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full justify-start"
                                        onClick={() => insertSection('education')}
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Education Section
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full justify-start"
                                        onClick={() => insertSection('skills')}
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Skills Section
                                    </Button>
                                    <Separator className="my-1" />
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full justify-start"
                                        onClick={insertJobEntry}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Job Entry Template
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full justify-start"
                                        onClick={insertBulletPoint}
                                    >
                                        <List className="w-4 h-4 mr-2" />
                                        Bullet Point
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Find & Replace */}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowFindReplace(!showFindReplace)}
                        >
                            <Search className="w-4 h-4" />
                        </Button>

                        <Separator orientation="vertical" className="h-6" />

                        {/* Actions */}
                        <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                                if (editorRef.current) {
                                    onSave?.(editorRef.current.innerHTML);
                                }
                            }}
                        >
                            <Save className="w-4 h-4 mr-1" />
                            Save
                        </Button>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button size="sm" variant="outline">
                                    <Download className="w-4 h-4 mr-1" />
                                    Export
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-32 p-2">
                                <div className="space-y-1">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full justify-start"
                                        onClick={() => handleExport('pdf')}
                                    >
                                        PDF
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full justify-start"
                                        onClick={() => handleExport('docx')}
                                    >
                                        Word
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full justify-start"
                                        onClick={() => handleExport('html')}
                                    >
                                        HTML
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            )}

            {/* Editor Content */}
            <div className="p-8 bg-white min-h-[800px]">
                {isPreviewMode ? (
                    <div
                        className="prose prose-sm max-w-none"
                        style={{
                            fontFamily: fontFamily,
                            fontSize: `${fontSize}px`,
                            lineHeight: 1.5,
                            color: '#333'
                        }}
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                ) : (
                    <div
                        ref={editorRef}
                        contentEditable={isEditable}
                        onInput={handleContentChange}
                        onBlur={handleContentChange}
                        className="min-h-[700px] outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 rounded p-4 border border-gray-200"
                        style={{
                            fontFamily: fontFamily,
                            fontSize: `${fontSize}px`,
                            lineHeight: 1.5,
                            color: '#333'
                        }}
                        suppressContentEditableWarning={true}
                    />
                )}
            </div>

            {/* Find & Replace Modal */}
            {showFindReplace && (
                <div className="border-t bg-blue-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Find & Replace</h4>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowFindReplace(false)}
                        >
                            ✕
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-600 block mb-1">Find:</label>
                            <input
                                type="text"
                                value={findText}
                                onChange={(e) => setFindText(e.target.value)}
                                className="w-full px-2 py-1 text-sm border rounded"
                                placeholder="Enter text to find"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-600 block mb-1">Replace with:</label>
                            <input
                                type="text"
                                value={replaceText}
                                onChange={(e) => setReplaceText(e.target.value)}
                                className="w-full px-2 py-1 text-sm border rounded"
                                placeholder="Enter replacement text"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={findAndReplace} disabled={!findText}>
                            Replace All
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                            setFindText('');
                            setReplaceText('');
                        }}>
                            Clear
                        </Button>
                    </div>
                </div>
            )}

            {/* Footer with word count and status */}
            <div className="border-t bg-gray-50 p-3 rounded-b-lg">
                <div className="flex justify-between items-center text-sm text-gray-600">
                    <div className="flex items-center gap-4">
                        <span>Words: {content.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length}</span>
                        <span>Characters: {content.replace(/<[^>]*>/g, '').length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                            {isPreviewMode ? 'Preview Mode' : 'Edit Mode'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                            Auto-saved
                        </Badge>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditableResumePreview;