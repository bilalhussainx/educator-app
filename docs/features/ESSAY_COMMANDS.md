# 📋 Essay Generator - Quick Command Reference

## Setup Commands

### Verify Setup
```bash
cd educators-edge-backend
node verify-essay-setup.js
```

### Re-run Migration (if needed)
```bash
cd educators-edge-backend
node run-essay-migration.js
```

---

## MongoDB Commands

### Start MongoDB (Windows)
```bash
net start MongoDB
```

### Stop MongoDB (Windows)
```bash
net stop MongoDB
```

### Check if MongoDB is Running
```bash
tasklist | findstr mongod
```

### Connect to MongoDB
```bash
mongosh
```

### Manual MongoDB Start
```bash
mongod --dbpath C:\data\db
```

---

## Start Services

### Start All Services (3 Terminals)
```bash
# Terminal 1: Ollama
ollama serve

# Terminal 2: Backend
cd educators-edge-backend
npm run dev

# Terminal 3: Frontend
cd educators-edge-frontend
npm run dev
```

### Check Ollama Models
```bash
ollama list
# Should show: llama3.1:8b
```

---

## Test API Endpoints

### Test Python Connection
```bash
curl http://localhost:10000/api/essays/test-connection \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Universities
```bash
curl http://localhost:10000/api/essays/universities
```

### Get User Stats
```bash
curl http://localhost:10000/api/essays/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Generate Essay
```bash
curl -X POST http://localhost:10000/api/essays/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What makes you curious?",
    "university": "MIT",
    "wordCount": 650
  }'
```

### Get Essay Status
```bash
curl http://localhost:10000/api/essays/ESSAY_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Database Commands

### PostgreSQL - Reset User Quota
```sql
-- Connect to database
psql -U postgres -d neondb

-- Reset free essay count
UPDATE users SET free_essays_used = 0 WHERE email = 'user@example.com';

-- Upgrade user to paid
UPDATE users
SET subscription_tier = 'monthly',
    subscription_ends_at = NOW() + INTERVAL '30 days'
WHERE email = 'user@example.com';

-- Check user quota
SELECT email, subscription_tier, free_essays_used, essays_generated
FROM users
WHERE email = 'user@example.com';
```

### MongoDB - Check Essays
```bash
# Connect to MongoDB
mongosh

# Switch to database
use educators-edge

# Count essays
db.essays.countDocuments()

# Find recent essays
db.essays.find().sort({createdAt: -1}).limit(5)

# Find essays by status
db.essays.find({status: "complete"}).count()

# Delete all essays (CAREFUL!)
db.essays.deleteMany({})
```

---

## Troubleshooting Commands

### Check Logs
```bash
# Backend logs (if using pm2)
pm2 logs educators-edge-backend

# Or check console output where npm run dev is running
```

### Check Ports
```bash
# Check if ports are in use (Windows)
netstat -ano | findstr :10000  # Backend
netstat -ano | findstr :5173   # Frontend
netstat -ano | findstr :27017  # MongoDB
netstat -ano | findstr :11434  # Ollama
```

### Kill Processes (Windows)
```bash
# Kill process on port
taskkill /F /PID process_id

# Kill all node processes (CAREFUL!)
taskkill /F /IM node.exe
```

### Check Python
```bash
# Check Python version
C:\Users\bilal\Desktop\essaymentor-ai\venv_py312\Scripts\python.exe --version

# Test Python script
C:\Users\bilal\Desktop\essaymentor-ai\venv_py312\Scripts\python.exe educators-edge-backend/scripts/run_essay_generation.py --help
```

---

## Frontend URLs

| Page | URL |
|------|-----|
| Essay Generator | http://localhost:5173/essay-generator |
| All Essays | http://localhost:5173/essays |
| Specific Essay | http://localhost:5173/essays/:essayId |
| Dashboard | http://localhost:5173/dashboard |

---

## Common Issues & Fixes

### "MongoDB connection failed"
```bash
# Start MongoDB
net start MongoDB
```

### "Python process failed"
```bash
# Check Ollama is running
ollama list

# Start Ollama
ollama serve
```

### "Quota exceeded"
```sql
-- Reset in PostgreSQL
UPDATE users SET free_essays_used = 0 WHERE id = 'user-id';
```

### "Port already in use"
```bash
# Find and kill process
netstat -ano | findstr :10000
taskkill /F /PID process_id
```

### Backend won't start
```bash
# Clean install
cd educators-edge-backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## Quick Test Flow

1. **Verify Setup**
   ```bash
   cd educators-edge-backend && node verify-essay-setup.js
   ```

2. **Start Services**
   ```bash
   # Terminal 1
   ollama serve

   # Terminal 2
   cd educators-edge-backend && npm run dev

   # Terminal 3
   cd educators-edge-frontend && npm run dev
   ```

3. **Test in Browser**
   - Login: http://localhost:5173
   - Navigate to: Essay Generator
   - Fill form and generate essay
   - Wait 60-90 seconds
   - View result

4. **Check Database**
   ```bash
   mongosh
   use educators-edge
   db.essays.find().pretty()
   ```

---

## Environment Variables Quick Check

```bash
# In educators-edge-backend directory
grep -E "ESSAYMENTOR|MONGO|PYTHON" .env
```

Should show:
```
ESSAYMENTOR_PATH=C:\Users\bilal\Desktop\essaymentor-ai
PYTHON_VENV_PATH=C:\Users\bilal\Desktop\essaymentor-ai\venv_py312
MONGO_URI=mongodb://localhost:27017/educators-edge
MONGODB_URI=mongodb://localhost:27017/educators-edge
```

---

**Keep this handy for quick reference!** 📌
