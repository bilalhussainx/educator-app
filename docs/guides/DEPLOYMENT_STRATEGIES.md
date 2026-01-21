# 🚀 PRODUCTION DEPLOYMENT STRATEGIES FOR LEETCODE EXECUTION

## 🏗️ DEPLOYMENT OPTIONS

### **Option 1: Docker + VPS (Recommended for Full Control)**

**Platforms**: DigitalOcean, AWS EC2, Google Compute Engine, Linode

**Architecture:**
```
Frontend (Vercel/Netlify) → Backend API → Docker Containers → Results
```

**Setup Steps:**

1. **Server Setup:**
```bash
# Ubuntu 22.04 VPS
sudo apt update
sudo apt install docker.io docker-compose nginx
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

2. **Deploy Application:**
```bash
# Clone your repo
git clone your-repo-url /opt/educator-app
cd /opt/educator-app

# Build Docker images
docker build -f docker-execution/Dockerfile.leetcode -t leetcode-executor .

# Start services
docker-compose up -d
```

3. **Docker Compose Configuration:**
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: educator_db
      POSTGRES_USER: educator
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  executor:
    build:
      context: .
      dockerfile: docker-execution/Dockerfile.leetcode
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'

volumes:
  redis_data:
  postgres_data:
```

**Cost**: ~$20-40/month for mid-tier VPS

---

### **Option 2: Serverless Functions (Budget-Friendly)**

**Platforms**: Vercel, Netlify Functions, AWS Lambda

**Architecture:**
```
Frontend → API Routes → Serverless Functions → Results
```

**Implementation:**

1. **Vercel API Route:**
```javascript
// /api/execute-code.js
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    const { code, testCases, language } = req.body;

    try {
        // Create temp file in /tmp (writable in Vercel)
        const tempFile = path.join('/tmp', `code_${Date.now()}.${getExtension(language)}`);

        // Generate test wrapper
        const testCode = generateTestWrapper(code, testCases, language);
        fs.writeFileSync(tempFile, testCode);

        // Execute with timeout
        const result = execSync(`timeout 10s ${getCommand(language)} ${tempFile}`,
            { encoding: 'utf8', timeout: 10000 });

        const parsedResult = JSON.parse(result);
        res.json({ success: true, results: parsedResult });

    } catch (error) {
        res.json({ success: false, error: error.message });
    } finally {
        // Cleanup
        try { fs.unlinkSync(tempFile); } catch {}
    }
}
```

2. **Language Support:**
```javascript
function getCommand(language) {
    switch (language) {
        case 'javascript': return 'node';
        case 'python': return 'python3';
        default: throw new Error(`Unsupported: ${language}`);
    }
}
```

**Limitations:**
- Only Node.js and Python available
- 10-second execution timeout
- Limited to simple problems
- No Java support

**Cost**: Free tier available, ~$5-15/month

---

### **Option 3: Kubernetes (Enterprise Scale)**

**Platforms**: AWS EKS, Google GKE, Azure AKS

**Architecture:**
```
Load Balancer → API Pods → Execution Jobs → Results
```

**Kubernetes Manifests:**

1. **Execution Job Template:**
```yaml
# k8s/execution-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: code-execution-{session-id}
spec:
  ttlSecondsAfterFinished: 60
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: executor
        image: your-registry/leetcode-executor:latest
        resources:
          limits:
            memory: "128Mi"
            cpu: "0.5"
          requests:
            memory: "64Mi"
            cpu: "0.1"
        env:
        - name: CODE
          value: "{user-code}"
        - name: TEST_CASES
          value: "{test-cases}"
        - name: LANGUAGE
          value: "{language}"
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          allowPrivilegeEscalation: false
```

2. **Service Implementation:**
```javascript
const k8s = require('@kubernetes/client-node');

class K8sExecutor {
    async executeCode(code, testCases, language) {
        const jobManifest = this.createJobManifest(code, testCases, language);
        const job = await this.k8sApi.createNamespacedJob('default', jobManifest);

        // Wait for completion
        const result = await this.waitForJobCompletion(job.body.metadata.name);
        return result;
    }
}
```

**Cost**: ~$100-500/month depending on usage

---

### **Option 4: Third-Party Execution Services**

**Platforms**: Judge0, Sphere Engine, CodeX

**Architecture:**
```
Your API → Third-Party Service → Results
```

**Implementation:**

1. **Judge0 Integration:**
```javascript
const axios = require('axios');

class Judge0Executor {
    async executeCode(code, testCases, language) {
        const languageMap = {
            'javascript': 63, // Node.js
            'python': 71,     // Python 3
            'java': 62        // Java
        };

        const testWrapper = this.generateTestWrapper(code, testCases, language);

        const response = await axios.post('https://api.judge0.com/submissions', {
            source_code: Buffer.from(testWrapper).toString('base64'),
            language_id: languageMap[language],
            stdin: '',
            cpu_time_limit: 2,
            memory_limit: 128000
        });

        const token = response.data.token;

        // Poll for results
        const result = await this.pollResult(token);
        return JSON.parse(Buffer.from(result.stdout, 'base64').toString());
    }
}
```

**Benefits:**
- No infrastructure management
- All languages supported
- Built-in security

**Cost**: ~$0.01-0.05 per execution

---

## 🎯 RECOMMENDED DEPLOYMENT STRATEGY

### **For MVP/Testing: Vercel + Judge0**
- Frontend: Vercel (free)
- Database: Supabase (free tier)
- Execution: Judge0 API (~$10/month)
- **Total**: ~$10/month

### **For Production: VPS + Docker**
- Frontend: Vercel/Netlify
- Backend + Database: DigitalOcean VPS ($20/month)
- Docker containers for execution
- **Total**: ~$20-30/month

### **For Enterprise: Kubernetes**
- Full Kubernetes deployment
- Auto-scaling based on load
- Enterprise security features
- **Total**: $100+/month

---

## 📋 IMPLEMENTATION CHECKLIST

### **Phase 1: Serverless MVP**
- [ ] Deploy frontend to Vercel
- [ ] Create serverless execution API routes
- [ ] Integrate Judge0 or similar service
- [ ] Test with sample problems

### **Phase 2: VPS Production**
- [ ] Set up VPS with Docker
- [ ] Deploy custom execution containers
- [ ] Implement Redis queue system
- [ ] Add monitoring and logging

### **Phase 3: Scale & Security**
- [ ] Add rate limiting
- [ ] Implement user authentication
- [ ] Set up CI/CD pipeline
- [ ] Add comprehensive monitoring

---

## 🔒 SECURITY CONSIDERATIONS

1. **Container Security:**
   - Non-root users
   - Read-only filesystems
   - Resource limits
   - Network isolation

2. **API Security:**
   - Rate limiting
   - Input validation
   - Authentication tokens
   - CORS policies

3. **Infrastructure Security:**
   - SSL certificates
   - Firewall rules
   - Regular updates
   - Backup strategies