# MongoDB Setup Guide for Essay Generator

MongoDB is required to store generated essays. You have two options:

## Option 1: MongoDB Atlas (Cloud - Recommended for Quick Start) ☁️

**Pros**: Free, no installation, works immediately
**Cons**: Requires internet connection

### Steps:

1. **Create Free MongoDB Atlas Account**
   - Go to: https://www.mongodb.com/cloud/atlas/register
   - Sign up with email or Google

2. **Create Free Cluster**
   - Choose "M0 Sandbox" (FREE tier)
   - Select region closest to you
   - Click "Create Cluster"

3. **Create Database User**
   - Go to "Database Access" in left sidebar
   - Click "Add New Database User"
   - Username: `educator-admin`
   - Password: Generate a secure password (save it!)
   - Set role: "Read and write to any database"

4. **Whitelist Your IP**
   - Go to "Network Access" in left sidebar
   - Click "Add IP Address"
   - Click "Allow Access From Anywhere" (0.0.0.0/0)
   - Or add your specific IP for better security

5. **Get Connection String**
   - Go to "Database" in left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like this):
   ```
   mongodb+srv://educator-admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

6. **Update .env File**
   ```env
   # Replace with your Atlas connection string
   MONGO_URI=mongodb+srv://educator-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/educators-edge?retryWrites=true&w=majority
   MONGODB_URI=mongodb+srv://educator-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/educators-edge?retryWrites=true&w=majority
   ```

   **Important**:
   - Replace `YOUR_PASSWORD` with the actual password
   - Add `/educators-edge` before the `?` to specify database name

7. **Test Connection**
   ```bash
   cd educators-edge-backend
   node verify-essay-setup.js
   ```

---

## Option 2: Local MongoDB Installation (Windows) 💻

**Pros**: Faster, works offline, full control
**Cons**: Requires installation and setup

### Steps:

1. **Download MongoDB Community Server**
   - Go to: https://www.mongodb.com/try/download/community
   - Version: Latest (currently 7.x)
   - Platform: Windows
   - Package: MSI
   - Click "Download"

2. **Install MongoDB**
   - Run the downloaded `.msi` file
   - Choose "Complete" installation
   - **IMPORTANT**: Check "Install MongoDB as a Service"
   - **IMPORTANT**: Check "Install MongoDB Compass" (GUI tool)
   - Click "Install"

3. **Verify Installation**
   ```bash
   # Open Command Prompt or PowerShell
   mongod --version
   ```

   Should show version like: `db version v7.0.x`

4. **Start MongoDB Service**

   **Option A - Automatic (if installed as service)**:
   ```bash
   net start MongoDB
   ```

   **Option B - Manual**:
   ```bash
   mongod --dbpath C:\data\db
   ```

5. **Verify MongoDB is Running**
   ```bash
   # Should connect successfully
   mongosh
   ```

   Type `exit` to quit

6. **Update .env File**
   ```env
   # Local MongoDB
   MONGO_URI=mongodb://localhost:27017/educators-edge
   MONGODB_URI=mongodb://localhost:27017/educators-edge
   ```

7. **Test Connection**
   ```bash
   cd educators-edge-backend
   node verify-essay-setup.js
   ```

---

## Troubleshooting

### "MongoDB connection failed: connect ECONNREFUSED"

**Cause**: MongoDB is not running

**Solution**:
```bash
# Windows - Start MongoDB service
net start MongoDB

# OR manually start
mongod --dbpath C:\data\db
```

### "MongoDB connection failed: Authentication failed"

**Cause**: Wrong username/password in Atlas connection string

**Solution**:
- Check your MongoDB Atlas dashboard
- Verify username and password
- Update .env with correct credentials

### "Data directory not found"

**Cause**: MongoDB data directory doesn't exist

**Solution**:
```bash
# Create data directory
mkdir C:\data\db
```

### "Port 27017 already in use"

**Cause**: Another MongoDB instance is running

**Solution**:
```bash
# Windows - Stop existing service
net stop MongoDB

# Then start fresh
net start MongoDB
```

---

## Quick Verification Commands

```bash
# Check if MongoDB is installed
mongod --version

# Check if MongoDB is running (Windows)
tasklist | findstr mongod

# Connect to MongoDB
mongosh

# In mongosh, list databases
show dbs

# Check if educators-edge database exists
use educators-edge
show collections
```

---

## Using MongoDB Compass (GUI)

If you installed MongoDB with Compass:

1. Open "MongoDB Compass"
2. Connection string: `mongodb://localhost:27017`
3. Click "Connect"
4. You'll see all databases
5. Find "educators-edge" database
6. View "essays" collection

---

## Cloud vs Local Comparison

| Feature | MongoDB Atlas (Cloud) | Local MongoDB |
|---------|----------------------|---------------|
| **Setup Time** | 5 minutes | 10-15 minutes |
| **Cost** | Free (512MB limit) | Free (unlimited) |
| **Internet Required** | Yes | No |
| **Speed** | Good | Excellent |
| **Backup** | Automatic | Manual |
| **Best For** | Testing, demos | Production, development |

---

## Recommended: Start with MongoDB Atlas

For the quickest setup, use MongoDB Atlas:

1. ✅ No installation required
2. ✅ Works immediately
3. ✅ Free tier is sufficient for testing
4. ✅ Can migrate to local later if needed

Simply follow "Option 1" above and you'll be running in 5 minutes!

---

## After MongoDB is Running

Once MongoDB is connected successfully:

```bash
# 1. Verify setup
cd educators-edge-backend
node verify-essay-setup.js

# 2. Start backend
npm run dev

# 3. Backend should show:
# ✅ MongoDB connected successfully for Essay storage
```

---

## Next Steps

After MongoDB is set up:

1. Start Ollama: `ollama serve`
2. Start Backend: `npm run dev`
3. Start Frontend: `cd ../educators-edge-frontend && npm run dev`
4. Test Essay Generator: `http://localhost:5173/essay-generator`

---

**Need Help?**

- MongoDB Documentation: https://docs.mongodb.com/
- MongoDB Atlas Tutorial: https://www.mongodb.com/docs/atlas/getting-started/
- Community Forums: https://www.mongodb.com/community/forums/
