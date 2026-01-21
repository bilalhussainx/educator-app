# Docker Sandbox Code Execution System

## Overview

This implementation provides a secure, scalable Docker-based code execution system for your educator app that works with Render deployment. Students and teachers can now run Python, JavaScript, Java, and other languages in isolated Docker containers with real-time terminal access.

## 🏗️ Architecture

### Backend Components

1. **DockerSandboxService** (`services/dockerSandboxService.js`)
   - Manages Docker container lifecycle
   - Provides secure code execution in isolated environments
   - Handles session management and cleanup
   - Supports multiple programming languages

2. **TerminalController** (`controllers/terminalController.js`)
   - REST API endpoints for terminal operations
   - Session management and authentication
   - Code execution with results tracking

3. **WebSocketTerminalHandler** (`services/websocketTerminalHandler.js`)
   - Real-time terminal communication via WebSockets
   - Bidirectional streaming for terminal I/O
   - Session-based message routing

### Frontend Components

1. **useDockerTerminal** (`hooks/useDockerTerminal.ts`)
   - React hook for terminal functionality
   - WebSocket connection management
   - Code execution helpers

2. **DockerTerminal** (`components/DockerTerminal.tsx`)
   - Reusable terminal component
   - xterm.js integration for terminal UI
   - Quick execution buttons

3. **Enhanced IDEs**
   - **AscentWebIDE**: Added terminal tab alongside preview/tests
   - **AscentIDE**: Added terminal tab in diagnostics panel
   - **LiveTutorialPage**: Real-time terminal for teaching

## 🚀 Key Features

### Secure Execution Environment
- **Containerized**: Each session runs in isolated Docker containers
- **Resource Limited**: Memory (128MB) and CPU (0.5 cores) limits
- **Network Isolated**: No external network access by default
- **Time Limited**: 30-second execution timeout
- **Automatic Cleanup**: Containers are automatically removed after use

### Multi-Language Support
- **Python**: Full Python 3 with common packages (numpy, pandas, matplotlib)
- **JavaScript/Node.js**: Latest Node.js runtime
- **Java**: OpenJDK 17 with compilation support
- **Bash/Shell**: Shell scripting capabilities

### Real-Time Communication
- **WebSocket Integration**: Live terminal output streaming
- **Session Persistence**: Maintain terminal state across interactions
- **Multi-Client Support**: Multiple users can connect to the same session

### User Experience
- **Tab Integration**: Seamlessly integrated into existing IDEs
- **Quick Execution**: One-click code running for different languages
- **Visual Feedback**: Connection status, execution time, and error handling
- **Responsive Design**: Works on desktop and mobile devices

## 📋 API Endpoints

### Terminal Session Management
```
POST   /api/terminal/session          # Create new terminal session
GET    /api/terminal/sessions         # List user's active sessions
GET    /api/terminal/session/:id/status  # Get session status
DELETE /api/terminal/session/:id      # Terminate session
```

### Code Execution
```
POST   /api/terminal/execute          # Execute code in existing session
POST   /api/terminal/input           # Send input to terminal
POST   /api/terminal/quick-execute   # Quick code execution (no session)
POST   /api/execute                  # Enhanced execution with Docker support
```

### Health & Monitoring
```
GET    /api/terminal/health          # Service health check
```

## 🔌 WebSocket Events

### Client → Server
- `CREATE_TERMINAL_SESSION`: Request new session creation
- `EXECUTE_CODE`: Run code in session
- `TERMINAL_INPUT`: Send terminal input
- `TERMINAL_RESIZE`: Resize terminal dimensions

### Server → Client
- `TERMINAL_SESSION_CREATED`: Session creation confirmation
- `TERMINAL_OUTPUT`: Live terminal output
- `CODE_EXECUTION_RESULT`: Code execution results
- `TERMINAL_ERROR`: Error messages

## 🐳 Docker Configuration

### Production Dockerfile
The main Dockerfile uses Docker-in-Docker (DinD) to support code execution:
```dockerfile
FROM docker:24-dind
# Multi-stage build with supervisor for process management
# Runs both Docker daemon and Node.js application
```

### Sandbox Container
Lightweight Alpine-based container for code execution:
```dockerfile
FROM node:18-alpine
# Includes Python, Java, and other runtimes
# Non-root user for security
# Resource limitations
```

## 🔧 Render Deployment Configuration

### render.yaml
```yaml
services:
  - type: web
    name: educator-app-backend
    env: docker
    dockerfilePath: ./Dockerfile
```

### Required Environment Variables
Set these in your Render dashboard:
- `NODE_ENV=production`
- `JWT_SECRET=your_jwt_secret`
- `DATABASE_URL=your_database_url`
- Other existing environment variables

### Render Service Requirements
- **Plan**: Use "Standard" or higher for Docker support
- **Privileges**: Enable "Privileged" mode for Docker-in-Docker
- **Resources**: Recommend at least 1GB RAM for container operations

## 🔒 Security Considerations

### Container Security
- **Non-root execution**: Code runs as non-privileged user
- **No network access**: Containers have no external connectivity
- **Resource limits**: CPU and memory constraints prevent abuse
- **Temporary filesystem**: Changes don't persist between sessions
- **Automatic cleanup**: Containers are removed after timeout

### Authentication & Authorization
- **JWT-based authentication**: All endpoints require valid tokens
- **Session ownership**: Users can only access their own sessions
- **Rate limiting**: Prevent abuse through execution limits

### Code Execution Safety
- **Timeout protection**: 30-second maximum execution time
- **Sandboxed environment**: No access to host system
- **Input validation**: Sanitize all user inputs
- **Error handling**: Graceful error management and reporting

## 🎓 Usage Examples

### Quick Code Execution
```typescript
// Frontend usage
const { quickExecute } = useDockerTerminal();

const runPython = async () => {
  const result = await quickExecute(`
    print("Hello from Python!")
    import math
    print(f"π = {math.pi}")
  `, 'python');
  
  console.log(result.output);
};
```

### Terminal Session
```typescript
// Create persistent session
const { createSession, executeCode, sendInput } = useDockerTerminal({
  enableWebSocket: true
});

await createSession();
await executeCode('console.log("Hello World!");', 'javascript');
await sendInput('ls -la');
```

### REST API Usage
```bash
# Create session
curl -X POST https://your-app.onrender.com/api/terminal/session \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Execute code
curl -X POST https://your-app.onrender.com/api/execute \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"print(\"Hello World!\")", "language":"python"}'
```

## 🔍 Monitoring & Debugging

### Health Checks
The service provides comprehensive health monitoring:
```javascript
GET /api/terminal/health
// Returns Docker status, active sessions, system resources
```

### Logging
- **Container logs**: Docker execution logs
- **Application logs**: Service-level logging
- **WebSocket logs**: Real-time communication logs
- **Error tracking**: Comprehensive error reporting

### Performance Metrics
- Session creation/cleanup times
- Code execution durations
- Resource usage per container
- WebSocket connection counts

## 🚀 Deployment Steps

1. **Update Backend Dependencies**
   ```bash
   npm install dockerode uuid supervisor
   ```

2. **Deploy to Render**
   - Push code to your repository
   - Render will automatically build using the new Dockerfile
   - Enable "Privileged" mode in Render dashboard

3. **Configure Environment Variables**
   - Set all required environment variables in Render dashboard
   - Ensure JWT_SECRET and DATABASE_URL are configured

4. **Test the System**
   - Access the terminal tab in AscentIDE/AscentWebIDE
   - Try executing code in different languages
   - Verify WebSocket connections work

5. **Monitor Performance**
   - Check Docker container creation/cleanup
   - Monitor resource usage
   - Review logs for any issues

## 📚 Integration Guide

### Adding to New Components
```typescript
import DockerTerminal from '../components/DockerTerminal';

const MyComponent = () => {
  return (
    <DockerTerminal
      title="Code Runner"
      showCodeButtons={true}
      initialCode="print('Hello World!')"
      initialLanguage="python"
      onCodeExecution={(result) => console.log(result)}
    />
  );
};
```

### Using the Hook
```typescript
import { useDockerTerminal } from '../hooks/useDockerTerminal';

const MyTerminalComponent = () => {
  const {
    terminal,
    terminalRef,
    createSession,
    executeCode,
    isConnected
  } = useDockerTerminal({
    autoConnect: true,
    enableWebSocket: true
  });

  return (
    <div>
      <div ref={terminalRef} />
      <button onClick={() => executeCode('print("test")', 'python')}>
        Run Code
      </button>
    </div>
  );
};
```

## 🔧 Troubleshooting

### Common Issues

1. **Docker not available**: Ensure Render service has Docker support enabled
2. **WebSocket connection fails**: Check CORS configuration and authentication
3. **Code execution timeout**: Increase timeout limits if needed
4. **Resource limits exceeded**: Monitor container resource usage
5. **Session cleanup issues**: Check Docker daemon logs

### Debug Commands
```bash
# Check Docker status
docker info

# List active containers
docker ps

# View container logs
docker logs <container-id>

# Check WebSocket connections
# Use browser dev tools Network tab
```

This Docker sandbox system provides a robust, secure, and scalable solution for code execution in your educational platform, enabling students to run code safely while providing teachers with powerful demonstration tools.