/**
 * Verify Essay Generator Setup
 *
 * This script checks all requirements for the EssayMentor AI integration
 */

require('dotenv').config();
const { Pool } = require('pg');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const checks = {
  passed: [],
  failed: [],
  warnings: []
};

function logCheck(status, message) {
  const symbol = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${symbol} ${message}`);

  if (status === 'pass') checks.passed.push(message);
  else if (status === 'fail') checks.failed.push(message);
  else checks.warnings.push(message);
}

async function verifySetup() {
  console.log('🔍 EssayMentor AI Setup Verification\n');
  console.log('=' .repeat(60) + '\n');

  // 1. Check environment variables
  console.log('📋 Checking Environment Variables...');
  if (process.env.ESSAYMENTOR_PATH) {
    logCheck('pass', `ESSAYMENTOR_PATH: ${process.env.ESSAYMENTOR_PATH}`);
  } else {
    logCheck('fail', 'ESSAYMENTOR_PATH not set in .env');
  }

  if (process.env.PYTHON_VENV_PATH) {
    logCheck('pass', `PYTHON_VENV_PATH: ${process.env.PYTHON_VENV_PATH}`);
  } else {
    logCheck('fail', 'PYTHON_VENV_PATH not set in .env');
  }

  if (process.env.MONGO_URI || process.env.MONGODB_URI) {
    logCheck('pass', `MongoDB URI configured`);
  } else {
    logCheck('fail', 'MONGO_URI or MONGODB_URI not set in .env');
  }

  console.log('');

  // 2. Check file paths
  console.log('📁 Checking File Paths...');

  const essaymentorPath = process.env.ESSAYMENTOR_PATH;
  if (essaymentorPath && fs.existsSync(essaymentorPath)) {
    logCheck('pass', `EssayMentor AI directory exists`);
  } else {
    logCheck('fail', `EssayMentor AI directory not found: ${essaymentorPath}`);
  }

  const pythonPath = process.env.PYTHON_VENV_PATH
    ? path.join(process.env.PYTHON_VENV_PATH, 'Scripts', 'python.exe')
    : null;

  if (pythonPath && fs.existsSync(pythonPath)) {
    logCheck('pass', `Python executable found`);
  } else {
    logCheck('fail', `Python executable not found: ${pythonPath}`);
  }

  const scriptPath = path.join(__dirname, 'scripts', 'run_essay_generation.py');
  if (fs.existsSync(scriptPath)) {
    logCheck('pass', 'Python wrapper script exists');
  } else {
    logCheck('fail', 'Python wrapper script missing');
  }

  console.log('');

  // 3. Check PostgreSQL connection
  console.log('🗄️  Checking PostgreSQL Connection...');
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();

    // Check if essay columns exist
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('subscription_tier', 'free_essays_used', 'essays_generated')
      ORDER BY column_name;
    `);

    if (result.rows.length === 3) {
      logCheck('pass', 'PostgreSQL connected - Essay subscription fields exist');
    } else {
      logCheck('fail', 'Essay subscription fields missing in users table');
    }

    client.release();
    await pool.end();
  } catch (error) {
    logCheck('fail', `PostgreSQL connection failed: ${error.message}`);
  }

  console.log('');

  // 4. Check MongoDB connection
  console.log('🍃 Checking MongoDB Connection...');
  try {
    await mongoose.connect(
      process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/educators-edge',
      { serverSelectionTimeoutMS: 5000 }
    );

    logCheck('pass', 'MongoDB connected successfully');

    // Check if Essay model can be loaded
    try {
      const Essay = require('./models/Essay');
      logCheck('pass', 'Essay model loaded successfully');
    } catch (error) {
      logCheck('warn', 'Essay model could not be loaded');
    }

    await mongoose.disconnect();
  } catch (error) {
    if (error.message.includes('ECONNREFUSED')) {
      logCheck('fail', `MongoDB connection failed: Connection refused`);
      logCheck('warn', 'MongoDB might not be running. Check MongoDB Compass or start the service.');
    } else {
      logCheck('fail', `MongoDB connection failed: ${error.message}`);
    }
  }

  console.log('');

  // 5. Check Python/Ollama
  console.log('🐍 Checking Python Environment...');
  if (pythonPath && fs.existsSync(pythonPath)) {
    try {
      const pythonProcess = spawn(pythonPath, ['--version']);
      let output = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        output += data.toString();
      });

      await new Promise((resolve) => {
        pythonProcess.on('close', (code) => {
          if (code === 0 || output.includes('Python')) {
            logCheck('pass', `Python version: ${output.trim()}`);
          } else {
            logCheck('fail', 'Python executable not working');
          }
          resolve();
        });
      });
    } catch (error) {
      logCheck('fail', `Python check failed: ${error.message}`);
    }
  }

  console.log('');

  // 6. Check required modules
  console.log('📦 Checking Required Packages...');
  const requiredModules = ['mongoose', 'axios', 'express'];
  for (const module of requiredModules) {
    try {
      require.resolve(module);
      logCheck('pass', `${module} installed`);
    } catch (error) {
      logCheck('fail', `${module} not installed`);
    }
  }

  console.log('');

  // Summary
  console.log('=' .repeat(60));
  console.log('\n📊 Setup Verification Summary:\n');
  console.log(`✅ Passed: ${checks.passed.length}`);
  console.log(`❌ Failed: ${checks.failed.length}`);
  console.log(`⚠️  Warnings: ${checks.warnings.length}`);

  console.log('\n');

  if (checks.failed.length === 0) {
    console.log('🎉 All checks passed! EssayMentor AI is ready to use.');
    console.log('\n📝 Next steps:');
    console.log('   1. Start Ollama: ollama serve');
    console.log('   2. Start backend: npm run dev');
    console.log('   3. Test: http://localhost:10000/api/essays/test-connection');
  } else {
    console.log('❌ Setup incomplete. Please fix the following issues:\n');
    checks.failed.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }

  if (checks.warnings.length > 0) {
    console.log('\n⚠️  Warnings:\n');
    checks.warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
  }

  console.log('\n');
  process.exit(checks.failed.length === 0 ? 0 : 1);
}

verifySetup();
