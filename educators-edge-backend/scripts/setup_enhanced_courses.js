#!/usr/bin/env node
// Setup Enhanced Courses Database Schema
// Run this to migrate existing courses and create the enhanced_courses infrastructure

require('dotenv').config();
const db = require('./db');

async function setupEnhancedCourses() {
    console.log('🚀 Setting up Enhanced Courses Database Schema...\n');
    
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log('📋 Creating enhanced_courses table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS enhanced_courses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
                difficulty_level VARCHAR(20) DEFAULT 'intermediate',
                estimated_duration VARCHAR(50),
                target_audience TEXT,
                learning_outcomes JSONB DEFAULT '[]',
                prerequisites JSONB DEFAULT '[]',
                metadata JSONB DEFAULT '{}',
                language VARCHAR(50) DEFAULT 'javascript',
                course_type VARCHAR(50) DEFAULT 'premium',
                is_published BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        
        console.log('📋 Creating enhanced_course_enrollments table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS enhanced_course_enrollments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                course_id UUID REFERENCES enhanced_courses(id) ON DELETE CASCADE,
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                enrolled_at TIMESTAMP DEFAULT NOW(),
                progress JSONB DEFAULT '{}',
                completion_status VARCHAR(20) DEFAULT 'in_progress',
                UNIQUE(course_id, student_id)
            );
        `);
        
        console.log('📋 Creating ai_tutors table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS ai_tutors (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                course_id UUID REFERENCES enhanced_courses(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                personality TEXT,
                specialization JSONB DEFAULT '[]',
                teaching_style TEXT,
                response_patterns JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        
        console.log('📋 Creating course_generation_logs table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS course_generation_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                generation_type VARCHAR(50) NOT NULL,
                input_parameters JSONB,
                generated_course_id UUID REFERENCES enhanced_courses(id),
                success BOOLEAN NOT NULL,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        
        console.log('📊 Creating performance indexes...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_enhanced_courses_published ON enhanced_courses(is_published, created_at);
            CREATE INDEX IF NOT EXISTS idx_enhanced_courses_teacher ON enhanced_courses(teacher_id);
            CREATE INDEX IF NOT EXISTS idx_enhanced_enrollments_student ON enhanced_course_enrollments(student_id);
            CREATE INDEX IF NOT EXISTS idx_enhanced_enrollments_course ON enhanced_course_enrollments(course_id);
        `);
        
        console.log('🔄 Migrating existing courses to enhanced_courses...');
        const migrationResult = await client.query(`
            INSERT INTO enhanced_courses (
                title, 
                description, 
                teacher_id, 
                difficulty_level,
                language,
                course_type,
                is_published,
                created_at,
                metadata
            )
            SELECT 
                title,
                description,
                teacher_id,
                'intermediate' as difficulty_level,
                'javascript' as language,
                'premium' as course_type,
                true as is_published,
                created_at,
                '{"migrated_from": "courses_table", "generated_with_claude": true}'::jsonb as metadata
            FROM courses 
            WHERE title LIKE '%Mastering Coding Interviews%'
               OR title LIKE '%Pattern-Based Problem Solving%'
               OR title LIKE '%System Design%'
               OR title LIKE '%Dynamic Programming%'
               OR title LIKE '%Data Structures%'
               OR description LIKE '%comprehensive course%'
               OR description LIKE '%premium%'
            ON CONFLICT DO NOTHING
            RETURNING id, title;
        `);
        
        console.log(`✅ Migrated ${migrationResult.rows.length} courses to enhanced_courses table`);
        
        if (migrationResult.rows.length > 0) {
            console.log('📚 Migrated courses:');
            migrationResult.rows.forEach((course, index) => {
                console.log(`   ${index + 1}. ${course.title} (ID: ${course.id})`);
            });
        }
        
        console.log('📊 Checking final results...');
        const finalResult = await client.query(`
            SELECT 
                id,
                title,
                course_type,
                is_published,
                created_at
            FROM enhanced_courses
            ORDER BY created_at DESC;
        `);
        
        await client.query('COMMIT');
        
        console.log(`\n✅ SUCCESS! Enhanced Courses setup completed!`);
        console.log(`📈 Total enhanced courses in database: ${finalResult.rows.length}`);
        
        if (finalResult.rows.length > 0) {
            console.log('\n📚 All Enhanced Courses:');
            finalResult.rows.forEach((course, index) => {
                const status = course.is_published ? '🟢 Published' : '🔴 Draft';
                console.log(`   ${index + 1}. ${course.title}`);
                console.log(`      ${status} | Type: ${course.course_type} | ID: ${course.id}`);
            });
            
            console.log('\n🎯 Your enhanced courses should now appear in the discover tab!');
            console.log('👉 Check: /courses/discover/enhanced');
        } else {
            console.log('\n⚠️  No enhanced courses found. Try generating a new course first.');
        }
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error setting up enhanced courses:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        client.release();
    }
}

// Run the setup
setupEnhancedCourses().then(() => {
    console.log('\n🎉 Done! You can now run the enhanced course generator.');
    process.exit(0);
}).catch(console.error);