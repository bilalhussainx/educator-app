const axios = require('axios');

async function testApi() {
  try {
    // First test without auth to see the error
    console.log('Testing API without auth...');
    const response = await axios.get('http://localhost:10000/api/enhanced-courses/9d51b0bf-e722-4b3c-9f6e-fd1a138972ea/lessons?moduleIndex=0&lessonIndex=0&language=python');
    console.log('✅ Success:', response.data);
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data);

    // The error might be auth-related, so let's check what the frontend would get
    if (error.response?.status === 401) {
      console.log('This is likely an authentication issue - the token may be missing or invalid');
    } else if (error.response?.status === 500) {
      console.log('This is the 500 error we need to debug');
    }
  }
}

testApi();