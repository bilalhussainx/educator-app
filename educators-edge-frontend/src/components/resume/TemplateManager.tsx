/**
 * Resume Template Manager
 * UI for selecting, applying, and saving resume templates
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Loader2, Save, Grid3x3, Sparkles, CheckCircle, Palette, Briefcase, GraduationCap, TrendingUp } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface TemplateManagerProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentContent: string;
  onApplyTemplate: (transformedHTML: string, template: any) => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({
  open,
  onClose,
  userId,
  currentContent,
  onApplyTemplate
}) => {
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [userTemplates, setUserTemplates] = useState<any[]>([]);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [activeTab, setActiveTab] = useState('browse');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

  /**
   * Load available templates
   */
  useEffect(() => {
    if (open) {
      loadTemplates();
      loadUserTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/resume-templates`);
      if (response.data.success) {
        setAvailableTemplates(response.data.templates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load templates');
    }
  };

  const loadUserTemplates = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/resume-templates/user/${userId}`);
      if (response.data.success) {
        setUserTemplates(response.data.templates);
      }
    } catch (error) {
      console.error('Failed to load user templates:', error);
    }
  };

  /**
   * Get AI recommendation
   */
  const getRecommendation = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/resume-templates/recommend`, {
        resumeContent: currentContent,
        targetRole,
        targetIndustry
      });

      if (response.data.success) {
        setRecommendation(response.data.recommendation);
        setActiveTab('recommended');
        toast.success('AI recommendation ready!');
      }
    } catch (error) {
      console.error('Failed to get recommendation:', error);
      toast.error('Failed to get AI recommendation');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Apply template
   */
  const applyTemplate = async (templateKey: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/resume-templates/apply`, {
        resumeContent: currentContent,
        templateKey,
        customizations: {}
      });

      if (response.data.success) {
        onApplyTemplate(response.data.transformedHTML, response.data.template);
        toast.success(`Template "${response.data.template.name}" applied successfully!`);
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to apply template:', error);
      toast.error(error.response?.data?.error || 'Failed to apply template');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Save as custom template
   */
  const saveAsTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/resume-templates/save`, {
        userId,
        resumeContent: currentContent,
        templateName: newTemplateName,
        templateMetadata: {
          targetRole,
          targetIndustry,
          createdFrom: 'liveblocks-editor'
        }
      });

      if (response.data.success) {
        toast.success('Template saved successfully!');
        setNewTemplateName('');
        loadUserTemplates();
        setActiveTab('my-templates');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsLoading(false);
    }
  };

  const getTemplateIcon = (templateId: string) => {
    switch (templateId) {
      case 'tech': return <Grid3x3 className="w-5 h-5" />;
      case 'finance': return <TrendingUp className="w-5 h-5" />;
      case 'creative': return <Palette className="w-5 h-5" />;
      case 'healthcare': return <CheckCircle className="w-5 h-5" />;
      case 'consulting': return <Briefcase className="w-5 h-5" />;
      case 'academic': return <GraduationCap className="w-5 h-5" />;
      default: return <Grid3x3 className="w-5 h-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3x3 className="w-6 h-6" />
            Resume Templates
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="recommended">AI Recommended</TabsTrigger>
            <TabsTrigger value="my-templates">My Templates</TabsTrigger>
            <TabsTrigger value="save">Save Template</TabsTrigger>
          </TabsList>

          {/* Browse Templates */}
          <TabsContent value="browse">
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-2 gap-4">
                {availableTemplates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTemplateIcon(template.id)}
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                        </div>
                        <Badge variant="secondary">{template.atsScore}% ATS</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Layout:</span> {template.layout}
                        </div>
                        <div>
                          <span className="font-medium">Emphasis:</span> {template.emphasis}
                        </div>
                        <div>
                          <span className="font-medium">Sections:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {template.sections.slice(0, 4).map((section: string) => (
                              <Badge key={section} variant="outline" className="text-xs">
                                {section}
                              </Badge>
                            ))}
                            {template.sections.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.sections.length - 4}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          className="w-full mt-3"
                          onClick={() => applyTemplate(template.id)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Applying...
                            </>
                          ) : (
                            'Apply Template'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* AI Recommended */}
          <TabsContent value="recommended">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Target Role</Label>
                  <Input
                    placeholder="e.g., Software Engineer"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Target Industry</Label>
                  <Input
                    placeholder="e.g., Technology"
                    value={targetIndustry}
                    onChange={(e) => setTargetIndustry(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={getRecommendation}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Get AI Recommendation
                  </>
                )}
              </Button>

              {recommendation && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      Recommended: {recommendation.recommendedTemplate}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="font-medium">Confidence:</span> {Math.round(recommendation.confidence * 100)}%
                    </div>
                    <div>
                      <span className="font-medium">Why:</span> {recommendation.reasoning}
                    </div>
                    {recommendation.industryInsights && (
                      <div className="p-3 bg-white rounded-lg">
                        <span className="font-medium">Industry Insights:</span>
                        <p className="text-sm mt-1">{recommendation.industryInsights}</p>
                      </div>
                    )}
                    <Button
                      onClick={() => applyTemplate(recommendation.recommendedTemplate)}
                      disabled={isLoading}
                      className="w-full"
                    >
                      Apply Recommended Template
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* My Templates */}
          <TabsContent value="my-templates">
            <ScrollArea className="h-[400px]">
              {userTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Save className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No saved templates yet</p>
                  <p className="text-sm">Save your current resume as a template to reuse it later</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {userTemplates.map((template) => (
                    <Card key={template.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <p className="text-sm text-gray-600">
                          Created {new Date(template.createdAt).toLocaleDateString()}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <Button
                          onClick={() => {
                            if (editor) {
                              editor.commands.setContent(template.content);
                              toast.success('Template loaded!');
                              onClose();
                            }
                          }}
                        >
                          Load Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Save Template */}
          <TabsContent value="save">
            <div className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  placeholder="e.g., My Software Engineer Template"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role (Optional)</Label>
                  <Input
                    placeholder="e.g., Senior Developer"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Industry (Optional)</Label>
                  <Input
                    placeholder="e.g., Tech"
                    value={targetIndustry}
                    onChange={(e) => setTargetIndustry(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  Save your current resume as a reusable template. You can load it later and customize it for different applications.
                </p>
              </div>

              <Button
                onClick={saveAsTemplate}
                disabled={isLoading || !newTemplateName.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save as Template
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateManager;
