const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');

// Azure SAS URL Service for secure video streaming
// Generates secure, time-limited access URLs for recorded educational content

class AzureSASService {
    constructor() {
        this.accountName = process.env.AGORA_AZURE_ACCESS_KEY; // Storage account name
        this.accountKey = process.env.AGORA_AZURE_SECRET_KEY; // Access key
        this.containerName = process.env.AGORA_AZURE_BUCKET; // Container name
        
        if (!this.accountName || !this.accountKey || !this.containerName) {
            console.error('[AZURE SAS] Missing Azure storage configuration');
            throw new Error('Azure storage configuration incomplete. Check AGORA_AZURE_* environment variables.');
        }

        // Initialize Azure Blob Service Client
        try {
            const sharedKeyCredential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
            this.blobServiceClient = new BlobServiceClient(
                `https://${this.accountName}.blob.core.windows.net`,
                sharedKeyCredential
            );
            console.log(`[AZURE SAS] Service initialized for account: ${this.accountName}`);
        } catch (error) {
            console.error('[AZURE SAS] Failed to initialize Azure client:', error.message);
            throw error;
        }
    }

    /**
     * Generate a SAS URL for a recorded video with appropriate permissions and expiry
     * @param {string} fileName - The name of the video file in Azure blob storage
     * @param {number} hoursValid - How many hours the URL should be valid (default: 24)
     * @returns {string} The complete SAS URL for video streaming
     */
    generateVideoSASURL(fileName, hoursValid = 24) {
        try {
            console.log(`[AZURE SAS] Generating SAS URL for file: ${fileName}, valid for: ${hoursValid} hours`);

            // Set permissions for video streaming (read only)
            const permissions = BlobSASPermissions.parse('r'); // Read permission only
            
            // Set expiry time
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + hoursValid);
            
            // Generate SAS query parameters
            const sasQueryParams = generateBlobSASQueryParameters({
                containerName: this.containerName,
                blobName: fileName,
                permissions: permissions,
                startsOn: new Date(), // Valid from now
                expiresOn: expiryDate, // Valid until expiry
                protocol: 'https' // HTTPS only for security
            }, new StorageSharedKeyCredential(this.accountName, this.accountKey));

            // Construct the complete SAS URL
            const sasUrl = `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${fileName}?${sasQueryParams.toString()}`;
            
            console.log(`[AZURE SAS] ✅ SAS URL generated successfully, expires: ${expiryDate.toISOString()}`);
            
            return sasUrl;

        } catch (error) {
            console.error(`[AZURE SAS] ❌ Failed to generate SAS URL for ${fileName}:`, error.message);
            throw new Error(`Failed to generate secure video URL: ${error.message}`);
        }
    }

    /**
     * Generate a SAS URL with extended permissions for teacher access
     * @param {string} fileName - The name of the video file
     * @param {number} hoursValid - Validity period in hours (default: 168 = 1 week)
     * @returns {string} SAS URL with read permissions
     */
    generateTeacherSASURL(fileName, hoursValid = 168) {
        try {
            console.log(`[AZURE SAS] Generating teacher SAS URL for: ${fileName}`);
            
            return this.generateVideoSASURL(fileName, hoursValid);
            
        } catch (error) {
            console.error(`[AZURE SAS] Failed to generate teacher SAS URL:`, error.message);
            throw error;
        }
    }

    /**
     * Generate a SAS URL with limited access for student viewing
     * @param {string} fileName - The name of the video file
     * @param {number} hoursValid - Validity period in hours (default: 24)
     * @returns {string} SAS URL with read-only permissions
     */
    generateStudentSASURL(fileName, hoursValid = 24) {
        try {
            console.log(`[AZURE SAS] Generating student SAS URL for: ${fileName}`);
            
            return this.generateVideoSASURL(fileName, hoursValid);
            
        } catch (error) {
            console.error(`[AZURE SAS] Failed to generate student SAS URL:`, error.message);
            throw error;
        }
    }

    /**
     * Extract filename from a full Azure Blob Storage URL
     * @param {string} fullUrl - Complete Azure blob URL
     * @returns {string} Just the filename portion
     */
    extractFileNameFromUrl(fullUrl) {
        try {
            if (!fullUrl || !fullUrl.includes('blob.core.windows.net')) {
                throw new Error('Invalid Azure Blob Storage URL');
            }

            // Extract filename from URL like: https://account.blob.core.windows.net/container/filename.mp4
            const urlParts = fullUrl.split('/');
            const fileName = urlParts[urlParts.length - 1];
            
            // Remove any existing query parameters
            return fileName.split('?')[0];
            
        } catch (error) {
            console.error(`[AZURE SAS] Failed to extract filename from URL: ${fullUrl}`, error.message);
            throw error;
        }
    }

    /**
     * Check if a blob exists in the container
     * @param {string} fileName - Name of the file to check
     * @returns {boolean} True if file exists, false otherwise
     */
    async checkFileExists(fileName) {
        try {
            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            const blobClient = containerClient.getBlobClient(fileName);
            
            const response = await blobClient.exists();
            console.log(`[AZURE SAS] File ${fileName} exists: ${response}`);
            
            return response;
            
        } catch (error) {
            console.warn(`[AZURE SAS] Could not check if file exists: ${fileName}`, error.message);
            return false;
        }
    }

    /**
     * Get blob properties including content type for video streaming optimization
     * @param {string} fileName - Name of the file
     * @returns {Object} File properties including size, content type, etc.
     */
    async getFileProperties(fileName) {
        try {
            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            const blobClient = containerClient.getBlobClient(fileName);
            
            const properties = await blobClient.getProperties();
            
            console.log(`[AZURE SAS] File properties for ${fileName}:`, {
                size: properties.contentLength,
                type: properties.contentType,
                modified: properties.lastModified
            });
            
            return {
                fileName,
                size: properties.contentLength,
                contentType: properties.contentType,
                lastModified: properties.lastModified,
                exists: true
            };
            
        } catch (error) {
            console.warn(`[AZURE SAS] Could not get file properties: ${fileName}`, error.message);
            return {
                fileName,
                exists: false,
                error: error.message
            };
        }
    }
}

// Export singleton instance
module.exports = new AzureSASService();