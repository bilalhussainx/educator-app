const NewEnhancedCourseController = require('./educators-edge-backend/controllers/newEnhancedCourseController');

// Simulate the request and response objects
const mockReq = {
  params: {
    courseId: '9d51b0bf-e722-4b3c-9f6e-fd1a138972ea'
  },
  query: {
    moduleIndex: '0',
    lessonIndex: '0',
    language: 'python'
  }
};

const mockRes = {
  json: (data) => {
    console.log('✅ Success response:', JSON.stringify(data, null, 2));
  },
  status: (code) => {
    console.log(`❌ Error status: ${code}`);
    return {
      json: (data) => {
        console.log('❌ Error response:', JSON.stringify(data, null, 2));
      }
    };
  }
};

console.log('Testing enhanced course lessons endpoint...');
console.log('Request params:', mockReq.params);
console.log('Request query:', mockReq.query);

NewEnhancedCourseController.getEnhancedCourseLessons(mockReq, mockRes);