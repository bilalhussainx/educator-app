import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText,
    FolderOpen,
    Search,
    Filter,
    Calendar,
    Clock,
    User,
    Download,
    Share2,
    Tag,
    MoreVertical,
    Eye,
    Edit,
    Trash2,
    Copy,
    History,
    Plus,
    BookOpen,
    Video,
    PenTool,
    Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import apiClient from '../services/apiClient';
import { toast } from 'sonner';

interface SessionDocument {
    id: string;
    session_id: string;
    session_name: string;
    session_type: 'urgent_essay' | 'live_tutorial' | 'scribe_session' | 'video_session';
    document_name: string;
    document_type: 'draft' | 'final' | 'revision' | 'backup';
    content: string;
    word_count: number;
    character_count: number;
    version_number: number;
    created_at: string;
    updated_at: string;
    tags: string[];
    tag_count: number;
    recency_category: string;
}

interface SessionStats {
    session_type: string;
    total_documents: number;
    total_sessions: number;
    total_words: number;
    avg_words_per_doc: number;
    draft_count: number;
    final_count: number;
    recent_documents: number;
}

const SessionDocumentsPage: React.FC = () => {
    const navigate = useNavigate();
    const [documents, setDocuments] = useState<SessionDocument[]>([]);
    const [stats, setStats] = useState<SessionStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterSessionType, setFilterSessionType] = useState<string>('all');
    const [selectedDocument, setSelectedDocument] = useState<SessionDocument | null>(null);
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchDocuments();
        fetchStats();
    }, [currentPage, filterType, filterSessionType, searchTerm]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);

            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: '12',
                search: searchTerm,
                sortBy: 'updated_at',
                sortOrder: 'DESC'
            });

            if (filterType !== 'all') {
                params.append('documentType', filterType);
            }

            if (filterSessionType !== 'all') {
                params.append('sessionType', filterSessionType);
            }

            const response = await apiClient.get(`/api/session-documents?${params}`);

            if (response.data.success) {
                setDocuments(response.data.documents);
                setTotalPages(response.data.pagination.totalPages);
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
            toast.error('Failed to load session documents');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await apiClient.get('/api/session-documents/stats');
            if (response.data.success) {
                setStats(response.data.statistics);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const getSessionTypeIcon = (type: string) => {
        switch (type) {
            case 'urgent_essay':
                return <PenTool className="w-4 h-4" />;
            case 'live_tutorial':
                return <Video className="w-4 h-4" />;
            case 'scribe_session':
                return <BookOpen className="w-4 h-4" />;
            case 'video_session':
                return <Video className="w-4 h-4" />;
            default:
                return <FileText className="w-4 h-4" />;
        }
    };

    const getDocumentTypeColor = (type: string) => {
        switch (type) {
            case 'draft':
                return 'bg-yellow-100 text-yellow-800';
            case 'final':
                return 'bg-green-100 text-green-800';
            case 'revision':
                return 'bg-blue-100 text-blue-800';
            case 'backup':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffHours < 48) return 'Yesterday';
        return date.toLocaleDateString();
    };

    const handleDocumentClick = (document: SessionDocument) => {
        setSelectedDocument(document);
        setShowDocumentModal(true);
    };

    const deleteDocument = async (documentId: string) => {
        try {
            await apiClient.delete(`/api/session-documents/${documentId}`);
            toast.success('Document deleted successfully');
            fetchDocuments();
        } catch (error) {
            console.error('Error deleting document:', error);
            toast.error('Failed to delete document');
        }
    };

    const downloadDocument = (document: SessionDocument) => {
        const blob = new Blob([document.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${document.document_name}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (loading && documents.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your session documents...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <FolderOpen className="w-8 h-8 text-blue-600" />
                                Session Documents
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Manage drafts and final versions from your urgent essay and live tutorial sessions
                            </p>
                        </div>
                        <Button
                            onClick={() => navigate('/urgent-essay')}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Session
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Statistics Cards */}
                {stats.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {stats.map((stat) => (
                            <Card key={stat.session_type}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium capitalize">
                                        {stat.session_type.replace('_', ' ')}
                                    </CardTitle>
                                    {getSessionTypeIcon(stat.session_type)}
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stat.total_documents}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {stat.total_sessions} sessions • {stat.total_words.toLocaleString()} words
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                        <Badge variant="outline" className="text-xs">
                                            {stat.draft_count} drafts
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                            {stat.final_count} final
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Search and Filters */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Search documents, sessions, or content..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <select
                            value={filterSessionType}
                            onChange={(e) => setFilterSessionType(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="all">All Session Types</option>
                            <option value="urgent_essay">Urgent Essays</option>
                            <option value="live_tutorial">Live Tutorials</option>
                            <option value="scribe_session">Scribe Sessions</option>
                            <option value="video_session">Video Sessions</option>
                        </select>

                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="all">All Document Types</option>
                            <option value="draft">Drafts</option>
                            <option value="final">Final Versions</option>
                            <option value="revision">Revisions</option>
                            <option value="backup">Backups</option>
                        </select>
                    </div>
                </div>

                {/* Documents Grid */}
                {documents.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-gray-600 mb-2">No documents found</h3>
                        <p className="text-gray-500 mb-6">
                            Start an urgent essay session or live tutorial to create your first document
                        </p>
                        <Button
                            onClick={() => navigate('/urgent-essay')}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Start New Session
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {documents.map((doc) => (
                                <Card
                                    key={doc.id}
                                    className="hover:shadow-lg transition-shadow cursor-pointer"
                                    onClick={() => handleDocumentClick(doc)}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                {getSessionTypeIcon(doc.session_type)}
                                                <CardTitle className="text-sm font-medium truncate">
                                                    {doc.session_name}
                                                </CardTitle>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Badge className={`text-xs ${getDocumentTypeColor(doc.document_type)}`}>
                                                    {doc.document_type}
                                                </Badge>
                                                {doc.version_number > 1 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        v{doc.version_number}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-lg font-semibold text-gray-900 truncate">
                                            {doc.document_name}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-sm text-gray-600 mb-3 line-clamp-3">
                                            {doc.content.substring(0, 150)}...
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                                            <span>{doc.word_count} words</span>
                                            <span>{formatDate(doc.updated_at)}</span>
                                        </div>

                                        {doc.tags && doc.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {doc.tags.slice(0, 3).map((tag, index) => (
                                                    <Badge key={index} variant="secondary" className="text-xs">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                                {doc.tags.length > 3 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{doc.tags.length - 3}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(doc.created_at)}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        downloadDocument(doc);
                                                    }}
                                                >
                                                    <Download className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteDocument(doc.id);
                                                    }}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-8">
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                <span className="text-sm text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Document Modal */}
            <Dialog open={showDocumentModal} onOpenChange={setShowDocumentModal}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            {selectedDocument?.document_name}
                            <Badge className={`${getDocumentTypeColor(selectedDocument?.document_type || '')}`}>
                                {selectedDocument?.document_type}
                            </Badge>
                            {selectedDocument?.version_number && selectedDocument.version_number > 1 && (
                                <Badge variant="outline">
                                    Version {selectedDocument.version_number}
                                </Badge>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedDocument && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                    {getSessionTypeIcon(selectedDocument.session_type)}
                                    {selectedDocument.session_name}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {formatDate(selectedDocument.updated_at)}
                                </div>
                                <div>{selectedDocument.word_count} words</div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                                    {selectedDocument.content}
                                </pre>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => downloadDocument(selectedDocument)}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedDocument.content);
                                            toast.success('Document copied to clipboard');
                                        }}
                                    >
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy
                                    </Button>
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                        deleteDocument(selectedDocument.id);
                                        setShowDocumentModal(false);
                                    }}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SessionDocumentsPage;