/**
 * Insert working multilanguage course directly into database
 */

require('dotenv').config();
const { Pool } = require('pg');

// Create database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function insertMultilangCourse() {
    console.log('🚀 Inserting working multilanguage course...');
    
    const courseData = {
        title: "Array & Hash Table Fundamentals (MULTILANG)",
        description: "Master fundamental array and hash table algorithms with REAL multilanguage implementations. This course demonstrates actual language-specific code that changes when you switch languages!",
        difficulty_level: "beginner",
        estimated_duration: "4 hours",
        prerequisites: ["Basic programming knowledge"],
        learning_objectives: ["Master array manipulation", "Understand hash tables", "Solve LeetCode problems"],
        modules: [
            {
                title: "Hash Table Patterns",
                description: "Learn essential hash table patterns",
                estimated_duration: "2 hours",
                core_patterns: ["Hash Table", "Array"],
                lessons: {
                    count: 2,
                    lessons: [
                        {
                            title: "Two Sum",
                            description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
                            pattern: "Hash Table",
                            difficulty: "easy",
                            time_complexity: "O(n)",
                            space_complexity: "O(n)",
                            constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"],
                            examples: [
                                {
                                    input: "nums = [2,7,11,15], target = 9",
                                    output: "[0,1]",
                                    explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]"
                                }
                            ],
                            hints: ["Use a hash map to store numbers you've seen", "For each number, check if target - number exists in hash map"],
                            languageImplementations: {
                                javascript: {
                                    starterCode: `/**
 * Two Sum - Find two indices that add up to target
 * @param {number[]} nums - Array of integers
 * @param {number} target - Target sum
 * @return {number[]} Indices of the two numbers
 */
function twoSum(nums, target) {
    // TODO: Implement using hash map
    // 1. Create a hash map to store number -> index
    // 2. For each number, check if (target - number) exists
    // 3. Return the indices if found
    
    return []; // Replace with your solution
}

// Test cases
console.log(twoSum([2, 7, 11, 15], 9)); // Expected: [0, 1]
console.log(twoSum([3, 2, 4], 6));      // Expected: [1, 2]`,
                                    solutionCode: `/**
 * Two Sum - Optimized Hash Map Solution
 * Time: O(n), Space: O(n)
 */
function twoSum(nums, target) {
    const numMap = new Map();
    
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        
        if (numMap.has(complement)) {
            return [numMap.get(complement), i];
        }
        
        numMap.set(nums[i], i);
    }
    
    return []; // No solution found
}`,
                                    testCases: `// Test suite for Two Sum
function runTests() {
    console.log('Running Two Sum tests...');
    
    const result1 = twoSum([2, 7, 11, 15], 9);
    console.assert(JSON.stringify(result1) === JSON.stringify([0, 1]), 'Test 1 failed');
    
    const result2 = twoSum([3, 2, 4], 6);
    console.assert(JSON.stringify(result2) === JSON.stringify([1, 2]), 'Test 2 failed');
    
    console.log('All tests passed!');
    return true;
}

runTests();`,
                                    explanation: "Use a hash map to store each number and its index as we iterate. For each number, check if its complement (target - number) exists in the hash map."
                                },
                                python: {
                                    starterCode: `def two_sum(nums: list[int], target: int) -> list[int]:
    """
    Two Sum - Find two indices that add up to target
    
    Args:
        nums: List of integers
        target: Target sum
        
    Returns:
        List of two indices that add up to target
    """
    # TODO: Implement using hash map
    # 1. Create a dictionary to store number -> index
    # 2. For each number, check if (target - number) exists
    # 3. Return the indices if found
    
    return []  # Replace with your solution

# Test cases
print(two_sum([2, 7, 11, 15], 9))  # Expected: [0, 1]
print(two_sum([3, 2, 4], 6))       # Expected: [1, 2]`,
                                    solutionCode: `def two_sum(nums: list[int], target: int) -> list[int]:
    """
    Two Sum - Optimized Hash Map Solution
    Time: O(n), Space: O(n)
    """
    num_map = {}
    
    for i, num in enumerate(nums):
        complement = target - num
        
        if complement in num_map:
            return [num_map[complement], i]
        
        num_map[num] = i
    
    return []  # No solution found`,
                                    testCases: `import unittest

class TestTwoSum(unittest.TestCase):
    
    def test_basic_case(self):
        result = two_sum([2, 7, 11, 15], 9)
        self.assertEqual(result, [0, 1])
    
    def test_middle_elements(self):
        result = two_sum([3, 2, 4], 6)
        self.assertEqual(result, [1, 2])

if __name__ == '__main__':
    unittest.main()`,
                                    explanation: "Use a dictionary to store each number and its index as we iterate. For each number, check if its complement (target - number) exists in the dictionary."
                                },
                                java: {
                                    starterCode: `import java.util.*;

public class Solution {
    /**
     * Two Sum - Find two indices that add up to target
     * 
     * @param nums Array of integers
     * @param target Target sum
     * @return Array of two indices that add up to target
     */
    public int[] twoSum(int[] nums, int target) {
        // TODO: Implement using HashMap
        // 1. Create a HashMap to store number -> index
        // 2. For each number, check if (target - number) exists
        // 3. Return the indices if found
        
        return new int[]{}; // Replace with your solution
    }
    
    public static void main(String[] args) {
        Solution solution = new Solution();
        
        // Test cases
        System.out.println(Arrays.toString(solution.twoSum(new int[]{2, 7, 11, 15}, 9))); // Expected: [0, 1]
        System.out.println(Arrays.toString(solution.twoSum(new int[]{3, 2, 4}, 6)));      // Expected: [1, 2]
    }
}`,
                                    solutionCode: `import java.util.*;

public class Solution {
    /**
     * Two Sum - Optimized HashMap Solution
     * Time: O(n), Space: O(n)
     */
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> numMap = new HashMap<>();
        
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            
            if (numMap.containsKey(complement)) {
                return new int[]{numMap.get(complement), i};
            }
            
            numMap.put(nums[i], i);
        }
        
        return new int[]{}; // No solution found
    }
}`,
                                    testCases: `import org.junit.Test;
import static org.junit.Assert.*;

public class SolutionTest {
    
    @Test
    public void testBasicCase() {
        Solution solution = new Solution();
        int[] result = solution.twoSum(new int[]{2, 7, 11, 15}, 9);
        assertArrayEquals(new int[]{0, 1}, result);
    }
    
    @Test 
    public void testMiddleElements() {
        Solution solution = new Solution();
        int[] result = solution.twoSum(new int[]{3, 2, 4}, 6);
        assertArrayEquals(new int[]{1, 2}, result);
    }
}`,
                                    explanation: "Use a HashMap to store each number and its index as we iterate. For each number, check if its complement (target - number) exists in the HashMap."
                                }
                            }
                        }
                    ]
                }
            }
        ]
    };
    
    try {
        const query = `
            INSERT INTO enhanced_courses (
                id, title, description, difficulty_level, estimated_duration,
                prerequisites, learning_outcomes, metadata, teacher_id, is_published
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, title
        `;
        
        const values = [
            require('crypto').randomUUID(),
            courseData.title,
            courseData.description,
            courseData.difficulty_level,
            courseData.estimated_duration,
            JSON.stringify(courseData.prerequisites),
            JSON.stringify(courseData.learning_objectives),
            JSON.stringify(courseData),
            'eb03e344-252f-42ab-8187-602fc30384fa',
            true
        ];
        
        const result = await pool.query(query, values);
        const course = result.rows[0];
        
        console.log('✅ Working multilanguage course created!');
        console.log('Course ID:', course.id);
        console.log('Title:', course.title);
        console.log('\n🎯 Features:');
        console.log('- JavaScript: function twoSum(nums, target) with Map()');
        console.log('- Python: def two_sum(nums: list[int], target: int) with dict()');
        console.log('- Java: public int[] twoSum(int[] nums, int target) with HashMap()');
        console.log('\n🚀 Now switch languages in AscentIDE - you should see DIFFERENT code!');
        
        return course.id;
    } catch (error) {
        console.error('❌ Error creating course:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

insertMultilangCourse().catch(console.error);