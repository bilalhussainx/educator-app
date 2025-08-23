// ----------------------------------------------------------------
// 3. UPDATED FILE: controllers/deploymentController.js
// ----------------------------------------------------------------
// This file is now simpler and correctly imports the service function.
const deployToNetlify = require('../services/deploymentService');

const handleDeployment = async (req, res) => {
  const { files } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ message: 'No files provided for deployment.' });
  }

  try {
    const deploymentUrl = await deployToNetlify(files);
    res.status(200).json({ url: deploymentUrl });
  } catch (error) {
    console.error('Deployment controller error:', error.message);
    res.status(500).json({ message: error.message || 'An internal server error occurred during deployment.' });
  }
};

module.exports = {
  handleDeployment,
};
// const { NetlifyAPI } = require('netlify');
// const archiver = require('archiver');
// const stream = require('stream');

// /**
//  * Deploys a set of files to Netlify by creating an in-memory zip archive
//  * and using the official API client's `createSiteDeploy` method.
//  * @param {Array<Object>} files - An array of file objects.
//  * @returns {Promise<string>} - A promise that resolves with the live deployment URL.
//  */
// const deployToNetlify = async (files) => {
//   try {
//     // Get the Netlify auth token and site ID from environment variables
//     const netlifyToken = process.env.NETLIFY_AUTH_TOKEN;
//     const netlifySiteId = process.env.NETLIFY_SITE_ID;

//     if (!netlifyToken || !netlifySiteId) {
//       throw new Error('Netlify auth token or site ID is not configured on the server.');
//     }

//     // Create a zip archive in memory
//     const archive = archiver('zip');
//     const passThrough = new stream.PassThrough();
//     archive.pipe(passThrough);

//     // Add all files to the archive
//     for (const file of files) {
//       archive.append(file.content, { name: file.name });
//     }
    
//     // Finalize the archive. This is crucial.
//     await archive.finalize();

//     // Initialize the official Netlify API client
//     const client = new NetlifyAPI(netlifyToken);

//     // FIX: Use the correct `createSiteDeploy` method instead of `deploy`.
//     // This is the more direct and reliable way to deploy programmatically.
//     const deploy = await client.createSiteDeploy({
//       siteId: netlifySiteId,
//       body: passThrough, // The body should be the zip archive stream
//       // The 'prod' flag is set in the deploy options, not as a separate parameter
//       deploy: {
//         prod: true,
//         message: `Deployment from Educator's Edge ${new Date().toISOString()}`,
//       },
//     });

//     // The live URL is available in the response object
//     if (deploy && deploy.deploy_url) {
//       return deploy.deploy_url;
//     } else {
//       console.error('Netlify API response did not contain a deploy URL:', deploy);
//       throw new Error('Deployment succeeded, but no deploy URL was returned.');
//     }

//   } catch (error) {
//     console.error('An error occurred during the Netlify API deployment:', error.message);
//     // Provide a clearer error message to the client
//     throw new Error('Deployment failed. Please check the server logs for details.');
//   }
// };

// // Export the function directly
// module.exports = deployToNetlify;
