# Educators Edge - Full-Stack Learning Management System

A comprehensive educational platform that enables teachers to create and manage courses, conduct live classes, and engage with students through interactive coding environments, live video sessions, and real-time collaboration tools.

## 🌐 Live Demo

**Access the live application:** [https://educator-app.vercel.app/login](https://educator-app.vercel.app/login)

> ⚠️ **Note:** The system may experience occasional outages due to continuous development and updates.

## 🔑 Demo Login Credentials

### Teacher Account
- **Email:** `bilalhussain.v1@gmail.com`
- **Password:** Contact administrator for access

### Student Account (Create Your Own)
You can register as a student with any email address through the registration page. Student accounts have access to:
- Browse and enroll in courses
- Participate in live classes
- Access coding environments
- Track learning progress

## 🚀 Features

### 👨‍🏫 For Teachers
- **Course Management:** Create, edit, and organize courses with chapters and lessons
- **Live Teaching:** Conduct real-time classes with video streaming via Agora SDK
- **Code Environment:** Provide interactive coding environments for students
- **Student Progress:** Track student engagement and performance
- **Content Creation:** Build rich lesson content with markdown support
- **Assessment Tools:** Create and manage assignments and quizzes

### 👨‍🎓 For Students
- **Course Discovery:** Browse and enroll in available courses
- **Live Classes:** Join real-time video sessions with teachers
- **Interactive IDE:** Practice coding in browser-based development environments
- **Progress Tracking:** Monitor learning progress and achievements
- **Collaboration:** Participate in class discussions and group activities

## 🛠 Tech Stack

### Backend
- **Runtime:** Node.js with Express.js
- **Database:** PostgreSQL
- **Real-time:** WebSocket connections
- **Video Streaming:** Agora RTC SDK
- **Authentication:** JWT with bcrypt
- **Cloud Storage:** Azure Blob Storage
- **Task Queues:** BullMQ with Redis
- **Container Support:** Docker integration

### Frontend
- **Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS with Radix UI components
- **State Management:** Zustand
- **Build Tool:** Vite
- **Code Editor:** Monaco Editor
- **Video:** Agora RTC React SDK
- **Terminal:** XTerm.js for browser-based terminals

## 📋 Prerequisites

Before setting up the project, ensure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **PostgreSQL** database
- **Redis** server (for background jobs)
- **Azure Blob Storage** account (for file storage)
- **Agora.io** account (for video streaming)

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd educator-app
```

### 2. Backend Setup

Navigate to the backend directory:
```bash
cd educators-edge-backend
```

Install dependencies:
```bash
npm install
```

Create environment configuration:
```bash
cp .env.example .env
```

Configure your `.env` file with the following variables:
```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/educators_edge
DB_HOST=localhost
DB_PORT=5432
DB_NAME=educators_edge
DB_USER=your_username
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Redis Configuration (for background jobs)
REDIS_URL=redis://localhost:6379

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=your_azure_connection_string
AZURE_CONTAINER_NAME=your_container_name

# Agora Configuration (for video streaming)
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# Google AI (for course generation)
GOOGLE_API_KEY=your_google_gemini_api_key

# Server Configuration
PORT=5000
NODE_ENV=development
```

Set up the database:
```bash
# Create database tables
npm run migrate

# Seed initial data (optional)
npm run seed
```

Start the backend server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### 3. Frontend Setup

In a new terminal, navigate to the frontend directory:
```bash
cd educators-edge-frontend
```

Install dependencies:
```bash
npm install
```

Create environment configuration:
```bash
cp .env.example .env.local
```

Configure your frontend environment variables:
```env
VITE_API_URL=http://localhost:5000
VITE_AGORA_APP_ID=your_agora_app_id
VITE_WS_URL=ws://localhost:5000
```

Start the frontend development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🐳 Docker Setup (Alternative)

For containerized development:

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d

# Stop services
docker-compose down
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify JWT token

### Courses
- `GET /api/courses` - List all courses
- `POST /api/courses` - Create new course (teachers only)
- `GET /api/courses/:id` - Get course details
- `PUT /api/courses/:id` - Update course (teachers only)
- `DELETE /api/courses/:id` - Delete course (teachers only)

### Lessons
- `GET /api/lessons/:courseId` - Get course lessons
- `POST /api/lessons` - Create new lesson
- `PUT /api/lessons/:id` - Update lesson
- `DELETE /api/lessons/:id` - Delete lesson

### Live Sessions
- `POST /api/sessions/start` - Start live session
- `POST /api/sessions/join` - Join live session
- `POST /api/sessions/end` - End live session

## 🔒 User Roles & Permissions

### Teacher Role
- Full course management capabilities
- Can create and modify lessons
- Access to student analytics
- Live session hosting
- Content creation tools

### Student Role
- Course enrollment and access
- Participate in live sessions
- Access to coding environments
- Progress tracking
- Assignment submissions

## 🧪 Testing

Run backend tests:
```bash
cd educators-edge-backend
npm test
```

Run frontend tests:
```bash
cd educators-edge-frontend
npm test
```

## 🚀 Deployment

### Production Environment Variables

Ensure all production environment variables are configured:

**Backend (.env.production):**
```env
NODE_ENV=production
DATABASE_URL=your_production_db_url
JWT_SECRET=your_production_jwt_secret
REDIS_URL=your_production_redis_url
# ... other production variables
```

**Frontend (.env.production):**
```env
VITE_API_URL=https://your-api-domain.com
VITE_AGORA_APP_ID=your_production_agora_app_id
```

### Build Commands

Backend:
```bash
cd educators-edge-backend
npm install --production
npm start
```

Frontend:
```bash
cd educators-edge-frontend
npm run build
npm run preview
```

## 🤝 Getting Started as a User

### For Teachers
1. Visit [https://educator-app.vercel.app/login](https://educator-app.vercel.app/login)
2. Use the provided teacher credentials or contact admin for access
3. Create your first course from the dashboard
4. Add lessons and chapters to your course
5. Start a live session to begin teaching

### For Students
1. Visit [https://educator-app.vercel.app/login](https://educator-app.vercel.app/login)
2. Click "Sign Up" to create a new student account
3. Browse available courses in the discovery section
4. Enroll in courses that interest you
5. Join live sessions when teachers start them

## 🛠 Development Guidelines

### Code Structure
```
educators-edge-backend/
├── controllers/     # Route handlers
├── models/         # Database models
├── routes/         # API routes
├── services/       # Business logic
├── middleware/     # Custom middleware
└── workers/        # Background job processors

educators-edge-frontend/
├── src/
│   ├── components/  # Reusable UI components
│   ├── pages/      # Page components
│   ├── services/   # API services
│   ├── stores/     # State management
│   └── types/      # TypeScript definitions
```

### Best Practices
- Follow TypeScript strict mode in frontend
- Use proper error handling in all API routes
- Implement proper authentication checks
- Follow responsive design principles
- Write tests for critical functionality

## 📞 Support & Contributing

- **Issues:** Report bugs or request features through the issue tracker
- **Documentation:** Refer to inline code documentation
- **Development:** Follow the established coding standards and patterns

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Happy Learning! 🎓**
