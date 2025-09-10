// educators-edge-backend/src/controllers/documentController.js

const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Document parsing libraries (lazy loaded)
let mammoth, pdfParse;

// Try to load parsing libraries immediately with fallback
try {
    mammoth = require('mammoth');
    console.log('[DOCUMENT] Mammoth library loaded successfully');
} catch (error) {
    console.warn('[DOCUMENT] Mammoth library not available - Word document parsing will be limited');
}

try {
    pdfParse = require('pdf-parse');
    console.log('[DOCUMENT] PDF-parse library loaded successfully');
} catch (error) {
    console.warn('[DOCUMENT] PDF-parse library not available - PDF parsing will be limited');
}

/**
 * @desc    Create a new collaborative document for a Scribe Session.
 * @route   POST /api/documents/create
 * @access  Private (Teacher)
 */
const createDocument = async (req, res) => {
    // The user object is attached by our verified authMiddleware.
    const ownerId = req.user.id;
    const { title } = req.body;

    if (!ownerId) {
        return res.status(401).json({ error: "Authentication error: User ID is missing." });
    }

    if (!title) {
        return res.status(400).json({ error: "A title for the document is required." });
    }

    try {
        // Create an empty initial state for the TipTap editor content.
        const initialContent = {
            type: "doc",
            content: [{
                type: "paragraph",
                content: [{
                    type: "text",
                    text: "Welcome to your new Scribe Session. Start typing here..."
                }]
            }]
        };

        // Insert the new document into the database, returning its newly generated ID.
        const newDocumentResult = await db.query(
            `INSERT INTO collaborative_documents (owner_id, title, content)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [ownerId, title, JSON.stringify(initialContent)]
        );

        const documentId = newDocumentResult.rows[0].id;

        console.log(`[DOCUMENTS] New document created with ID: ${documentId} for user: ${ownerId}`);

        // Send the new document's ID back to the frontend.
        res.status(201).json({ documentId: documentId });

    } catch (error) {
        console.error("CRITICAL ERROR in createDocument:", error);
        res.status(500).json({ error: "Failed to create a new document on the server." });
    }
};


// Configure multer for file upload
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/documents');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `document-${uniqueSuffix}${extension}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/msword', // .doc
            'text/plain', // .txt
            'application/pdf' // .pdf
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only Word documents, PDFs, and text files are allowed.'));
        }
    }
});

/**
 * Parse document content based on file type
 */
const parseDocumentContent = async (filePath, mimeType) => {
    try {
        let content = '';

        if (mimeType === 'text/plain') {
            // Handle text files
            content = await fs.readFile(filePath, 'utf8');
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            // Handle .docx files
            if (mammoth) {
                const buffer = await fs.readFile(filePath);
                const result = await mammoth.extractRawText({ buffer });
                content = result.value;
            } else {
                // Fallback - just indicate the document was uploaded
                content = 'Word document uploaded. Text extraction not available - mammoth library not installed.';
            }
        } else if (mimeType === 'application/pdf') {
            // Handle PDF files
            if (pdfParse) {
                const buffer = await fs.readFile(filePath);
                const data = await pdfParse(buffer);
                content = data.text;
            } else {
                content = 'PDF document uploaded. Text extraction not available - pdf-parse library not installed.';
            }
        } else if (mimeType === 'application/msword') {
            // Handle .doc files (legacy Word format)
            content = 'Legacy Word document uploaded. Please convert to .docx for better text extraction.';
        }

        return content.trim();
    } catch (error) {
        console.error('Error parsing document:', error);
        return `Document uploaded but parsing failed: ${error.message}`;
    }
};

/**
 * Upload and process document
 * @desc    Upload a document for urgent session or chat
 * @route   POST /api/documents/upload
 * @access  Private
 */
const uploadDocument = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const { type = 'essay_draft' } = req.body;
        const userId = req.user.id;
        const file = req.file;

        console.log(`[DOCUMENT] Processing uploaded file: ${file.originalname} (${file.mimetype})`);

        // Parse document content
        const content = await parseDocumentContent(file.path, file.mimetype);
        console.log(`[DOCUMENT] Extracted ${content.length} characters from document`);

        // Create documents table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS documents (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                original_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_size INTEGER NOT NULL,
                mime_type VARCHAR(100) NOT NULL,
                content TEXT,
                document_type VARCHAR(50) DEFAULT 'essay_draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Save document metadata to database
        const documentId = uuidv4();
        const documentResult = await db.query(`
            INSERT INTO documents 
            (id, user_id, original_name, file_path, file_size, mime_type, content, document_type, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING *
        `, [
            documentId,
            userId,
            file.originalname,
            file.path,
            file.size,
            file.mimetype,
            content,
            type
        ]);

        const document = documentResult.rows[0];

        console.log(`[DOCUMENT] Successfully saved document ${documentId} to database`);

        res.json({
            success: true,
            message: 'Document uploaded and processed successfully',
            documentId: document.id,
            document: {
                id: document.id,
                name: document.original_name,
                size: document.file_size,
                type: document.mime_type,
                contentLength: content.length,
                documentType: document.document_type,
                createdAt: document.created_at
            }
        });

    } catch (error) {
        console.error('Error uploading document:', error);
        
        // Clean up uploaded file if database save fails
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (cleanupError) {
                console.error('Failed to cleanup uploaded file:', cleanupError);
            }
        }

        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload document'
        });
    }
};

/**
 * Get document by ID
 * @desc    Get document content and metadata
 * @route   GET /api/documents/:documentId
 * @access  Private
 */
const getDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        const userId = req.user.id;

        const result = await db.query(`
            SELECT * FROM documents
            WHERE id = $1 AND user_id = $2
        `, [documentId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Document not found'
            });
        }

        const document = result.rows[0];

        res.json({
            success: true,
            document: {
                id: document.id,
                name: document.original_name,
                content: document.content,
                type: document.mime_type,
                size: document.file_size,
                documentType: document.document_type,
                createdAt: document.created_at
            }
        });

    } catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch document'
        });
    }
};

module.exports = {
    createDocument,
    uploadDocument: [upload.single('document'), uploadDocument],
    getDocument
};