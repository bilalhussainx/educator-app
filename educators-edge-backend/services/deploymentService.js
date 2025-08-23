// This service now uses axios for direct API communication as outlined in the Netlify docs.
// You will need to install axios in your project: npm install axios
const axios = require('axios');
const archiver = require('archiver');
const stream = require('stream');

/**
 * Collects a stream's data into a single buffer. This is crucial for ensuring
 * the entire zip archive is ready before sending it in the HTTP request.
 * @param {stream.Readable} streamToBuffer - The readable stream to buffer.
 * @returns {Promise<Buffer>} A promise that resolves with the complete buffer.
 */
const streamToBuffer = (streamToBuffer) => {
    return new Promise((resolve, reject) => {
        const chunks = [];
        streamToBuffer.on('data', (chunk) => chunks.push(chunk));
        streamToBuffer.on('error', reject);
        streamToBuffer.on('end', () => resolve(Buffer.concat(chunks)));
    });
};

/**
 * Deploys a set of files to Netlify by creating an in-memory zip archive
 * and POSTing it directly to the Netlify API, as per their official documentation.
 * @param {Array<Object>} files - An array of file objects with { name, content }.
 * @returns {Promise<string>} - A promise that resolves with the live deployment URL.
 */
const deployToNetlify = async (files) => {
    try {
        // Get the Netlify auth token and site ID from environment variables
        const netlifyToken = process.env.NETLIFY_AUTH_TOKEN;
        const netlifySiteId = process.env.NETLIFY_SITE_ID;

        if (!netlifyToken || !netlifySiteId) {
            throw new Error('Netlify auth token or site ID is not configured on the server.');
        }

        // 1. Create a zip archive in memory using the 'archiver' library.
        const archive = archiver('zip');
        
        // Add all the files from the request to the in-memory archive.
        for (const file of files) {
            if (file.content !== null && file.content !== undefined) {
                archive.append(file.content, { name: file.name });
            }
        }
        
        // Finalize the archive. This is essential to finish the zipping process.
        archive.finalize();

        // 2. Convert the archive stream to a buffer to ensure the entire file is ready.
        const zipBuffer = await streamToBuffer(archive);

        // 3. Deploy the zip file directly to the Netlify API using axios.
        // This follows the "ZIP file method" from the Netlify documentation.
        const url = `https://api.netlify.com/api/v1/sites/${netlifySiteId}/deploys`;
        
        const response = await axios.post(url, zipBuffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Authorization': `Bearer ${netlifyToken}`,
            },
        });

        // The live URL is available in the response data.
        const deploy = response.data;
        if (deploy && deploy.deploy_url) {
            return deploy.deploy_url;
        } else {
            console.error('Netlify API response did not contain a deploy URL:', deploy);
            throw new Error('Deployment succeeded, but no deploy URL was returned.');
        }

    } catch (error) {
        // Log detailed error information if the axios request fails.
        if (error.response) {
            console.error('Netlify API Error:', error.response.status, error.response.data);
        } else {
            console.error('An error occurred during the Netlify deployment process:', error.message);
        }
        throw new Error('Deployment failed. Please check the server logs for details.');
    }
};

// Export the function directly
module.exports = deployToNetlify;




