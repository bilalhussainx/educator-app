#!/usr/bin/env node

/**
 * Server Restart Script for Zenith Trade
 * 
 * This script safely stops any existing server on port 10000
 * and starts a fresh instance for the Market Replay Engine
 */

const { exec, spawn } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 10000;

async function findProcessOnPort(port) {
  return new Promise((resolve) => {
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (error || !stdout) {
        resolve(null);
        return;
      }
      
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts[0] === 'TCP' && parts[1].includes(`:${port}`)) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0') {
            resolve(pid);
            return;
          }
        }
      }
      resolve(null);
    });
  });
}

async function killProcess(pid) {
  return new Promise((resolve) => {
    exec(`taskkill /PID ${pid} /F`, (error, stdout, stderr) => {
      if (error) {
        console.log(`⚠️  Could not kill process ${pid}:`, error.message);
        resolve(false);
      } else {
        console.log(`✅ Successfully killed process ${pid}`);
        resolve(true);
      }
    });
  });
}

async function waitForPortToClear(port, maxWait = 5000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    const pid = await findProcessOnPort(port);
    if (!pid) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

async function startServer() {
  console.log('🚀 Starting Zenith Trade Server...');
  
  const serverProcess = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  let serverStarted = false;
  let startupTimeout;

  // Create a promise that resolves when server starts or rejects on timeout
  return new Promise((resolve, reject) => {
    startupTimeout = setTimeout(() => {
      if (!serverStarted) {
        console.log('⚠️  Server startup timeout - but may still be starting...');
        resolve(serverProcess);
      }
    }, 10000);

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(output);
      
      if (output.includes(`Server is running on port ${PORT}`) && !serverStarted) {
        serverStarted = true;
        clearTimeout(startupTimeout);
        console.log('✅ Server started successfully!');
        console.log('🎯 Market Replay Engine WebSocket available at ws://localhost:10000/ws/trade');
        resolve(serverProcess);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      process.stderr.write(output);
      
      if (output.includes('EADDRINUSE') && !serverStarted) {
        clearTimeout(startupTimeout);
        reject(new Error(`Port ${PORT} is still in use`));
      }
    });

    serverProcess.on('close', (code) => {
      clearTimeout(startupTimeout);
      if (!serverStarted) {
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    serverProcess.on('error', (error) => {
      clearTimeout(startupTimeout);
      reject(error);
    });
  });
}

async function main() {
  console.log('🔄 Zenith Trade Server Restart');
  console.log('==============================');
  
  try {
    // Check if port is in use
    console.log(`🔍 Checking if port ${PORT} is in use...`);
    const existingPid = await findProcessOnPort(PORT);
    
    if (existingPid) {
      console.log(`📋 Found existing process on port ${PORT} (PID: ${existingPid})`);
      console.log('🛑 Stopping existing server...');
      
      const killed = await killProcess(existingPid);
      if (killed) {
        console.log('⏳ Waiting for port to clear...');
        const cleared = await waitForPortToClear(PORT);
        if (!cleared) {
          throw new Error(`Port ${PORT} did not clear after stopping process`);
        }
        console.log(`✅ Port ${PORT} is now available`);
      }
    } else {
      console.log(`✅ Port ${PORT} is available`);
    }

    // Start the server
    const serverProcess = await startServer();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        serverProcess.kill('SIGKILL');
        process.exit(0);
      }, 5000);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        serverProcess.kill('SIGKILL');
        process.exit(0);
      }, 5000);
    });

  } catch (error) {
    console.error('❌ Failed to restart server:', error.message);
    
    if (error.message.includes('still in use')) {
      console.log('\n💡 Manual steps to resolve:');
      console.log('1. Open Task Manager (Ctrl+Shift+Esc)');
      console.log('2. Find any Node.js processes');
      console.log('3. End those processes');
      console.log('4. Run this script again');
      console.log('\nOr try running: npm run stop-all');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}