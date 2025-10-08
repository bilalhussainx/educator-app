const https = require('https');

const testStudentBooking = async () => {
    const mentorUrl = 'https://calendly.com/bilalhussain-v1/new-meeting';
    
    console.log('🧪 Testing Student Booking Scenario');
    console.log('=====================================');
    console.log(`Mentor URL: ${mentorUrl}`);
    console.log('');
    
    // Test 1: Check if the URL responds
    console.log('📡 Test 1: Checking URL accessibility...');
    try {
        const response = await new Promise((resolve, reject) => {
            const req = https.get(mentorUrl, (res) => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers
                });
            });
            
            req.on('error', reject);
            req.setTimeout(10000, () => reject(new Error('Timeout')));
        });
        
        console.log(`✅ URL accessible - Status: ${response.statusCode}`);
        
        if (response.statusCode === 200) {
            console.log('✅ Page loads successfully');
        } else if (response.statusCode === 404) {
            console.log('❌ Page not found - Event may not exist or be published');
        } else {
            console.log(`⚠️  Unexpected status code: ${response.statusCode}`);
        }
        
    } catch (error) {
        console.log(`❌ URL not accessible: ${error.message}`);
    }
    
    console.log('');
    console.log('🔍 Manual Verification Steps:');
    console.log('1. Open https://calendly.com/bilalhussain-v1/new-meeting in browser');
    console.log('2. Check if you see a booking page (not an error)');
    console.log('3. Verify available time slots are showing');
    console.log('4. Try booking a test appointment');
    console.log('');
    
    console.log('💡 Common Issues:');
    console.log('• Event "new-meeting" not published/live in Calendly');
    console.log('• Account bilalhussain-v1 doesn\'t exist');
    console.log('• Event has no availability set');
    console.log('• Account not properly connected to calendar');
    console.log('');
    
    console.log('🛠️  How to Fix:');
    console.log('1. Login to calendly.com with bilalhussain.v1@gmail.com');
    console.log('2. Go to Event Types → "new-meeting"');
    console.log('3. Make sure it\'s set to "Live" (not Draft)');
    console.log('4. Check availability hours are configured');
    console.log('5. Ensure calendar is connected (Google/Outlook)');
};

testStudentBooking();