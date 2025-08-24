const os = require('os');

function getNetworkInfo() {
    console.log('\n🌐 Network Configuration Helper');
    console.log('=====================================');
    
    const interfaces = os.networkInterfaces();
    let ipAddresses = [];
    
    for (const [name, addresses] of Object.entries(interfaces)) {
        if (addresses) {
            for (const addr of addresses) {
                // Skip loopback and non-IPv4 addresses
                if (!addr.internal && addr.family === 'IPv4') {
                    ipAddresses.push({
                        interface: name,
                        address: addr.address
                    });
                }
            }
        }
    }
    
    console.log('\n📱 To access from other devices:');
    console.log('1. Make sure all devices are on the same WiFi network');
    console.log('2. Update your frontend .env file with one of these IP addresses:');
    console.log('');
    
    if (ipAddresses.length > 0) {
        ipAddresses.forEach((ip, index) => {
            console.log(`   Option ${index + 1}: VITE_API_URL=http://${ip.address}:5000`);
            console.log(`   Interface: ${ip.interface}`);
            console.log('');
        });
        
        console.log('3. Restart your frontend dev server after updating .env');
        console.log('4. Other devices can then access the app at:');
        ipAddresses.forEach((ip, index) => {
            console.log(`   http://${ip.address}:5173`);
        });
    } else {
        console.log('❌ No network interfaces found. Make sure you\'re connected to WiFi.');
    }
    
    console.log('\n💡 Tips:');
    console.log('• Use your main WiFi adapter IP address (usually starts with 192.168 or 10.0)');
    console.log('• Make sure Windows Firewall allows connections on port 5000');
    console.log('• Both backend and frontend servers must be running');
    
    console.log('\n=====================================\n');
}

getNetworkInfo();