// Debug routes registration
const http = require('http');

async function testRoutes() {
    console.log('🧪 Testing API routes...\n');
    
    const routes = [
        '/api/courses/discover',
        '/api/enhanced-courses/discover',
        '/api/enhanced-courses',
        '/api/users/profile'
    ];
    
    for (const route of routes) {
        try {
            await new Promise((resolve) => {
                const req = http.get(`http://localhost:10000${route}`, (res) => {
                    console.log(`${route}: ${res.statusCode} ${res.statusMessage}`);
                    resolve();
                }).on('error', (err) => {
                    console.log(`${route}: ERROR - ${err.message}`);
                    resolve();
                });
                
                // Timeout after 2 seconds
                setTimeout(() => {
                    req.destroy();
                    console.log(`${route}: TIMEOUT`);
                    resolve();
                }, 2000);
            });
        } catch (error) {
            console.log(`${route}: CATCH ERROR - ${error.message}`);
        }
    }
    
    console.log('\nRoute Status Guide:');
    console.log('  200 = Working');
    console.log('  401 = Working but needs auth (expected)');
    console.log('  404 = Route not found (problem!)');
    console.log('  500 = Server error');
}

testRoutes();