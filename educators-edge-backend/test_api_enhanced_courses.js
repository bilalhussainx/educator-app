// Test enhanced courses API endpoint
require('dotenv').config();
const axios = require('axios');

async function testEnhancedCoursesAPI() {
    console.log('🧪 Testing Enhanced Courses API Endpoint...\n');
    
    // You'll need to provide a valid auth token
    // For testing, we'll use a simple request to verify the endpoint exists
    
    try {
        // First, let's check if the server is running
        const baseURL = 'http://localhost:3000';
        
        console.log('📡 Testing endpoint: /api/enhanced-courses/discover');
        
        // Test without auth first to see if endpoint exists
        const response = await axios.get(`${baseURL}/api/enhanced-courses/discover`, {
            validateStatus: () => true // Accept any status code
        });
        
        console.log('📊 Response Status:', response.status);
        
        if (response.status === 401) {
            console.log('✅ Endpoint exists but requires authentication (as expected)');
        } else if (response.status === 200) {
            console.log('✅ Endpoint returned data successfully!');
            console.log('📚 Courses found:', response.data.length || 0);
            if (response.data && response.data.length > 0) {
                console.log('\n📋 Sample courses:');
                response.data.slice(0, 3).forEach((course, i) => {
                    console.log(`   ${i + 1}. ${course.title}`);
                });
            }
        } else {
            console.log('⚠️ Unexpected response:', response.status);
            console.log('Response data:', response.data);
        }
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Server is not running on localhost:3000');
            console.log('💡 Please start the backend server first: npm start');
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

// Also test database directly
const db = require('./db');

async function testDatabaseDirectly() {
    console.log('\n📋 Testing database directly...');
    
    try {
        const result = await db.query(`
            SELECT 
                ec.id, 
                ec.title, 
                ec.description, 
                ec.difficulty_level,
                ec.estimated_duration,
                ec.language,
                ec.course_type,
                ec.learning_outcomes,
                ec.target_audience,
                ec.created_at,
                u.name as teacher_name
            FROM enhanced_courses ec
            LEFT JOIN users u ON ec.teacher_id = u.id
            WHERE ec.is_published = true
            ORDER BY ec.created_at DESC;
        `);
        
        console.log(`✅ Found ${result.rows.length} published enhanced courses in database`);
        
        if (result.rows.length > 0) {
            console.log('\n📚 Sample enhanced courses:');
            result.rows.slice(0, 3).forEach((course, i) => {
                console.log(`   ${i + 1}. ${course.title}`);
                console.log(`      Teacher: ${course.teacher_name || 'Unknown'}`);
                console.log(`      Type: ${course.course_type}`);
                console.log(`      Difficulty: ${course.difficulty_level}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
    }
}

// Run tests
(async () => {
    await testEnhancedCoursesAPI();
    await testDatabaseDirectly();
    process.exit(0);
})();