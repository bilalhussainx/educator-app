/**
 * Creates a working multilanguage course with REAL language-specific code
 */

require('dotenv').config();
const db = require('./services/database');
const { v4: uuidv4 } = require('uuid');

async function createWorkingMultilangCourse() {
    console.log('🚀 Creating working multilanguage course...');
    
    const courseId = uuidv4();
    
    // Real multilanguage implementations for "Two Sum" problem
    const courseData = {
        title: "Array & Hash Table Fundamentals",
        description: "Master fundamental array and hash table algorithms with real multilanguage implementations",
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
                                },
                                {
                                    input: "nums = [3,2,4], target = 6", 
                                    output: "[1,2]",
                                    explanation: "Because nums[1] + nums[2] == 6, we return [1, 2]"
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
console.log(twoSum([3, 2, 4], 6));      // Expected: [1, 2]
console.log(twoSum([3, 3], 6));         // Expected: [0, 1]`,
                                    
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
}

// Test cases
console.log(twoSum([2, 7, 11, 15], 9)); // [0, 1]
console.log(twoSum([3, 2, 4], 6));      // [1, 2]
console.log(twoSum([3, 3], 6));         // [0, 1]`,
                                    
                                    testCases: `// Test suite for Two Sum
function runTests() {
    console.log('Running Two Sum tests...');
    
    // Test case 1
    const result1 = twoSum([2, 7, 11, 15], 9);
    console.assert(JSON.stringify(result1) === JSON.stringify([0, 1]), 'Test 1 failed');
    
    // Test case 2
    const result2 = twoSum([3, 2, 4], 6);
    console.assert(JSON.stringify(result2) === JSON.stringify([1, 2]), 'Test 2 failed');
    
    // Test case 3
    const result3 = twoSum([3, 3], 6);
    console.assert(JSON.stringify(result3) === JSON.stringify([0, 1]), 'Test 3 failed');
    
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
print(two_sum([3, 2, 4], 6))       # Expected: [1, 2]
print(two_sum([3, 3], 6))          # Expected: [0, 1]`,
                                    
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
    
    return []  # No solution found

# Test cases
print(two_sum([2, 7, 11, 15], 9))  # [0, 1]
print(two_sum([3, 2, 4], 6))       # [1, 2]  
print(two_sum([3, 3], 6))          # [0, 1]`,
                                    
                                    testCases: `import unittest

class TestTwoSum(unittest.TestCase):
    
    def test_basic_case(self):
        result = two_sum([2, 7, 11, 15], 9)
        self.assertEqual(result, [0, 1])
    
    def test_middle_elements(self):
        result = two_sum([3, 2, 4], 6)
        self.assertEqual(result, [1, 2])
    
    def test_duplicate_elements(self):
        result = two_sum([3, 3], 6)
        self.assertEqual(result, [0, 1])
    
    def test_negative_numbers(self):
        result = two_sum([-1, -2, -3, -4, -5], -8)
        self.assertEqual(result, [2, 4])

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
        System.out.println(Arrays.toString(solution.twoSum(new int[]{3, 3}, 6)));         // Expected: [0, 1]
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
    
    public static void main(String[] args) {
        Solution solution = new Solution();
        
        // Test cases
        System.out.println(Arrays.toString(solution.twoSum(new int[]{2, 7, 11, 15}, 9))); // [0, 1]
        System.out.println(Arrays.toString(solution.twoSum(new int[]{3, 2, 4}, 6)));      // [1, 2]
        System.out.println(Arrays.toString(solution.twoSum(new int[]{3, 3}, 6)));         // [0, 1]
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
    
    @Test
    public void testDuplicateElements() {
        Solution solution = new Solution();
        int[] result = solution.twoSum(new int[]{3, 3}, 6);
        assertArrayEquals(new int[]{0, 1}, result);
    }
}`,
                                    
                                    explanation: "Use a HashMap to store each number and its index as we iterate. For each number, check if its complement (target - number) exists in the HashMap."
                                }
                            }
                        },
                        {
                            title: "Contains Duplicate",
                            description: "Given an integer array nums, return true if any value appears at least twice in the array.",
                            pattern: "Hash Table",
                            difficulty: "easy",
                            time_complexity: "O(n)",
                            space_complexity: "O(n)",
                            constraints: ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
                            examples: [
                                {
                                    input: "nums = [1,2,3,1]",
                                    output: "true",
                                    explanation: "The number 1 appears twice"
                                },
                                {
                                    input: "nums = [1,2,3,4]",
                                    output: "false", 
                                    explanation: "All numbers are unique"
                                }
                            ],
                            languageImplementations: {
                                javascript: {
                                    starterCode: `/**
 * Contains Duplicate - Check if array has duplicates
 * @param {number[]} nums - Array of integers
 * @return {boolean} True if duplicates exist
 */
function containsDuplicate(nums) {
    // TODO: Implement using Set or Map
    // 1. Use a Set to track seen numbers
    // 2. Return true if number already exists
    // 3. Return false if no duplicates found
    
    return false; // Replace with your solution
}

// Test cases
console.log(containsDuplicate([1, 2, 3, 1])); // Expected: true
console.log(containsDuplicate([1, 2, 3, 4])); // Expected: false`,
                                    
                                    solutionCode: `function containsDuplicate(nums) {
    const seen = new Set();
    
    for (const num of nums) {
        if (seen.has(num)) {
            return true;
        }
        seen.add(num);
    }
    
    return false;
}`,
                                    
                                    testCases: `// Test suite for Contains Duplicate
function runTests() {
    console.log('Running Contains Duplicate tests...');
    
    console.assert(containsDuplicate([1, 2, 3, 1]) === true, 'Test 1 failed');
    console.assert(containsDuplicate([1, 2, 3, 4]) === false, 'Test 2 failed');
    console.assert(containsDuplicate([1, 1, 1, 3, 3, 4, 3, 2, 4, 2]) === true, 'Test 3 failed');
    
    console.log('All tests passed!');
    return true;
}`,
                                    
                                    explanation: "Use a Set to track numbers we've seen. Return true immediately when we find a duplicate."
                                },
                                
                                python: {
                                    starterCode: `def contains_duplicate(nums: list[int]) -> bool:
    """
    Contains Duplicate - Check if array has duplicates
    
    Args:
        nums: List of integers
        
    Returns:
        True if duplicates exist, False otherwise
    """
    # TODO: Implement using set
    # 1. Use a set to track seen numbers
    # 2. Return True if number already exists
    # 3. Return False if no duplicates found
    
    return False  # Replace with your solution

# Test cases
print(contains_duplicate([1, 2, 3, 1]))  # Expected: True
print(contains_duplicate([1, 2, 3, 4]))  # Expected: False`,
                                    
                                    solutionCode: `def contains_duplicate(nums: list[int]) -> bool:
    seen = set()
    
    for num in nums:
        if num in seen:
            return True
        seen.add(num)
    
    return False`,
                                    
                                    testCases: `import unittest

class TestContainsDuplicate(unittest.TestCase):
    
    def test_has_duplicate(self):
        self.assertTrue(contains_duplicate([1, 2, 3, 1]))
    
    def test_no_duplicate(self):
        self.assertFalse(contains_duplicate([1, 2, 3, 4]))
    
    def test_multiple_duplicates(self):
        self.assertTrue(contains_duplicate([1, 1, 1, 3, 3, 4, 3, 2, 4, 2]))

if __name__ == '__main__':
    unittest.main()`,
                                    
                                    explanation: "Use a set to track numbers we've seen. Return True immediately when we find a duplicate."
                                },
                                
                                java: {
                                    starterCode: `import java.util.*;

public class Solution {
    /**
     * Contains Duplicate - Check if array has duplicates
     * 
     * @param nums Array of integers
     * @return True if duplicates exist
     */
    public boolean containsDuplicate(int[] nums) {
        // TODO: Implement using HashSet
        // 1. Use a HashSet to track seen numbers
        // 2. Return true if number already exists
        // 3. Return false if no duplicates found
        
        return false; // Replace with your solution
    }
    
    public static void main(String[] args) {
        Solution solution = new Solution();
        
        // Test cases
        System.out.println(solution.containsDuplicate(new int[]{1, 2, 3, 1})); // Expected: true
        System.out.println(solution.containsDuplicate(new int[]{1, 2, 3, 4})); // Expected: false
    }
}`,
                                    
                                    solutionCode: `import java.util.*;

public class Solution {
    public boolean containsDuplicate(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        
        for (int num : nums) {
            if (seen.contains(num)) {
                return true;
            }
            seen.add(num);
        }
        
        return false;
    }
}`,
                                    
                                    testCases: `import org.junit.Test;
import static org.junit.Assert.*;

public class SolutionTest {
    
    @Test
    public void testHasDuplicate() {
        Solution solution = new Solution();
        assertTrue(solution.containsDuplicate(new int[]{1, 2, 3, 1}));
    }
    
    @Test
    public void testNoDuplicate() {
        Solution solution = new Solution();
        assertFalse(solution.containsDuplicate(new int[]{1, 2, 3, 4}));
    }
}`,
                                    
                                    explanation: "Use a HashSet to track numbers we've seen. Return true immediately when we find a duplicate."
                                }
                            }
                        }
                    ]
                }
            }
        ]
    };
    
    try {
        // Insert the course
        await db.query(`
            INSERT INTO enhanced_courses (
                id, title, description, difficulty_level, estimated_duration,
                prerequisites, learning_objectives, metadata, teacher_id, is_published
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            courseId,
            courseData.title,
            courseData.description,
            courseData.difficulty_level,
            courseData.estimated_duration,
            JSON.stringify(courseData.prerequisites),
            JSON.stringify(courseData.learning_objectives),
            JSON.stringify(courseData),
            'system',
            true
        ]);
        
        console.log('✅ Working multilanguage course created!');
        console.log('Course ID:', courseId);
        console.log('Title:', courseData.title);
        console.log('Languages: JavaScript, Python, Java');
        console.log('\n🎯 Now try switching languages in AscentIDE - you should see DIFFERENT code!');
        
        return courseId;
    } catch (error) {
        console.error('❌ Error creating course:', error.message);
        throw error;
    }
}

createWorkingMultilangCourse().catch(console.error);