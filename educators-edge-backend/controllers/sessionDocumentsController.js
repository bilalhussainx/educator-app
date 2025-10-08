/**
 * ================================================================
 * SESSION DOCUMENTS CONTROLLER
 * ================================================================
 * Manages documents for urgent and live essay sessions
 * Handles drafts, final versions, and document organization
 */

const db = require('../db');

class SessionDocumentsController {
    /**
     * Get all session documents for a user
     * GET /api/session-documents
     */
    async getUserSessionDocuments(req, res) {
        try {
            const userId = req.user.id;
            const {
                sessionType,
                documentType,
                page = 1,
                limit = 20,
                search,
                sortBy = 'updated_at',
                sortOrder = 'DESC'
            } = req.query;

            let query = `
                SELECT * FROM session_documents_with_stats
                WHERE user_id = $1 AND is_deleted = false
            `;
            const queryParams = [userId];
            let paramCount = 1;

            // Apply filters
            if (sessionType) {
                paramCount++;
                query += ` AND session_type = $${paramCount}`;
                queryParams.push(sessionType);
            }

            if (documentType) {
                paramCount++;
                query += ` AND document_type = $${paramCount}`;
                queryParams.push(documentType);
            }

            if (search) {
                paramCount++;
                query += ` AND (session_name ILIKE $${paramCount} OR document_name ILIKE $${paramCount} OR content ILIKE $${paramCount})`;
                queryParams.push(`%${search}%`);
            }

            // Add sorting
            const validSortFields = ['created_at', 'updated_at', 'session_name', 'document_name', 'word_count'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'updated_at';
            const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
            query += ` ORDER BY ${sortField} ${order}`;

            // Add pagination
            const offset = (parseInt(page) - 1) * parseInt(limit);
            paramCount++;
            query += ` LIMIT $${paramCount}`;
            queryParams.push(parseInt(limit));

            paramCount++;
            query += ` OFFSET $${paramCount}`;
            queryParams.push(offset);

            const result = await db.query(query, queryParams);

            // Get total count for pagination
            let countQuery = `
                SELECT COUNT(*) FROM session_documents
                WHERE user_id = $1 AND is_deleted = false
            `;
            const countParams = [userId];
            let countParamIndex = 1;

            if (sessionType) {
                countParamIndex++;
                countQuery += ` AND session_type = $${countParamIndex}`;
                countParams.push(sessionType);
            }

            if (documentType) {
                countParamIndex++;
                countQuery += ` AND document_type = $${countParamIndex}`;
                countParams.push(documentType);
            }

            if (search) {
                countParamIndex++;
                countQuery += ` AND (session_name ILIKE $${countParamIndex} OR document_name ILIKE $${countParamIndex} OR content ILIKE $${countParamIndex})`;
                countParams.push(`%${search}%`);
            }

            const countResult = await db.query(countQuery, countParams);
            const totalCount = parseInt(countResult.rows[0].count);

            res.json({
                success: true,
                documents: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / parseInt(limit))
                }
            });

        } catch (error) {
            console.error('Error fetching user session documents:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch session documents'
            });
        }
    }

    /**
     * Get documents by session ID
     * GET /api/session-documents/session/:sessionId
     */
    async getSessionDocuments(req, res) {
        try {
            const { sessionId } = req.params;
            const userId = req.user.id;

            const query = `
                SELECT * FROM session_documents_with_stats
                WHERE user_id = $1 AND session_id = $2 AND is_deleted = false
                ORDER BY version_number DESC, updated_at DESC
            `;

            const result = await db.query(query, [userId, sessionId]);

            res.json({
                success: true,
                documents: result.rows,
                sessionId,
                totalDocuments: result.rows.length
            });

        } catch (error) {
            console.error('Error fetching session documents:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch session documents'
            });
        }
    }

    /**
     * Create or update a session document
     * POST /api/session-documents
     */
    async createOrUpdateDocument(req, res) {
        try {
            const userId = req.user.id;
            const {
                sessionId,
                sessionName,
                sessionType,
                documentName,
                documentType,
                content,
                sessionMetadata = {},
                aiAnalysisData = {},
                tags = []
            } = req.body;

            // Validation
            if (!sessionId || !sessionName || !sessionType || !documentName || !content) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: sessionId, sessionName, sessionType, documentName, content'
                });
            }

            // Calculate document statistics
            const wordCount = content.trim().split(/\s+/).length;
            const characterCount = content.length;
            const fileSize = Buffer.byteLength(content, 'utf8');

            // Check if document exists (for versioning)
            const existingDoc = await db.query(
                'SELECT id, version_number FROM session_documents WHERE user_id = $1 AND session_id = $2 AND document_name = $3 AND is_deleted = false ORDER BY version_number DESC LIMIT 1',
                [userId, sessionId, documentName]
            );

            let documentId;
            let versionNumber = 1;
            let parentDocumentId = null;

            if (existingDoc.rows.length > 0) {
                // Create new version
                versionNumber = existingDoc.rows[0].version_number + 1;
                parentDocumentId = existingDoc.rows[0].id;

                // Mark previous version as not current
                await db.query(
                    'UPDATE session_documents SET is_current_version = false WHERE user_id = $1 AND session_id = $2 AND document_name = $3',
                    [userId, sessionId, documentName]
                );
            }

            // Insert new document/version
            const insertQuery = `
                INSERT INTO session_documents (
                    user_id, session_id, session_name, session_type,
                    document_name, document_type, content, file_size,
                    word_count, character_count, version_number,
                    parent_document_id, session_metadata, ai_analysis_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING *
            `;

            const result = await db.query(insertQuery, [
                userId, sessionId, sessionName, sessionType,
                documentName, documentType, content, fileSize,
                wordCount, characterCount, versionNumber,
                parentDocumentId, JSON.stringify(sessionMetadata), JSON.stringify(aiAnalysisData)
            ]);

            documentId = result.rows[0].id;

            // Add tags if provided
            if (tags.length > 0) {
                for (const tag of tags) {
                    await db.query(
                        'INSERT INTO session_document_tags (document_id, tag_name) VALUES ($1, $2) ON CONFLICT (document_id, tag_name) DO NOTHING',
                        [documentId, tag.name || tag]
                    );
                }
            }

            res.json({
                success: true,
                document: result.rows[0],
                message: versionNumber > 1 ? `Document updated (version ${versionNumber})` : 'Document created successfully'
            });

        } catch (error) {
            console.error('Error creating/updating session document:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create/update document'
            });
        }
    }

    /**
     * Get a specific document by ID
     * GET /api/session-documents/:documentId
     */
    async getDocument(req, res) {
        try {
            const { documentId } = req.params;
            const userId = req.user.id;

            const query = `
                SELECT * FROM session_documents_with_stats
                WHERE id = $1 AND user_id = $2 AND is_deleted = false
            `;

            const result = await db.query(query, [documentId, userId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Document not found'
                });
            }

            // Update last accessed time
            await db.query(
                'UPDATE session_documents SET last_accessed_at = NOW() WHERE id = $1',
                [documentId]
            );

            res.json({
                success: true,
                document: result.rows[0]
            });

        } catch (error) {
            console.error('Error fetching document:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch document'
            });
        }
    }

    /**
     * Get document version history
     * GET /api/session-documents/:documentId/versions
     */
    async getDocumentVersions(req, res) {
        try {
            const { documentId } = req.params;
            const userId = req.user.id;

            // First get the document to find all versions with same session_id and document_name
            const docQuery = await db.query(
                'SELECT session_id, document_name FROM session_documents WHERE id = $1 AND user_id = $2',
                [documentId, userId]
            );

            if (docQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Document not found'
                });
            }

            const { session_id: sessionId, document_name: documentName } = docQuery.rows[0];

            const versionsQuery = `
                SELECT
                    id, version_number, content, word_count, character_count,
                    created_at, updated_at, is_current_version, document_type
                FROM session_documents
                WHERE user_id = $1 AND session_id = $2 AND document_name = $3 AND is_deleted = false
                ORDER BY version_number DESC
            `;

            const result = await db.query(versionsQuery, [userId, sessionId, documentName]);

            res.json({
                success: true,
                versions: result.rows,
                totalVersions: result.rows.length
            });

        } catch (error) {
            console.error('Error fetching document versions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch document versions'
            });
        }
    }

    /**
     * Delete a document (soft delete)
     * DELETE /api/session-documents/:documentId
     */
    async deleteDocument(req, res) {
        try {
            const { documentId } = req.params;
            const userId = req.user.id;

            const result = await db.query(
                'UPDATE session_documents SET is_deleted = true, deleted_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *',
                [documentId, userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Document not found'
                });
            }

            res.json({
                success: true,
                message: 'Document deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting document:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete document'
            });
        }
    }

    /**
     * Get session statistics and summary
     * GET /api/session-documents/stats
     */
    async getSessionStats(req, res) {
        try {
            const userId = req.user.id;

            const statsQuery = `
                SELECT
                    session_type,
                    COUNT(*) as total_documents,
                    COUNT(DISTINCT session_id) as total_sessions,
                    SUM(word_count) as total_words,
                    AVG(word_count) as avg_words_per_doc,
                    COUNT(*) FILTER (WHERE document_type = 'draft') as draft_count,
                    COUNT(*) FILTER (WHERE document_type = 'final') as final_count,
                    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as recent_documents
                FROM session_documents
                WHERE user_id = $1 AND is_deleted = false
                GROUP BY session_type
            `;

            const result = await db.query(statsQuery, [userId]);

            // Get recent sessions summary
            const recentSessionsQuery = `
                SELECT DISTINCT session_id, session_name, session_type,
                       MAX(updated_at) as last_updated,
                       COUNT(*) as document_count
                FROM session_documents
                WHERE user_id = $1 AND is_deleted = false
                  AND updated_at > NOW() - INTERVAL '7 days'
                GROUP BY session_id, session_name, session_type
                ORDER BY last_updated DESC
                LIMIT 10
            `;

            const recentSessions = await db.query(recentSessionsQuery, [userId]);

            res.json({
                success: true,
                statistics: result.rows,
                recentSessions: recentSessions.rows
            });

        } catch (error) {
            console.error('Error fetching session stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch session statistics'
            });
        }
    }

    /**
     * Add tags to a document
     * POST /api/session-documents/:documentId/tags
     */
    async addDocumentTags(req, res) {
        try {
            const { documentId } = req.params;
            const { tags } = req.body;
            const userId = req.user.id;

            // Verify document ownership
            const docCheck = await db.query(
                'SELECT id FROM session_documents WHERE id = $1 AND user_id = $2',
                [documentId, userId]
            );

            if (docCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Document not found'
                });
            }

            // Add tags
            const addedTags = [];
            for (const tag of tags) {
                try {
                    const result = await db.query(
                        'INSERT INTO session_document_tags (document_id, tag_name, tag_color) VALUES ($1, $2, $3) RETURNING *',
                        [documentId, tag.name, tag.color || '#3B82F6']
                    );
                    addedTags.push(result.rows[0]);
                } catch (error) {
                    // Skip duplicates
                    if (!error.message.includes('duplicate key')) {
                        throw error;
                    }
                }
            }

            res.json({
                success: true,
                addedTags,
                message: `Added ${addedTags.length} tags`
            });

        } catch (error) {
            console.error('Error adding document tags:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to add tags'
            });
        }
    }

    /**
     * Share a document with another user
     * POST /api/session-documents/:documentId/share
     */
    async shareDocument(req, res) {
        try {
            const { documentId } = req.params;
            const { shareWithUserId, permissionLevel = 'read', expiresIn } = req.body;
            const userId = req.user.id;

            // Verify document ownership
            const docCheck = await db.query(
                'SELECT id FROM session_documents WHERE id = $1 AND user_id = $2',
                [documentId, userId]
            );

            if (docCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Document not found'
                });
            }

            // Calculate expiration date
            let expiresAt = null;
            if (expiresIn) {
                expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn));
            }

            // Create or update share
            const shareResult = await db.query(
                `INSERT INTO session_document_shares (document_id, shared_with_user_id, shared_by_user_id, permission_level, expires_at)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (document_id, shared_with_user_id)
                 DO UPDATE SET permission_level = $4, expires_at = $5, created_at = NOW()
                 RETURNING *`,
                [documentId, shareWithUserId, userId, permissionLevel, expiresAt]
            );

            res.json({
                success: true,
                share: shareResult.rows[0],
                message: 'Document shared successfully'
            });

        } catch (error) {
            console.error('Error sharing document:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to share document'
            });
        }
    }
}

module.exports = new SessionDocumentsController();