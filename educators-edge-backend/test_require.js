// Test if enhanced course routes can be required
try {
    console.log('Testing enhanced course routes require...');
    const enhancedCourseRoutes = require('./routes/enhancedCourseRoutes');
    console.log('✅ Enhanced course routes loaded successfully');
    console.log('Type:', typeof enhancedCourseRoutes);
    
    // Test controller
    const enhancedCourseController = require('./controllers/enhancedCourseController');
    console.log('✅ Enhanced course controller loaded successfully');
    console.log('Controller functions:', Object.keys(enhancedCourseController));
    
} catch (error) {
    console.error('❌ Error loading enhanced course modules:');
    console.error(error.message);
    console.error(error.stack);
}