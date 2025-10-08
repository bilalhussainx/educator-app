const axios = require('axios');

async function testLanguageSwitch() {
    const courseId = '4d5658ab-e214-42c9-8c2a-d3e116c55aeb';
    const moduleIndex = '0';
    const lessonIndex = '0';
    
    console.log('🧪 Testing language switching for enhanced course...');
    
    // Test JavaScript (should work)
    try {
        console.log('\n📝 Testing JavaScript...');
        const jsResponse = await axios.get(`http://localhost:5000/api/enhanced-courses/${courseId}/lessons?moduleIndex=${moduleIndex}&lessonIndex=${lessonIndex}&language=javascript`);
        console.log('✅ JavaScript Response Status:', jsResponse.status);
        console.log('📄 Files:', jsResponse.data.files?.map(f => f.filename));
        console.log('🔍 Lesson Language:', jsResponse.data.lesson?.language);
    } catch (error) {
        console.error('❌ JavaScript Error:', error.response?.status, error.response?.data);
    }
    
    // Test Java (problematic)
    try {
        console.log('\n☕ Testing Java...');
        const javaResponse = await axios.get(`http://localhost:5000/api/enhanced-courses/${courseId}/lessons?moduleIndex=${moduleIndex}&lessonIndex=${lessonIndex}&language=java`);
        console.log('✅ Java Response Status:', javaResponse.status);
        console.log('📄 Files:', javaResponse.data.files?.map(f => f.filename));
        console.log('🔍 Lesson Language:', javaResponse.data.lesson?.language);
    } catch (error) {
        console.error('❌ Java Error:', error.response?.status, error.response?.data);
    }
    
    // Test Python
    try {
        console.log('\n🐍 Testing Python...');
        const pythonResponse = await axios.get(`http://localhost:5000/api/enhanced-courses/${courseId}/lessons?moduleIndex=${moduleIndex}&lessonIndex=${lessonIndex}&language=python`);
        console.log('✅ Python Response Status:', pythonResponse.status);
        console.log('📄 Files:', pythonResponse.data.files?.map(f => f.filename));
        console.log('🔍 Lesson Language:', pythonResponse.data.lesson?.language);
    } catch (error) {
        console.error('❌ Python Error:', error.response?.status, error.response?.data);
    }
}

testLanguageSwitch().catch(console.error);