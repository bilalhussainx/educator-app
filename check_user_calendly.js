const db = require('./educators-edge-backend/db');

const checkUserCalendly = async () => {
    try {
        console.log('🔍 Checking Calendly URL for bilalhussain.v1@gmail.com...');
        
        // Find the user by email
        const userResult = await db.query(
            `SELECT u.id, u.username, u.email, up.calendly_url, up.display_name 
             FROM users u 
             LEFT JOIN user_profiles up ON u.id = up.user_id 
             WHERE u.email = $1`,
            ['bilalhussain.v1@gmail.com']
        );
        
        if (userResult.rows.length === 0) {
            console.log('❌ User bilalhussain.v1@gmail.com not found in database');
            return;
        }
        
        const user = userResult.rows[0];
        console.log('📊 User found:');
        console.log(`  - ID: ${user.id}`);
        console.log(`  - Username: ${user.username}`);
        console.log(`  - Email: ${user.email}`);
        console.log(`  - Display Name: ${user.display_name || 'None'}`);
        console.log(`  - Calendly URL: ${user.calendly_url || 'NOT SET'}`);
        
        if (!user.calendly_url) {
            console.log('⚠️  This user needs to set their Calendly URL!');
            console.log('💡 They should go to Sessions → Settings and add their Calendly URL');
        } else {
            console.log('✅ User has Calendly URL set');
            
            // Test if URL format looks correct
            try {
                const url = new URL(user.calendly_url);
                if (url.hostname === 'calendly.com') {
                    console.log('✅ URL format looks correct');
                } else {
                    console.log('❌ URL format looks incorrect - should be calendly.com domain');
                }
            } catch (e) {
                console.log('❌ Invalid URL format');
            }
        }
        
    } catch (error) {
        console.error('❌ Error checking user:', error.message);
    } finally {
        process.exit(0);
    }
};

checkUserCalendly();