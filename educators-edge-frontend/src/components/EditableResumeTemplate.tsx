import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
    Bold,
    Italic,
    Underline,
    AlignLeft,
    AlignCenter,
    AlignRight,
    List,
    ListOrdered,
    Type,
    Palette,
    Download,
    Save,
    Eye,
    Edit3
} from 'lucide-react';

interface EditableResumeTemplateProps {
    resumeData: any;
    onSave?: (content: string) => void;
    onExport?: (format: 'pdf' | 'docx' | 'html') => void;
}

const EditableResumeTemplate: React.FC<EditableResumeTemplateProps> = ({
    resumeData,
    onSave,
    onExport
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState('');
    const editorRef = useRef<HTMLDivElement>(null);
    const [selectedText, setSelectedText] = useState('');
    const [showFormatting, setShowFormatting] = useState(true);

    useEffect(() => {
        if (resumeData) {
            generateInitialContent();
        }
    }, [resumeData]);

    const generateInitialContent = () => {
        const name = resumeData?.name || 'Your Name';
        const email = resumeData?.contact?.email || 'your.email@example.com';
        const phone = resumeData?.contact?.phone || '(555) 123-4567';
        const sections = resumeData?.sections || [];

        let htmlContent = `
            <div class="resume-header" style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
                <h1 style="font-size: 28px; font-weight: bold; color: #1f2937; margin: 0;">${name}</h1>
                <div style="margin-top: 10px; color: #6b7280;">
                    <span>${email}</span> | <span>${phone}</span>
                </div>
            </div>
        `;

        sections.forEach((section: any) => {
            htmlContent += `
                <div class="resume-section" style="margin-bottom: 25px;">
                    <h2 style="font-size: 18px; font-weight: bold; color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 15px;">${section.title}</h2>
                    <div style="line-height: 1.6; color: #374151;">${section.content}</div>
                </div>
            `;
        });

        setContent(htmlContent);
    };

    const handleFormatCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    const handleFontSize = (size: string) => {
        handleFormatCommand('fontSize', size);
    };

    const handleColor = (color: string) => {
        handleFormatCommand('foreColor', color);
    };

    const handleSave = () => {
        if (editorRef.current) {
            const htmlContent = editorRef.current.innerHTML;
            setContent(htmlContent);
            onSave?.(htmlContent);
            setIsEditing(false);
        }
    };

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
                    templateKey: null, // Can be passed if using a specific template
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
            onExport?.(format);
        } catch (error) {
            console.error('Export failed:', error);
            alert(`Failed to export resume as ${format.toUpperCase()}. Please try again.`);
        }
    };

    const insertBulletPoint = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const bullet = document.createElement('div');
            bullet.innerHTML = '• ';
            bullet.style.marginLeft = '20px';
            range.insertNode(bullet);
            range.setStartAfter(bullet);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    };

    const formatToolbar = (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
            {/* Text formatting */}
            <div className="flex gap-1 border-r border-gray-300 pr-2">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFormatCommand('bold')}
                    title="Bold"
                >
                    <Bold className="w-4 h-4" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFormatCommand('italic')}
                    title="Italic"
                >
                    <Italic className="w-4 h-4" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFormatCommand('underline')}
                    title="Underline"
                >
                    <Underline className="w-4 h-4" />
                </Button>
            </div>

            {/* Alignment */}
            <div className="flex gap-1 border-r border-gray-300 pr-2">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFormatCommand('justifyLeft')}
                    title="Align Left"
                >
                    <AlignLeft className="w-4 h-4" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFormatCommand('justifyCenter')}
                    title="Align Center"
                >
                    <AlignCenter className="w-4 h-4" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFormatCommand('justifyRight')}
                    title="Align Right"
                >
                    <AlignRight className="w-4 h-4" />
                </Button>
            </div>

            {/* Lists */}
            <div className="flex gap-1 border-r border-gray-300 pr-2">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFormatCommand('insertUnorderedList')}
                    title="Bullet List"
                >
                    <List className="w-4 h-4" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFormatCommand('insertOrderedList')}
                    title="Numbered List"
                >
                    <ListOrdered className="w-4 h-4" />
                </Button>
            </div>

            {/* Font size */}
            <div className="flex gap-1 border-r border-gray-300 pr-2">
                <select
                    onChange={(e) => handleFontSize(e.target.value)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded"
                    defaultValue="3"
                >
                    <option value="1">8pt</option>
                    <option value="2">10pt</option>
                    <option value="3">12pt</option>
                    <option value="4">14pt</option>
                    <option value="5">18pt</option>
                    <option value="6">24pt</option>
                    <option value="7">36pt</option>
                </select>
            </div>

            {/* Colors */}
            <div className="flex gap-1 border-r border-gray-300 pr-2">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleColor('#000000')}
                    title="Black"
                    className="w-8 h-8 p-0 bg-black"
                />
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleColor('#2563eb')}
                    title="Blue"
                    className="w-8 h-8 p-0 bg-blue-600"
                />
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleColor('#dc2626')}
                    title="Red"
                    className="w-8 h-8 p-0 bg-red-600"
                />
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleColor('#16a34a')}
                    title="Green"
                    className="w-8 h-8 p-0 bg-green-600"
                />
            </div>

            {/* Actions */}
            <div className="flex gap-1 ml-auto">
                <Button
                    size="sm"
                    onClick={handleSave}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(!isEditing)}
                >
                    {isEditing ? <Eye className="w-4 h-4 mr-1" /> : <Edit3 className="w-4 h-4 mr-1" />}
                    {isEditing ? 'Preview' : 'Edit'}
                </Button>
            </div>
        </div>
    );

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>📄 Office-Style Resume Template</span>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExport('pdf')}
                        >
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExport('docx')}
                        >
                            <Download className="w-4 h-4 mr-1" />
                            Word
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExport('html')}
                        >
                            <Download className="w-4 h-4 mr-1" />
                            HTML
                        </Button>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {showFormatting && formatToolbar}

                <div
                    ref={editorRef}
                    contentEditable={isEditing}
                    suppressContentEditableWarning={true}
                    dangerouslySetInnerHTML={{ __html: content }}
                    className={`
                        p-8 min-h-[600px] bg-white
                        ${isEditing ? 'border-2 border-blue-300 focus:border-blue-500' : ''}
                        outline-none
                    `}
                    style={{
                        fontFamily: 'Arial, sans-serif',
                        fontSize: '12pt',
                        lineHeight: '1.6',
                        maxWidth: '8.5in',
                        margin: '0 auto'
                    }}
                    onInput={(e) => {
                        if (isEditing) {
                            setContent((e.target as HTMLDivElement).innerHTML);
                        }
                    }}
                />

                {isEditing && (
                    <div className="p-4 bg-blue-50 border-t border-blue-200">
                        <p className="text-sm text-blue-700">
                            💡 <strong>Editing Tips:</strong>
                            <br />• Select text to format it with the toolbar above
                            <br />• Use the alignment buttons to center headings
                            <br />• Add bullet points for job responsibilities
                            <br />• Change colors to highlight important sections
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default EditableResumeTemplate;