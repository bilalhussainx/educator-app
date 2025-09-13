// =================================================================
// FILE: controllers/enhancedCourseController.js
// =================================================================
// Enhanced course controller for AI-powered courses
const db = require('../db');
const { SmartCourseGenerator } = require('../smartCourseGenerator');
const { UltimateCourseGenerator } = require('../ultimateCourseGenerator');

// Get all enhanced courses for discovery (public courses)
exports.getDiscoverableEnhancedCourses = async (req, res) => {
    try {
        const query = `
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
                u.username as teacher_name
            FROM enhanced_courses ec
            LEFT JOIN users u ON ec.teacher_id = u.id
            WHERE ec.is_published = true
            ORDER BY ec.created_at DESC;
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching discoverable enhanced courses:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Get enhanced course by ID (for students)
exports.getEnhancedCourseById = async (req, res) => {
    try {
        const { courseId } = req.params;
        
        // Get course details
        const courseQuery = `
            SELECT 
                ec.*,
                u.username as teacher_name,
                COUNT(DISTINCT ecs.student_id) as enrolled_count
            FROM enhanced_courses ec
            LEFT JOIN users u ON ec.teacher_id = u.id
            LEFT JOIN enhanced_course_enrollments ecs ON ec.id = ecs.course_id
            WHERE ec.id = $1 AND ec.is_published = true
            GROUP BY ec.id, u.username;
        `;
        const courseResult = await db.query(courseQuery, [courseId]);
        
        if (courseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Enhanced course not found' });
        }

        // Get AI tutor info for this course
        const tutorQuery = `
            SELECT name, personality, specialization, teaching_style 
            FROM ai_tutors 
            WHERE course_id = $1 
            LIMIT 1;
        `;
        const tutorResult = await db.query(tutorQuery, [courseId]);
        
        const course = {
            ...courseResult.rows[0],
            ai_tutor: tutorResult.rows[0] || null,
            enrolled_count: parseInt(courseResult.rows[0].enrolled_count) || 0
        };

        res.json(course);
    } catch (err) {
        console.error('Error fetching enhanced course:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Get enhanced courses for teacher management
exports.getTeacherEnhancedCourses = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const query = `
            SELECT 
                ec.id, 
                ec.title, 
                ec.description, 
                ec.difficulty_level,
                ec.estimated_duration,
                ec.language,
                ec.course_type,
                ec.is_published,
                ec.created_at,
                COUNT(DISTINCT ecs.student_id) as enrolled_count
            FROM enhanced_courses ec
            LEFT JOIN enhanced_course_enrollments ecs ON ec.id = ecs.course_id
            WHERE ec.teacher_id = $1
            GROUP BY ec.id
            ORDER BY ec.created_at DESC;
        `;
        const result = await db.query(query, [teacherId]);
        
        const courses = result.rows.map(course => ({
            ...course,
            enrolled_count: parseInt(course.enrolled_count) || 0
        }));
        
        res.json(courses);
    } catch (err) {
        console.error('Error fetching teacher enhanced courses:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Create enhanced course via AI generation
exports.createEnhancedCourse = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { 
            generationType, // 'smart' or 'premium'
            targetLanguage,
            maxCourses,
            difficulty,
            focusAreas,
            courseType,
            options
        } = req.body;

        let generatedCourse;
        
        if (generationType === 'smart') {
            const generator = new SmartCourseGenerator();
            const courses = await generator.generateCoursesFromFreeCodeCamp({
                targetLanguage,
                maxCourses: 1, // Generate single course
                difficulty,
                focusAreas: focusAreas ? focusAreas.split(',') : []
            });
            generatedCourse = courses[0];
        } else if (generationType === 'premium') {
            const generator = new UltimateCourseGenerator();
            generatedCourse = await generator.createPremiumCourse(courseType, options);
        } else {
            return res.status(400).json({ error: 'Invalid generation type' });
        }

        // Insert into enhanced_courses table
        const insertQuery = `
            INSERT INTO enhanced_courses (
                title, description, teacher_id, difficulty_level, 
                estimated_duration, target_audience, learning_outcomes, 
                prerequisites, metadata, language, course_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
            RETURNING *;
        `;
        
        const values = [
            generatedCourse.title,
            generatedCourse.description,
            teacherId,
            difficulty || 'intermediate',
            generatedCourse.estimated_duration || '4-6 weeks',
            generatedCourse.target_audience || 'Developers',
            JSON.stringify(generatedCourse.learning_outcomes || []),
            JSON.stringify(generatedCourse.prerequisites || []),
            JSON.stringify({
                generationType,
                originalData: generatedCourse
            }),
            targetLanguage || 'javascript',
            generationType
        ];

        const result = await db.query(insertQuery, values);
        const newCourse = result.rows[0];

        // Create AI tutor for this course
        if (generatedCourse.ai_tutor) {
            await db.query(`
                INSERT INTO ai_tutors (course_id, name, personality, specialization, teaching_style)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                newCourse.id,
                generatedCourse.ai_tutor.name || 'AI Assistant',
                generatedCourse.ai_tutor.personality || 'encouraging',
                JSON.stringify(generatedCourse.ai_tutor.specialization || []),
                generatedCourse.ai_tutor.teaching_style || 'Interactive and supportive'
            ]);
        }

        // Log the generation
        await db.query(`
            INSERT INTO course_generation_logs 
            (generation_type, input_parameters, generated_course_id, success)
            VALUES ($1, $2, $3, true)
        `, [
            generationType,
            JSON.stringify(req.body),
            newCourse.id
        ]);

        res.status(201).json({
            success: true,
            course: newCourse,
            message: 'Enhanced course created successfully'
        });
    } catch (err) {
        console.error('Error creating enhanced course:', err.message);
        
        // Log the failed generation
        await db.query(`
            INSERT INTO course_generation_logs 
            (generation_type, input_parameters, success, error_message)
            VALUES ($1, $2, false, $3)
        `, [
            req.body.generationType,
            JSON.stringify(req.body),
            err.message
        ]).catch(console.error);
        
        res.status(500).json({ error: 'Failed to create enhanced course' });
    }
};

// Enroll student in enhanced course
exports.enrollInEnhancedCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;

        // Check if course exists and is published
        const courseCheck = await db.query(
            'SELECT id FROM enhanced_courses WHERE id = $1 AND is_published = true',
            [courseId]
        );
        
        if (courseCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found or not published' });
        }

        // Check if already enrolled
        const enrollmentCheck = await db.query(
            'SELECT id FROM enhanced_course_enrollments WHERE course_id = $1 AND student_id = $2',
            [courseId, studentId]
        );

        if (enrollmentCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Already enrolled in this course' });
        }

        // Create enrollment table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS enhanced_course_enrollments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                course_id UUID REFERENCES enhanced_courses(id) ON DELETE CASCADE,
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                enrolled_at TIMESTAMP DEFAULT NOW(),
                progress JSONB DEFAULT '{}',
                UNIQUE(course_id, student_id)
            );
        `);

        // Enroll student
        await db.query(
            'INSERT INTO enhanced_course_enrollments (course_id, student_id) VALUES ($1, $2)',
            [courseId, studentId]
        );

        res.json({ success: true, message: 'Successfully enrolled in course' });
    } catch (err) {
        console.error('Error enrolling in enhanced course:', err.message);
        res.status(500).json({ error: 'Failed to enroll in course' });
    }
};

// Update enhanced course publication status
exports.updateEnhancedCoursePublicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_published } = req.body;
        const teacherId = req.user.id;

        const result = await db.query(
            'UPDATE enhanced_courses SET is_published = $1, updated_at = NOW() WHERE id = $2 AND teacher_id = $3 RETURNING *',
            [is_published, id, teacherId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found or access denied' });
        }

        res.json({
            success: true,
            course: result.rows[0],
            message: `Course ${is_published ? 'published' : 'unpublished'} successfully`
        });
    } catch (err) {
        console.error('Error updating course publication status:', err.message);
        res.status(500).json({ error: 'Failed to update course status' });
    }
};

// Get enhanced course lessons for AscentIDE integration
exports.getEnhancedCourseLessons = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { moduleIndex = 0, lessonIndex = 0, language = 'javascript' } = req.query;
        
        console.log('Enhanced course lessons request:', { courseId, moduleIndex, lessonIndex, language });
        
        const courseQuery = `
            SELECT title, description, metadata, language 
            FROM enhanced_courses 
            WHERE id = $1 AND is_published = true;
        `;
        const courseResult = await db.query(courseQuery, [courseId]);
        
        if (courseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Enhanced course not found' });
        }

        const course = courseResult.rows[0];
        const modules = course.metadata?.modules || [];
        
        if (moduleIndex >= modules.length) {
            return res.status(404).json({ error: 'Module not found' });
        }

        const currentModule = modules[parseInt(moduleIndex)];
        const lessons = currentModule.lessons?.lessons || [];
        
        if (lessonIndex >= lessons.length) {
            return res.status(404).json({ error: 'Lesson not found' });
        }

        const currentLesson = lessons[parseInt(lessonIndex)];

        // Create AscentIDE-compatible lesson data
        const selectedLanguage = language || course.language || 'javascript';
        console.log('Generating content for language:', selectedLanguage);
        
        const problemContent = generateProblemContent(currentModule, currentLesson);
        console.log('Problem content generated');
        
        // Check if lesson has language implementations (new format)
        console.log('🔍 Checking for languageImplementations in lesson:', currentLesson.title);
        console.log('🔍 Lesson has languageImplementations:', !!currentLesson.languageImplementations);
        if (currentLesson.languageImplementations) {
            console.log('🔍 Available languages:', Object.keys(currentLesson.languageImplementations));
        }
        
        const languageImpl = currentLesson.languageImplementations?.[selectedLanguage];
        console.log('🔍 Found implementation for', selectedLanguage, ':', !!languageImpl);
        
        let starterCode, testCases, solutionCode;
        
        if (languageImpl) {
            // Use new multilanguage system
            console.log('✅ Using new multilanguage implementation for', selectedLanguage);
            console.log('✅ Starter code length:', languageImpl.starterCode?.length || 0);
            starterCode = languageImpl.starterCode;
            testCases = languageImpl.testCases;
            solutionCode = languageImpl.solutionCode;
        } else {
            // Fallback to old generation system
            console.log('⚠️ Fallback to old generation system for', selectedLanguage);
            starterCode = generateStarterCode(currentModule, currentLesson, selectedLanguage);
            testCases = generateTestCases(currentModule, currentLesson, selectedLanguage);
            solutionCode = generateSolutionCode(currentModule, currentLesson, selectedLanguage);
        }

        const lessonId = `${courseId}-${moduleIndex}-${lessonIndex}`;
        
        const ascentIdeData = {
            // AscentIDE expects nested lesson structure
            lesson: {
                id: lessonId,
                title: currentLesson.title,
                description: problemContent.description,
                instructions: problemContent.instructions,
                difficulty: course.difficulty_level || 'intermediate',
                language: selectedLanguage,
                metadata: {
                    courseId,
                    moduleIndex: parseInt(moduleIndex),
                    lessonIndex: parseInt(lessonIndex),
                    moduleName: currentModule.title,
                    patterns: currentModule.core_patterns || [],
                    isEnhanced: true
                }
            },
            // Files structure expected by AscentIDE
            files: [
                {
                    id: '1',
                    filename: getMainFileName(selectedLanguage),
                    content: starterCode,
                    type: 'main'
                },
                {
                    id: '2', 
                    filename: getTestFileName(selectedLanguage),
                    content: generateTests(currentModule, currentLesson, selectedLanguage),
                    type: 'test'
                }
            ],
            // Test and solution data
            testCases: testCases,
            starterCode: starterCode,
            tests: generateTests(currentModule, currentLesson, selectedLanguage),
            solution: solutionCode,
            hints: generateHints(currentModule, currentLesson),
            // AscentIDE required arrays
            submissionHistory: [], // Empty array for new enhanced courses
            gradedSubmission: null, // No previous submissions
            submissions: [], // Alternative submissions array
            // Additional AscentIDE properties
            isCompleted: false,
            timeLimit: null,
            maxAttempts: null
        };

        res.json(ascentIdeData);
    } catch (err) {
        console.error('Error fetching enhanced course lessons:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Check if student is enrolled in enhanced course
exports.checkEnhancedCourseEnrollment = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;

        const enrollmentCheck = await db.query(
            'SELECT id, enrolled_at FROM enhanced_course_enrollments WHERE course_id = $1 AND student_id = $2',
            [courseId, studentId]
        );

        res.json({
            isEnrolled: enrollmentCheck.rows.length > 0,
            enrollment: enrollmentCheck.rows[0] || null
        });
    } catch (err) {
        console.error('Error checking enhanced course enrollment:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Get solution for enhanced course lesson
exports.getEnhancedCourseLessonSolution = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { moduleIndex = 0, lessonIndex = 0, language = 'javascript' } = req.query;
        
        console.log('Solution request:', { courseId, moduleIndex, lessonIndex, language });
        
        const courseQuery = `
            SELECT title, description, metadata, language 
            FROM enhanced_courses 
            WHERE id = $1 AND is_published = true;
        `;
        const courseResult = await db.query(courseQuery, [courseId]);
        
        if (courseResult.rows.length === 0) {
            console.log('Course not found:', courseId);
            return res.status(404).json({ error: 'Enhanced course not found' });
        }

        const course = courseResult.rows[0];
        const modules = course.metadata?.modules || [];
        
        console.log('Course modules count:', modules.length);
        console.log('Requested moduleIndex:', moduleIndex);
        
        if (parseInt(moduleIndex) >= modules.length) {
            console.log('Module index out of range:', moduleIndex, 'available modules:', modules.length);
            return res.status(404).json({ error: `Module ${moduleIndex} not found. Available modules: 0-${modules.length - 1}` });
        }

        const currentModule = modules[parseInt(moduleIndex)];
        const lessons = currentModule.lessons?.lessons || [];
        
        console.log('Module lessons count:', lessons.length);
        console.log('Requested lessonIndex:', lessonIndex);
        
        if (parseInt(lessonIndex) >= lessons.length) {
            console.log('Lesson index out of range:', lessonIndex, 'available lessons:', lessons.length);
            return res.status(404).json({ error: `Lesson ${lessonIndex} not found. Available lessons: 0-${lessons.length - 1}` });
        }

        const currentLesson = lessons[parseInt(lessonIndex)];
        const selectedLanguage = language || course.language || 'javascript';
        
        // Check if lesson has language implementations (new format)
        const languageImpl = currentLesson.languageImplementations?.[selectedLanguage];
        
        let solutionCode, explanation;
        
        if (languageImpl) {
            // Use new multilanguage system
            console.log('✅ Using new multilanguage solution for', selectedLanguage);
            solutionCode = languageImpl.solutionCode;
            explanation = `## Official Solution - ${currentLesson.title}

**Pattern:** ${currentLesson.pattern || 'Problem Solving'}
**Difficulty:** ${currentLesson.difficulty || 'intermediate'}  
**Time Complexity:** ${currentLesson.time_complexity || 'O(n)'}
**Space Complexity:** ${currentLesson.space_complexity || 'O(1)'}

### Approach
${languageImpl.explanation}

### Key Points
- Optimized for performance and readability
- Handles all edge cases
- Follows ${selectedLanguage} best practices
- Includes comprehensive test coverage`;
        } else {
            // Fallback to old generation system
            console.log('⚠️ Fallback to old solution system for', selectedLanguage);
            solutionCode = generateSolutionCode(currentModule, currentLesson, selectedLanguage);
            const problemContent = generateProblemContent(currentModule, currentLesson);
            explanation = `## Official Solution\n\nThis solution demonstrates the optimal approach using the **${currentModule.core_patterns?.[0] || 'Problem Solving'}** pattern.\n\n### Key Points:\n- **Time Complexity**: Optimized for performance\n- **Space Complexity**: Efficient memory usage\n- **Pattern Application**: Shows proper use of coding patterns\n\n### How It Works:\n${problemContent.description}\n\n### Implementation Details:\nThe solution follows best practices and includes comprehensive test cases to verify correctness.`;
        }

        // Return solution files in format expected by AscentIDE
        const solutionFiles = [
            {
                id: '1',
                filename: getMainFileName(selectedLanguage),
                content: solutionCode,
                type: 'solution',
                explanation: explanation
            }
        ];

        res.json({
            files: solutionFiles,
            explanation: explanation
        });
    } catch (err) {
        console.error('Error fetching enhanced course solution:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Helper functions for generating lesson content
function generateStarterCode(module, lesson, language = 'javascript') {
    console.log('🔄 generateStarterCode called with:', { 
        language, 
        lessonTitle: lesson.title, 
        patterns: module.core_patterns 
    });
    
    const patterns = module.core_patterns || [];
    const mainPattern = patterns[0] || 'Problem Solving';
    
    console.log('📝 Using pattern:', mainPattern, 'for language:', language);
    
    // Pattern-specific starter code with proper function signatures
    const starterTemplates = {
        'Sliding Window': {
            javascript: `/**
 * Find the maximum sum of any contiguous subarray of size k
 * @param {number[]} arr - Array of positive numbers
 * @param {number} k - Size of the subarray
 * @return {number} Maximum sum of subarray of size k
 */
function findMaxSumSubArray(arr, k) {
    // TODO: Implement sliding window approach
    // 1. Calculate sum of first window
    // 2. Slide the window and update sum
    // 3. Keep track of maximum sum
    
    return 0;  // Replace with your solution
}

// Test cases
console.log(findMaxSumSubArray([2, 1, 5, 1, 3, 2], 3)); // Expected: 9
console.log(findMaxSumSubArray([2, 3, 4, 1, 5], 2));     // Expected: 7`,
            
            python: `def find_max_sum_sub_array(arr, k):
    """
    Find the maximum sum of any contiguous subarray of size k
    
    Args:
        arr: List of positive numbers
        k: Size of the subarray
    
    Returns:
        Maximum sum of subarray of size k
    """
    # TODO: Implement sliding window approach
    # 1. Calculate sum of first window
    # 2. Slide the window and update sum  
    # 3. Keep track of maximum sum
    
    return 0  # Replace with your solution

# Test cases
print(find_max_sum_sub_array([2, 1, 5, 1, 3, 2], 3))  # Expected: 9
print(find_max_sum_sub_array([2, 3, 4, 1, 5], 2))     # Expected: 7`,

            java: `public class Solution {
    /**
     * Find the maximum sum of any contiguous subarray of size k
     * 
     * @param arr Array of positive numbers
     * @param k Size of the subarray
     * @return Maximum sum of subarray of size k
     */
    public static int findMaxSumSubArray(int[] arr, int k) {
        // TODO: Implement sliding window approach
        // 1. Calculate sum of first window
        // 2. Slide the window and update sum
        // 3. Keep track of maximum sum
        
        return 0; // Replace with your solution
    }
    
    public static void main(String[] args) {
        // Test cases
        System.out.println(findMaxSumSubArray(new int[]{2, 1, 5, 1, 3, 2}, 3)); // Expected: 9
        System.out.println(findMaxSumSubArray(new int[]{2, 3, 4, 1, 5}, 2));      // Expected: 7
    }
}`
        },
        
        'Two Pointers': {
            javascript: `/**
 * Find a pair of numbers that add up to the target sum
 * @param {number[]} arr - Sorted array of numbers
 * @param {number} targetSum - Target sum to find
 * @return {number[]} Indices of the two numbers that add up to target
 */
function pairWithTargetSum(arr, targetSum) {
    // TODO: Implement two pointers approach
    // 1. Initialize left and right pointers
    // 2. Check if current sum equals target
    // 3. Move pointers based on comparison
    
    return [-1, -1];  // Replace with your solution
}

// Test cases
console.log(pairWithTargetSum([1, 2, 3, 4, 6], 6));   // Expected: [1, 3]
console.log(pairWithTargetSum([2, 5, 9, 11], 11));    // Expected: [0, 2]`,
            
            python: `def pair_with_target_sum(arr, target_sum):
    """
    Find a pair of numbers that add up to the target sum
    
    Args:
        arr: Sorted array of numbers
        target_sum: Target sum to find
    
    Returns:
        Indices of the two numbers that add up to target
    """
    # TODO: Implement two pointers approach
    # 1. Initialize left and right pointers
    # 2. Check if current sum equals target
    # 3. Move pointers based on comparison
    
    return [-1, -1]  # Replace with your solution

# Test cases  
print(pair_with_target_sum([1, 2, 3, 4, 6], 6))   # Expected: [1, 3]
print(pair_with_target_sum([2, 5, 9, 11], 11))    # Expected: [0, 2]`,

            java: `public class Solution {
    /**
     * Find a pair of numbers that add up to the target sum
     * 
     * @param arr Sorted array of numbers
     * @param targetSum Target sum to find
     * @return Indices of the two numbers that add up to target
     */
    public static int[] pairWithTargetSum(int[] arr, int targetSum) {
        // TODO: Implement two pointers approach
        // 1. Initialize left and right pointers
        // 2. Check if current sum equals target
        // 3. Move pointers based on comparison
        
        return new int[]{-1, -1}; // Replace with your solution
    }
    
    public static void main(String[] args) {
        // Test cases
        int[] result1 = pairWithTargetSum(new int[]{1, 2, 3, 4, 6}, 6);
        System.out.println("[" + result1[0] + ", " + result1[1] + "]"); // Expected: [1, 3]
        
        int[] result2 = pairWithTargetSum(new int[]{2, 5, 9, 11}, 11);
        System.out.println("[" + result2[0] + ", " + result2[1] + "]"); // Expected: [0, 2]
    }
}`
        },
        
        'Fast & Slow Pointers': {
            javascript: `class ListNode {
    constructor(val, next = null) {
        this.val = val;
        this.next = next;
    }
}

/**
 * Determine if a linked list has a cycle
 * @param {ListNode} head - Head of the linked list
 * @return {boolean} True if cycle exists, false otherwise
 */
function hasCycle(head) {
    // TODO: Implement fast & slow pointers approach
    // 1. Initialize slow and fast pointers
    // 2. Move slow by 1 step, fast by 2 steps
    // 3. If they meet, there's a cycle
    
    return false;  // Replace with your solution
}

// Test cases (you can create test linked lists)
// Example: 1->2->3->4->5 (no cycle) should return false
// Example: 1->2->3->4->5->2 (cycle) should return true`,
            
            python: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def has_cycle(head):
    """
    Determine if a linked list has a cycle
    
    Args:
        head: Head of the linked list
    
    Returns:
        True if cycle exists, false otherwise
    """
    # TODO: Implement fast & slow pointers approach
    # 1. Initialize slow and fast pointers
    # 2. Move slow by 1 step, fast by 2 steps
    # 3. If they meet, there's a cycle
    
    return False  # Replace with your solution

# Test cases (you can create test linked lists)
# Example: 1->2->3->4->5 (no cycle) should return False
# Example: 1->2->3->4->5->2 (cycle) should return True`,

            java: `class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

public class Solution {
    /**
     * Determine if a linked list has a cycle
     * 
     * @param head Head of the linked list
     * @return true if cycle exists, false otherwise
     */
    public boolean hasCycle(ListNode head) {
        // TODO: Implement fast & slow pointers approach
        // 1. Initialize slow and fast pointers
        // 2. Move slow by 1 step, fast by 2 steps
        // 3. If they meet, there's a cycle
        
        return false; // Replace with your solution
    }
    
    public static void main(String[] args) {
        Solution solution = new Solution();
        
        // Test cases (you can create test linked lists)
        // Example: 1->2->3->4->5 (no cycle) should return false
        // Example: 1->2->3->4->5->2 (cycle) should return true
    }
}`
        },
        
        'Dynamic Programming': {
            javascript: `/**
 * Find number of distinct ways to climb n stairs
 * @param {number} n - Number of stairs
 * @return {number} Number of distinct ways to reach the top
 */
function climbStairs(n) {
    // TODO: Implement dynamic programming approach
    // 1. Identify base cases (n=1, n=2)
    // 2. For each step, calculate ways = ways(n-1) + ways(n-2)
    // 3. You can optimize space complexity
    
    return 0;  // Replace with your solution
}

// Test cases
console.log(climbStairs(2));  // Expected: 2
console.log(climbStairs(3));  // Expected: 3
console.log(climbStairs(5));  // Expected: 8`,
            
            python: `def climb_stairs(n):
    """
    Find number of distinct ways to climb n stairs
    
    Args:
        n: Number of stairs
    
    Returns:
        Number of distinct ways to reach the top
    """
    # TODO: Implement dynamic programming approach
    # 1. Identify base cases (n=1, n=2)
    # 2. For each step, calculate ways = ways(n-1) + ways(n-2)
    # 3. You can optimize space complexity
    
    return 0  # Replace with your solution

# Test cases
print(climb_stairs(2))  # Expected: 2
print(climb_stairs(3))  # Expected: 3
print(climb_stairs(5))  # Expected: 8`,

            java: `public class Solution {
    /**
     * Find number of distinct ways to climb n stairs
     * 
     * @param n Number of stairs
     * @return Number of distinct ways to reach the top
     */
    public int climbStairs(int n) {
        // TODO: Implement dynamic programming approach
        // 1. Identify base cases (n=1, n=2)
        // 2. For each step, calculate ways = ways(n-1) + ways(n-2)
        // 3. You can optimize space complexity
        
        return 0; // Replace with your solution
    }
    
    public static void main(String[] args) {
        Solution solution = new Solution();
        
        // Test cases
        System.out.println(solution.climbStairs(2));  // Expected: 2
        System.out.println(solution.climbStairs(3));  // Expected: 3
        System.out.println(solution.climbStairs(5));  // Expected: 8
    }
}`
        }
    };

    const templates = starterTemplates[mainPattern];
    if (templates && templates[language]) {
        console.log('✅ Found pattern-specific template for:', mainPattern, language);
        return templates[language];
    }
    
    console.log('⚠️ No pattern-specific template found, using generic template for:', language);
    
    // Fallback to generic template based on language
    const genericTemplates = {
        javascript: `// ${lesson.title || 'Coding Challenge'}
// Pattern: ${mainPattern}

function solveProblem() {
    // TODO: Implement your solution here
    return null;
}

// Test your solution
console.log(solveProblem());`,
        
        python: `# ${lesson.title || 'Coding Challenge'}
# Pattern: ${mainPattern}

def solve_problem():
    """
    TODO: Implement your solution here
    """
    return None

# Test your solution
print(solve_problem())`,
        
        java: `// ${lesson.title || 'Coding Challenge'}
// Pattern: ${mainPattern}

public class Solution {
    public static void solveProblem() {
        // TODO: Implement your solution here
        System.out.println("Solution not implemented yet");
    }
    
    public static void main(String[] args) {
        solveProblem();
    }
}`
    };
    
    const result = genericTemplates[language] || genericTemplates['javascript'];
    console.log('📤 Returning template for language:', language, 'length:', result.length);
    return result;
}

function generateTests(module, lesson, language = 'javascript') {
    switch (language) {
        case 'python':
            return `import unittest
from main import solve_problem

class TestSolution(unittest.TestCase):
    def test_basic_case(self):
        # TODO: Add test cases based on the pattern
        result = solve_problem()
        self.assertIsNotNone(result)

if __name__ == '__main__':
    unittest.main()
`;
        case 'java':
            return `import org.junit.Test;
import static org.junit.Assert.*;

public class SolutionTest {
    @Test
    public void testBasicCase() {
        Solution solution = new Solution();
        // TODO: Add test cases
        int result = solution.solve();
        assertTrue(result >= 0);
    }
}
`;
        default: // javascript
            return `// Test cases for ${lesson.title}
function runTests() {
    console.log('Running tests...');
    
    // TODO: Add test cases based on the pattern
    const result = solveProblem();
    
    console.log('Test 1: Basic case');
    console.log('Result:', result);
    
    return true;
}

runTests();
`;
    }
}

function getMainFileName(language = 'javascript') {
    switch (language) {
        case 'python': return 'main.py';
        case 'java': return 'Solution.java';
        case 'cpp': return 'main.cpp';
        case 'c': return 'main.c';
        default: return 'main.js';
    }
}

function getTestFileName(language = 'javascript') {
    switch (language) {
        case 'python': return 'test_main.py';
        case 'java': return 'SolutionTest.java';
        case 'cpp': return 'test.cpp';
        case 'c': return 'test.c';
        default: return 'test.js';
    }
}

// Generate LeetCode-style problem content based on coding patterns
function generateProblemContent(module, lesson) {
    const patterns = module.core_patterns || [];
    const mainPattern = patterns[0] || 'Problem Solving';
    
    // Real coding problems for each pattern
    const problemDatabase = {
        'Sliding Window': {
            title: 'Maximum Sum Subarray of Size K',
            description: 'Given an array of positive numbers and a positive number k, find the maximum sum of any contiguous subarray of size k.',
            examples: [
                {
                    input: 'Array: [2, 1, 5, 1, 3, 2], k=3',
                    output: '9',
                    explanation: 'Subarray with maximum sum is [5, 1, 3]'
                },
                {
                    input: 'Array: [2, 3, 4, 1, 5], k=2', 
                    output: '7',
                    explanation: 'Subarray with maximum sum is [3, 4]'
                }
            ],
            constraints: [
                '1 ≤ k ≤ array length',
                'All numbers are positive integers',
                '1 ≤ array length ≤ 10^4'
            ]
        },
        'Two Pointers': {
            title: 'Pair with Target Sum',
            description: 'Given an array of sorted numbers and a target sum, find a pair in the array whose sum is equal to the given target.',
            examples: [
                {
                    input: 'Array: [1, 2, 3, 4, 6], target=6',
                    output: '[1, 3]',
                    explanation: 'The numbers at index 1 and 3 add up to 6: 2+4=6'
                },
                {
                    input: 'Array: [2, 5, 9, 11], target=11',
                    output: '[0, 2]', 
                    explanation: 'The numbers at index 0 and 2 add up to 11: 2+9=11'
                }
            ],
            constraints: [
                'Array is sorted in ascending order',
                'Each input has exactly one solution',
                '2 ≤ array length ≤ 10^4'
            ]
        },
        'Fast & Slow Pointers': {
            title: 'LinkedList Cycle',
            description: 'Given the head of a Singly LinkedList, write a function to determine if the LinkedList has a cycle in it or not.',
            examples: [
                {
                    input: 'head = [1,2,3,4,5] with 5->2 (cycle)',
                    output: 'true',
                    explanation: 'There is a cycle where node 5 points back to node 2'
                },
                {
                    input: 'head = [1,2,3,4,5] (no cycle)',
                    output: 'false',
                    explanation: 'No node points back to a previous node'
                }
            ],
            constraints: [
                '0 ≤ Number of nodes ≤ 10^4',
                'Node values can be any integer',
                'Follow up: Can you solve it using O(1) memory?'
            ]
        },
        'Dynamic Programming': {
            title: 'Climbing Stairs',
            description: 'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
            examples: [
                {
                    input: 'n = 2',
                    output: '2',
                    explanation: 'There are two ways: 1+1, 2'
                },
                {
                    input: 'n = 3',
                    output: '3',
                    explanation: 'There are three ways: 1+1+1, 1+2, 2+1'
                }
            ],
            constraints: [
                '1 ≤ n ≤ 45'
            ]
        },
        'Tree BFS': {
            title: 'Binary Tree Level Order Traversal',
            description: 'Given the root of a binary tree, return the level order traversal of its nodes\' values (i.e., from left to right, level by level).',
            examples: [
                {
                    input: 'root = [3,9,20,null,null,15,7]',
                    output: '[[3],[9,20],[15,7]]',
                    explanation: 'Level 1: [3], Level 2: [9,20], Level 3: [15,7]'
                }
            ],
            constraints: [
                'The number of nodes in the tree is in the range [0, 2000]',
                '-1000 ≤ Node.val ≤ 1000'
            ]
        }
    };

    const problemData = problemDatabase[mainPattern] || problemDatabase['Sliding Window'];
    
    return {
        title: problemData.title,
        description: problemData.description,
        examples: problemData.examples,
        constraints: problemData.constraints,
        instructions: generateDetailedInstructions(problemData, mainPattern)
    };
}

function generateDetailedInstructions(problemData, pattern) {
    return `# ${problemData.title}

## Problem Statement
${problemData.description}

## Examples
${problemData.examples.map((ex, i) => `
**Example ${i + 1}:**
- **Input:** ${ex.input}
- **Output:** ${ex.output}
- **Explanation:** ${ex.explanation}
`).join('')}

## Constraints
${problemData.constraints.map(c => `- ${c}`).join('\n')}

## Approach
This problem uses the **${pattern}** pattern. Here's how to approach it:

1. **Understand the Pattern**: ${getPatternExplanation(pattern)}
2. **Analyze Examples**: Look at the input/output relationship
3. **Identify Edge Cases**: Consider boundary conditions
4. **Implement Step by Step**: Start with a basic solution
5. **Optimize**: Improve time/space complexity if needed

## Hints
${getPatternHints(pattern).map((hint, i) => `${i + 1}. ${hint}`).join('\n')}

---
**Time to Code!** 🚀
Write your solution in the code editor and run the tests to verify your approach.
`;
}

function getPatternExplanation(pattern) {
    const explanations = {
        'Sliding Window': 'Use two pointers to maintain a window of elements that slides through the array',
        'Two Pointers': 'Place pointers at different positions and move them based on comparisons', 
        'Fast & Slow Pointers': 'Use two pointers moving at different speeds to detect cycles',
        'Dynamic Programming': 'Break down the problem into overlapping subproblems and store results',
        'Tree BFS': 'Use a queue to traverse the tree level by level'
    };
    return explanations[pattern] || 'Apply algorithmic thinking to solve the problem systematically';
}

function getPatternHints(pattern) {
    const hints = {
        'Sliding Window': [
            'Start with a window of the required size',
            'Slide the window by removing the leftmost element and adding a new rightmost element',
            'Keep track of the maximum sum as you slide'
        ],
        'Two Pointers': [
            'Use one pointer at the start and one at the end',
            'Move pointers based on the sum comparison with target',
            'If sum is too small, move left pointer right; if too large, move right pointer left'
        ],
        'Fast & Slow Pointers': [
            'Initialize both pointers at the head',
            'Move slow pointer one step and fast pointer two steps',
            'If there\'s a cycle, they will eventually meet'
        ],
        'Dynamic Programming': [
            'Identify the base cases (n=1, n=2)',
            'Each step depends on previous steps: dp[i] = dp[i-1] + dp[i-2]',
            'You can optimize space by only keeping track of last two values'
        ],
        'Tree BFS': [
            'Use a queue to keep track of nodes at current level',
            'Process all nodes at current level before moving to next',
            'Add children of current nodes to queue for next level'
        ]
    };
    return hints[pattern] || ['Think about the problem step by step', 'Consider edge cases', 'Start with a simple approach'];
}

// Generate comprehensive test cases based on patterns  
function generateTestCases(module, lesson, language = 'javascript') {
    const patterns = module.core_patterns || [];
    const mainPattern = patterns[0] || 'Problem Solving';
    
    // Pattern-specific test cases with proper inputs and expected outputs
    const testCaseTemplates = {
        'Sliding Window': [
            { 
                description: 'Maximum sum subarray - Example 1', 
                input: 'arr=[2, 1, 5, 1, 3, 2], k=3', 
                expectedOutput: '9',
                explanation: 'Subarray [5, 1, 3] has maximum sum of 9'
            },
            { 
                description: 'Maximum sum subarray - Example 2', 
                input: 'arr=[2, 3, 4, 1, 5], k=2', 
                expectedOutput: '7',
                explanation: 'Subarray [3, 4] has maximum sum of 7'
            },
            { 
                description: 'Edge case: single element', 
                input: 'arr=[5], k=1', 
                expectedOutput: '5',
                explanation: 'Only one element, return that element'
            }
        ],
        'Two Pointers': [
            { 
                description: 'Pair with target sum - Example 1', 
                input: 'arr=[1, 2, 3, 4, 6], target=6', 
                expectedOutput: '[1, 3]',
                explanation: 'Numbers at indices 1 and 3 (2+4=6)'
            },
            { 
                description: 'Pair with target sum - Example 2', 
                input: 'arr=[2, 5, 9, 11], target=11', 
                expectedOutput: '[0, 2]',
                explanation: 'Numbers at indices 0 and 2 (2+9=11)'
            },
            { 
                description: 'Edge case: first and last elements', 
                input: 'arr=[1, 3, 5], target=6', 
                expectedOutput: '[0, 2]',
                explanation: 'First and last elements sum to target'
            }
        ],
        'Fast & Slow Pointers': [
            { 
                description: 'Linked list with cycle', 
                input: 'head=[1,2,3,4] with 4->2', 
                expectedOutput: 'true',
                explanation: 'Node 4 points back to node 2, creating a cycle'
            },
            { 
                description: 'Linked list without cycle', 
                input: 'head=[1,2,3,4,5]', 
                expectedOutput: 'false',
                explanation: 'No node points back to a previous node'
            },
            { 
                description: 'Edge case: single node no cycle', 
                input: 'head=[1]', 
                expectedOutput: 'false',
                explanation: 'Single node cannot have a cycle'
            }
        ],
        'Dynamic Programming': [
            { 
                description: 'Climbing stairs - 2 steps', 
                input: 'n=2', 
                expectedOutput: '2',
                explanation: 'Two ways: (1+1) or (2)'
            },
            { 
                description: 'Climbing stairs - 3 steps', 
                input: 'n=3', 
                expectedOutput: '3',
                explanation: 'Three ways: (1+1+1), (1+2), or (2+1)'
            },
            { 
                description: 'Climbing stairs - 5 steps', 
                input: 'n=5', 
                expectedOutput: '8',
                explanation: 'Fibonacci sequence: F(5) = F(4) + F(3) = 5 + 3 = 8'
            }
        ],
        'Tree BFS': [
            { 
                description: 'Level order traversal - balanced tree', 
                input: 'root=[3,9,20,null,null,15,7]', 
                expectedOutput: '[[3],[9,20],[15,7]]',
                explanation: 'Level 1: [3], Level 2: [9,20], Level 3: [15,7]'
            },
            { 
                description: 'Level order traversal - single node', 
                input: 'root=[1]', 
                expectedOutput: '[[1]]',
                explanation: 'Only root node at level 1'
            }
        ]
    };

    return testCaseTemplates[mainPattern] || [
        { description: 'Basic test case', input: 'sample_input', expectedOutput: 'expected_output', explanation: 'Default test case' }
    ];
}

// Generate complete solution code for each pattern
function generateSolutionCode(module, lesson, language = 'javascript') {
    const patterns = module.core_patterns || [];
    const mainPattern = patterns[0] || 'Problem Solving';
    
    console.log('Generating solution for pattern:', mainPattern, 'language:', language);
    
    const solutionTemplates = {
        'Sliding Window': {
            javascript: `/**
 * SOLUTION: Maximum Sum Subarray of Size K
 * Time Complexity: O(n) - Single pass through array
 * Space Complexity: O(1) - Only using a few variables
 */
function findMaxSumSubArray(arr, k) {
    if (!arr || arr.length < k) return 0;
    
    // Step 1: Calculate sum of first window
    let windowSum = 0;
    for (let i = 0; i < k; i++) {
        windowSum += arr[i];
    }
    
    let maxSum = windowSum;
    
    // Step 2: Slide the window
    for (let i = k; i < arr.length; i++) {
        // Remove leftmost element and add new rightmost element
        windowSum = windowSum - arr[i - k] + arr[i];
        maxSum = Math.max(maxSum, windowSum);
    }
    
    return maxSum;
}

// Test the solution
console.log(findMaxSumSubArray([2, 1, 5, 1, 3, 2], 3)); // Output: 9
console.log(findMaxSumSubArray([2, 3, 4, 1, 5], 2));     // Output: 7
console.log(findMaxSumSubArray([5], 1));                  // Output: 5`
        },
        
        'Two Pointers': {
            javascript: `/**
 * SOLUTION: Pair with Target Sum
 * Time Complexity: O(n) - Single pass with two pointers
 * Space Complexity: O(1) - Only using two pointer variables
 */
function pairWithTargetSum(arr, targetSum) {
    if (!arr || arr.length < 2) return [-1, -1];
    
    let left = 0;
    let right = arr.length - 1;
    
    while (left < right) {
        const currentSum = arr[left] + arr[right];
        
        if (currentSum === targetSum) {
            return [left, right];  // Found the pair!
        } else if (currentSum < targetSum) {
            left++;  // Need larger sum, move left pointer right
        } else {
            right--; // Need smaller sum, move right pointer left
        }
    }
    
    return [-1, -1]; // No pair found
}

// Test the solution
console.log(pairWithTargetSum([1, 2, 3, 4, 6], 6));   // Output: [1, 3]
console.log(pairWithTargetSum([2, 5, 9, 11], 11));    // Output: [0, 2]
console.log(pairWithTargetSum([1, 3, 5], 6));         // Output: [0, 2]`
        },
        
        'Fast & Slow Pointers': {
            javascript: `/**
 * SOLUTION: LinkedList Cycle Detection
 * Time Complexity: O(n) - Visit each node at most twice
 * Space Complexity: O(1) - Only using two pointer variables
 */
class ListNode {
    constructor(val, next = null) {
        this.val = val;
        this.next = next;
    }
}

function hasCycle(head) {
    if (!head || !head.next) return false;
    
    // Initialize slow and fast pointers
    let slow = head;
    let fast = head;
    
    // Move pointers at different speeds
    while (fast && fast.next) {
        slow = slow.next;           // Move slow by 1 step
        fast = fast.next.next;      // Move fast by 2 steps
        
        // If they meet, there's a cycle
        if (slow === fast) {
            return true;
        }
    }
    
    return false; // Fast pointer reached end, no cycle
}

// Helper function to create a test linked list with cycle
function createTestLinkedListWithCycle() {
    const node1 = new ListNode(1);
    const node2 = new ListNode(2);
    const node3 = new ListNode(3);
    const node4 = new ListNode(4);
    
    node1.next = node2;
    node2.next = node3;
    node3.next = node4;
    node4.next = node2; // Creates cycle: 4 -> 2
    
    return node1;
}

// Test the solution
const cycleList = createTestLinkedListWithCycle();
console.log(hasCycle(cycleList)); // Output: true

const noCycleList = new ListNode(1, new ListNode(2, new ListNode(3)));
console.log(hasCycle(noCycleList)); // Output: false`
        },
        
        'Dynamic Programming': {
            javascript: `/**
 * SOLUTION: Climbing Stairs
 * Time Complexity: O(n) - Single iteration from 1 to n
 * Space Complexity: O(1) - Only storing last two results
 */
function climbStairs(n) {
    if (n <= 2) return n;
    
    // Base cases: 1 step = 1 way, 2 steps = 2 ways
    let oneStepBefore = 2; // dp[2]
    let twoStepsBefore = 1; // dp[1]
    
    // For each step from 3 to n, calculate number of ways
    for (let i = 3; i <= n; i++) {
        const current = oneStepBefore + twoStepsBefore;
        
        // Update for next iteration
        twoStepsBefore = oneStepBefore;
        oneStepBefore = current;
    }
    
    return oneStepBefore;
}

// Alternative solution using memoization (top-down DP)
function climbStairsMemo(n, memo = {}) {
    if (n in memo) return memo[n];
    if (n <= 2) return n;
    
    memo[n] = climbStairsMemo(n - 1, memo) + climbStairsMemo(n - 2, memo);
    return memo[n];
}

// Test the solution
console.log(climbStairs(2));  // Output: 2
console.log(climbStairs(3));  // Output: 3
console.log(climbStairs(5));  // Output: 8
console.log(climbStairs(10)); // Output: 89`
        },
        
        'Tree BFS': {
            javascript: `/**
 * SOLUTION: Binary Tree Level Order Traversal
 * Time Complexity: O(n) - Visit each node exactly once
 * Space Complexity: O(w) - Maximum width of tree for queue
 */
class TreeNode {
    constructor(val, left = null, right = null) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

function levelOrder(root) {
    if (!root) return [];
    
    const result = [];
    const queue = [root];
    
    while (queue.length > 0) {
        const levelSize = queue.length;
        const currentLevel = [];
        
        // Process all nodes at current level
        for (let i = 0; i < levelSize; i++) {
            const node = queue.shift();
            currentLevel.push(node.val);
            
            // Add children to queue for next level
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
        
        result.push(currentLevel);
    }
    
    return result;
}

// Helper function to create test tree
function createTestTree() {
    //       3
    //      / \\
    //     9   20
    //        /  \\
    //       15   7
    const root = new TreeNode(3);
    root.left = new TreeNode(9);
    root.right = new TreeNode(20);
    root.right.left = new TreeNode(15);
    root.right.right = new TreeNode(7);
    return root;
}

// Test the solution
const testTree = createTestTree();
console.log(levelOrder(testTree)); // Output: [[3], [9, 20], [15, 7]]

const singleNode = new TreeNode(1);
console.log(levelOrder(singleNode)); // Output: [[1]]`
        }
    };

    const solution = solutionTemplates[mainPattern];
    if (solution && solution[language]) {
        return solution[language];
    }
    
    // Fallback solution based on language
    const fallbackSolutions = {
        javascript: `// Solution for ${lesson.title || 'Coding Challenge'}
// Pattern: ${mainPattern}

function solveProblem() {
    // Complete solution would be implemented here
    // This is a template for ${mainPattern} pattern
    return null;
}`,

        python: `# Solution for ${lesson.title || 'Coding Challenge'}
# Pattern: ${mainPattern}

def solve_problem():
    """
    Complete solution would be implemented here
    This is a template for ${mainPattern} pattern
    """
    return None`,

        java: `// Solution for ${lesson.title || 'Coding Challenge'}
// Pattern: ${mainPattern}

public class Solution {
    public static Object solveProblem() {
        // Complete solution would be implemented here
        // This is a template for ${mainPattern} pattern
        return null;
    }
}`
    };
    
    return fallbackSolutions[language] || fallbackSolutions['javascript'];
}

// Generate hints
function generateHints(module, lesson) {
    const patterns = module.core_patterns || [];
    const mainPattern = patterns[0] || 'Problem Solving';
    
    const hintTemplates = {
        'Sliding Window': [
            'Try using two pointers to maintain a window of elements',
            'Think about when to expand vs contract the window',
            'Consider what condition determines the window size'
        ],
        'Two Pointers': [
            'Place one pointer at the start and one at the end',
            'Move pointers based on some comparison condition', 
            'Think about when to move left vs right pointer'
        ]
    };

    return hintTemplates[mainPattern] || [
        'Break down the problem into smaller steps',
        'Consider the time and space complexity',
        'Think about edge cases and boundary conditions'
    ];
}