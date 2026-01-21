# Quick Start: Essay Generator

## ⚡ 5-Minute Setup

### 1. Run Database Migration (PostgreSQL)
```bash
cd educators-edge-backend
psql -U postgres -d your_database_name -f migrations/add_essay_subscription_fields.sql
```

### 2. Update .env
```env
ESSAYMENTOR_PATH=C:\Users\bilal\Desktop\essaymentor-ai
PYTHON_VENV_PATH=C:\Users\bilal\Desktop\essaymentor-ai\venv_py312
MONGO_URI=mongodb://localhost:27017/educators-edge
```

### 3. Start Services
```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start Backend
cd educators-edge-backend
npm run dev

# Terminal 3: Start Frontend
cd educators-edge-frontend
npm run dev
```

### 4. Test It
1. Login to your app
2. Navigate to: `http://localhost:5173/essay-generator`
3. Select university: **MIT**
4. Paste prompt: "Describe something you're passionate about"
5. Set word count: **650**
6. Click **Generate Essay**
7. Wait 60-90 seconds
8. View generated essay!

---

## 🔍 Quick Test (Backend Only)

### Test Python Connection
```bash
curl http://localhost:5000/api/essays/test-connection \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Generate Essay
```bash
curl -X POST http://localhost:5000/api/essays/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What makes you curious?",
    "university": "MIT",
    "wordCount": 650
  }'
```

### Check Status
```bash
# Use essay_id from response above
curl http://localhost:5000/api/essays/ESSAY_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎯 Routes Added

| URL | Description |
|-----|-------------|
| `/essay-generator` | Generate new essays |
| `/essays` | View all your essays |
| `/essays/:essayId` | View specific essay |

---

## 🐛 Quick Troubleshooting

### "Python process failed"
- ✅ Is Ollama running? (`ollama serve`)
- ✅ Check Python path in `.env`

### "MongoDB connection failed"
- ✅ Start MongoDB: `net start MongoDB` (Windows) or `brew services start mongodb-community` (Mac)

### "Quota exceeded"
```sql
-- Reset user quota
UPDATE users SET free_essays_used = 0 WHERE id = 'your-user-id';
```

---

## 📋 New Files Created

**Backend (7 files)**:
- `models/Essay.js`
- `controllers/essay.controller.js`
- `services/essay.service.js`
- `services/python-bridge.service.js`
- `routes/essay.routes.js`
- `scripts/run_essay_generation.py`
- `config/essaymentor.config.js`
- `migrations/add_essay_subscription_fields.sql`

**Frontend (7 files)**:
- `src/services/essayService.ts`
- `src/pages/EssayGenerator/EssayGenerator.tsx`
- `src/pages/EssayGenerator/EssayGenerator.css`
- `src/pages/EssayGenerator/EssayView.tsx`
- `src/pages/EssayGenerator/EssayView.css`
- `src/pages/EssayGenerator/EssayList.tsx`
- `src/pages/EssayGenerator/EssayList.css`
- `src/pages/EssayGenerator/index.ts`

**Updated Files**:
- `educators-edge-backend/server.js`
- `educators-edge-frontend/src/App.tsx`

---

## ✅ Implementation Complete!

The EssayMentor AI 6-agent system is now fully integrated. Start the services and test it out!

For detailed documentation, see: `ESSAYMENTOR_INTEGRATION_COMPLETE.md`
