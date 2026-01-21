/**
 * Python Bridge Service
 *
 * Bridges Node.js backend to Python essaymentor-ai system
 * Spawns Python child processes to generate college essays using the 6-agent system
 */

const { spawn } = require('child_process');
const path = require('path');

// Path to essaymentor-ai directory (configured in .env)
const ESSAYMENTOR_PATH = process.env.ESSAYMENTOR_PATH || 'C:\\Users\\bilal\\Desktop\\essaymentor-ai';
const PYTHON_PATH = process.env.PYTHON_VENV_PATH
  ? path.join(process.env.PYTHON_VENV_PATH, 'Scripts', 'python.exe')
  : path.join(ESSAYMENTOR_PATH, 'venv_py312', 'Scripts', 'python.exe');
const SCRIPT_PATH = path.join(__dirname, '../scripts/run_essay_generation.py');

class PythonBridgeService {

  /**
   * Generate a college essay using the essaymentor-ai 6-agent system
   *
   * @param {string} prompt - The essay prompt
   * @param {Object} studentProfile - Student profile for personalization
   * @param {string} university - Target university name
   * @param {number} wordCount - Target word count (default 650)
   * @returns {Promise<Object>} - Generated essay, critique, and metadata
   */
  async generateEssay(prompt, studentProfile, university, wordCount = 650) {
    return new Promise((resolve, reject) => {
      console.log('[Python Bridge] Starting essay generation...');
      console.log(`[Python Bridge] University: ${university}`);
      console.log(`[Python Bridge] Word Count: ${wordCount}`);
      console.log(`[Python Bridge] Python Path: ${PYTHON_PATH}`);
      console.log(`[Python Bridge] Script Path: ${SCRIPT_PATH}`);

      // Prepare arguments for Python script
      const args = [
        SCRIPT_PATH,
        '--prompt', prompt,
        '--university', university,
        '--word-count', wordCount.toString(),
        '--student-profile', JSON.stringify(studentProfile),
        '--essaymentor-path', ESSAYMENTOR_PATH
      ];

      console.log('[Python Bridge] Spawning Python process...');

      // Spawn Python process with Claude API key for high-quality generation
      const pythonProcess = spawn(PYTHON_PATH, args, {
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1', // Ensure immediate output
          ESSAYMENTOR_PATH: ESSAYMENTOR_PATH,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '' // Pass Claude API key
        }
      });

      let stdoutData = '';
      let stderrData = '';
      let lastProgressUpdate = Date.now();

      // Capture stdout
      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdoutData += output;

        // Log progress for debugging (throttle to avoid spam)
        const now = Date.now();
        if (now - lastProgressUpdate > 2000) {
          console.log(`[Python]: ${output.trim()}`);
          lastProgressUpdate = now;
        }
      });

      // Capture stderr (includes progress updates from agents)
      pythonProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderrData += output;

        // Log agent progress
        if (output.includes('Agent') || output.includes('Running') || output.includes('Generating')) {
          console.log(`[Python Progress]: ${output.trim()}`);
        } else {
          console.error(`[Python Error]: ${output.trim()}`);
        }
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        console.log(`[Python Bridge] Process exited with code ${code}`);

        if (code === 0) {
          try {
            // Parse JSON output from Python
            // The script outputs JSON to stdout
            const lines = stdoutData.split('\n');
            const jsonLine = lines.find(line => line.trim().startsWith('{'));

            if (!jsonLine) {
              reject(new Error('No JSON output from Python script'));
              return;
            }

            const result = JSON.parse(jsonLine);

            console.log('[Python Bridge] Essay generation successful!');
            console.log(`[Python Bridge] Essay word count: ${result.word_count}`);
            console.log(`[Python Bridge] Quality score: ${result.quality_score}/10`);

            resolve(result);
          } catch (error) {
            console.error('[Python Bridge] Failed to parse output:', error.message);
            console.error('[Python Bridge] Stdout:', stdoutData);
            reject(new Error(`Failed to parse Python output: ${error.message}`));
          }
        } else {
          const errorMsg = stderrData || stdoutData || `Python process exited with code ${code}`;
          console.error('[Python Bridge] Process failed:', errorMsg);
          reject(new Error(`Essay generation failed: ${errorMsg}`));
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        console.error('[Python Bridge] Failed to start process:', error.message);
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });

      // Set timeout (10 minutes max - essay generation can take a while)
      const timeout = setTimeout(() => {
        console.error('[Python Bridge] Process timeout!');
        pythonProcess.kill('SIGTERM');
        reject(new Error('Essay generation timeout (exceeded 10 minutes)'));
      }, 600000);

      pythonProcess.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  /**
   * Test Python environment and essaymentor-ai availability
   *
   * @returns {Promise<Object>} - Status and version information
   */
  async testConnection() {
    return new Promise((resolve, reject) => {
      console.log('[Python Bridge] Testing Python connection...');

      const testProcess = spawn(PYTHON_PATH, ['--version']);

      let output = '';

      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      testProcess.stderr.on('data', (data) => {
        output += data.toString();
      });

      testProcess.on('close', (code) => {
        if (code === 0 || output.includes('Python')) {
          console.log('[Python Bridge] Connection test successful:', output.trim());
          resolve({
            success: true,
            pythonVersion: output.trim(),
            pythonPath: PYTHON_PATH,
            scriptPath: SCRIPT_PATH,
            essaymentorPath: ESSAYMENTOR_PATH
          });
        } else {
          reject(new Error(`Python not found at ${PYTHON_PATH}`));
        }
      });

      testProcess.on('error', (error) => {
        reject(new Error(`Failed to test Python: ${error.message}`));
      });
    });
  }
}

module.exports = new PythonBridgeService();
