-- Insert working multilanguage course with real different code for each language
INSERT INTO enhanced_courses (
    id, 
    title, 
    description, 
    difficulty_level, 
    estimated_duration,
    prerequisites, 
    learning_objectives, 
    metadata, 
    teacher_id, 
    is_published
) VALUES (
    gen_random_uuid(),
    'Array & Hash Table Fundamentals (MULTILANG)',
    'Master fundamental array and hash table algorithms with REAL multilanguage implementations. This course demonstrates actual language-specific code that changes when you switch languages!',
    'beginner',
    '4 hours',
    '["Basic programming knowledge"]',
    '["Master array manipulation", "Understand hash tables", "Solve LeetCode problems"]',
    '{
        "title": "Array & Hash Table Fundamentals (MULTILANG)",
        "description": "Master fundamental array and hash table algorithms with real multilanguage implementations",
        "difficulty_level": "beginner",
        "estimated_duration": "4 hours",
        "prerequisites": ["Basic programming knowledge"],
        "learning_objectives": ["Master array manipulation", "Understand hash tables", "Solve LeetCode problems"],
        "modules": [
            {
                "title": "Hash Table Patterns",
                "description": "Learn essential hash table patterns",
                "estimated_duration": "2 hours",
                "core_patterns": ["Hash Table", "Array"],
                "lessons": {
                    "count": 2,
                    "lessons": [
                        {
                            "title": "Two Sum",
                            "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
                            "pattern": "Hash Table",
                            "difficulty": "easy",
                            "time_complexity": "O(n)",
                            "space_complexity": "O(n)",
                            "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"],
                            "examples": [
                                {
                                    "input": "nums = [2,7,11,15], target = 9",
                                    "output": "[0,1]",
                                    "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]"
                                }
                            ],
                            "hints": ["Use a hash map to store numbers you have seen", "For each number, check if target - number exists in hash map"],
                            "languageImplementations": {
                                "javascript": {
                                    "starterCode": "/**\n * Two Sum - Find two indices that add up to target\n * @param {number[]} nums - Array of integers\n * @param {number} target - Target sum\n * @return {number[]} Indices of the two numbers\n */\nfunction twoSum(nums, target) {\n    // TODO: Implement using hash map\n    // 1. Create a hash map to store number -> index\n    // 2. For each number, check if (target - number) exists\n    // 3. Return the indices if found\n    \n    return []; // Replace with your solution\n}\n\n// Test cases\nconsole.log(twoSum([2, 7, 11, 15], 9)); // Expected: [0, 1]\nconsole.log(twoSum([3, 2, 4], 6));      // Expected: [1, 2]",
                                    "solutionCode": "/**\n * Two Sum - Optimized Hash Map Solution\n * Time: O(n), Space: O(n)\n */\nfunction twoSum(nums, target) {\n    const numMap = new Map();\n    \n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        \n        if (numMap.has(complement)) {\n            return [numMap.get(complement), i];\n        }\n        \n        numMap.set(nums[i], i);\n    }\n    \n    return []; // No solution found\n}",
                                    "testCases": "// Test suite for Two Sum\nfunction runTests() {\n    console.log(\"Running Two Sum tests...\");\n    \n    const result1 = twoSum([2, 7, 11, 15], 9);\n    console.assert(JSON.stringify(result1) === JSON.stringify([0, 1]), \"Test 1 failed\");\n    \n    const result2 = twoSum([3, 2, 4], 6);\n    console.assert(JSON.stringify(result2) === JSON.stringify([1, 2]), \"Test 2 failed\");\n    \n    console.log(\"All tests passed!\");\n    return true;\n}\n\nrunTests();",
                                    "explanation": "Use a hash map to store each number and its index as we iterate. For each number, check if its complement (target - number) exists in the hash map."
                                },
                                "python": {
                                    "starterCode": "def two_sum(nums: list[int], target: int) -> list[int]:\n    \"\"\"\n    Two Sum - Find two indices that add up to target\n    \n    Args:\n        nums: List of integers\n        target: Target sum\n        \n    Returns:\n        List of two indices that add up to target\n    \"\"\"\n    # TODO: Implement using hash map\n    # 1. Create a dictionary to store number -> index\n    # 2. For each number, check if (target - number) exists\n    # 3. Return the indices if found\n    \n    return []  # Replace with your solution\n\n# Test cases\nprint(two_sum([2, 7, 11, 15], 9))  # Expected: [0, 1]\nprint(two_sum([3, 2, 4], 6))       # Expected: [1, 2]",
                                    "solutionCode": "def two_sum(nums: list[int], target: int) -> list[int]:\n    \"\"\"\n    Two Sum - Optimized Hash Map Solution\n    Time: O(n), Space: O(n)\n    \"\"\"\n    num_map = {}\n    \n    for i, num in enumerate(nums):\n        complement = target - num\n        \n        if complement in num_map:\n            return [num_map[complement], i]\n        \n        num_map[num] = i\n    \n    return []  # No solution found",
                                    "testCases": "import unittest\n\nclass TestTwoSum(unittest.TestCase):\n    \n    def test_basic_case(self):\n        result = two_sum([2, 7, 11, 15], 9)\n        self.assertEqual(result, [0, 1])\n    \n    def test_middle_elements(self):\n        result = two_sum([3, 2, 4], 6)\n        self.assertEqual(result, [1, 2])\n\nif __name__ == \"__main__\":\n    unittest.main()",
                                    "explanation": "Use a dictionary to store each number and its index as we iterate. For each number, check if its complement (target - number) exists in the dictionary."
                                },
                                "java": {
                                    "starterCode": "import java.util.*;\n\npublic class Solution {\n    /**\n     * Two Sum - Find two indices that add up to target\n     * \n     * @param nums Array of integers\n     * @param target Target sum\n     * @return Array of two indices that add up to target\n     */\n    public int[] twoSum(int[] nums, int target) {\n        // TODO: Implement using HashMap\n        // 1. Create a HashMap to store number -> index\n        // 2. For each number, check if (target - number) exists\n        // 3. Return the indices if found\n        \n        return new int[]{}; // Replace with your solution\n    }\n    \n    public static void main(String[] args) {\n        Solution solution = new Solution();\n        \n        // Test cases\n        System.out.println(Arrays.toString(solution.twoSum(new int[]{2, 7, 11, 15}, 9))); // Expected: [0, 1]\n        System.out.println(Arrays.toString(solution.twoSum(new int[]{3, 2, 4}, 6)));      // Expected: [1, 2]\n    }\n}",
                                    "solutionCode": "import java.util.*;\n\npublic class Solution {\n    /**\n     * Two Sum - Optimized HashMap Solution\n     * Time: O(n), Space: O(n)\n     */\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> numMap = new HashMap<>();\n        \n        for (int i = 0; i < nums.length; i++) {\n            int complement = target - nums[i];\n            \n            if (numMap.containsKey(complement)) {\n                return new int[]{numMap.get(complement), i};\n            }\n            \n            numMap.put(nums[i], i);\n        }\n        \n        return new int[]{}; // No solution found\n    }\n}",
                                    "testCases": "import org.junit.Test;\nimport static org.junit.Assert.*;\n\npublic class SolutionTest {\n    \n    @Test\n    public void testBasicCase() {\n        Solution solution = new Solution();\n        int[] result = solution.twoSum(new int[]{2, 7, 11, 15}, 9);\n        assertArrayEquals(new int[]{0, 1}, result);\n    }\n    \n    @Test \n    public void testMiddleElements() {\n        Solution solution = new Solution();\n        int[] result = solution.twoSum(new int[]{3, 2, 4}, 6);\n        assertArrayEquals(new int[]{1, 2}, result);\n    }\n}",
                                    "explanation": "Use a HashMap to store each number and its index as we iterate. For each number, check if its complement (target - number) exists in the HashMap."
                                }
                            }
                        },
                        {
                            "title": "Contains Duplicate",
                            "description": "Given an integer array nums, return true if any value appears at least twice in the array.",
                            "pattern": "Hash Table",
                            "difficulty": "easy",
                            "time_complexity": "O(n)",
                            "space_complexity": "O(n)",
                            "constraints": ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
                            "examples": [
                                {
                                    "input": "nums = [1,2,3,1]",
                                    "output": "true",
                                    "explanation": "The number 1 appears twice"
                                }
                            ],
                            "languageImplementations": {
                                "javascript": {
                                    "starterCode": "/**\n * Contains Duplicate - Check if array has duplicates\n * @param {number[]} nums - Array of integers\n * @return {boolean} True if duplicates exist\n */\nfunction containsDuplicate(nums) {\n    // TODO: Implement using Set or Map\n    // 1. Use a Set to track seen numbers\n    // 2. Return true if number already exists\n    // 3. Return false if no duplicates found\n    \n    return false; // Replace with your solution\n}\n\n// Test cases\nconsole.log(containsDuplicate([1, 2, 3, 1])); // Expected: true\nconsole.log(containsDuplicate([1, 2, 3, 4])); // Expected: false",
                                    "solutionCode": "function containsDuplicate(nums) {\n    const seen = new Set();\n    \n    for (const num of nums) {\n        if (seen.has(num)) {\n            return true;\n        }\n        seen.add(num);\n    }\n    \n    return false;\n}",
                                    "testCases": "// Test suite for Contains Duplicate\nfunction runTests() {\n    console.log(\"Running Contains Duplicate tests...\");\n    \n    console.assert(containsDuplicate([1, 2, 3, 1]) === true, \"Test 1 failed\");\n    console.assert(containsDuplicate([1, 2, 3, 4]) === false, \"Test 2 failed\");\n    \n    console.log(\"All tests passed!\");\n    return true;\n}",
                                    "explanation": "Use a Set to track numbers we have seen. Return true immediately when we find a duplicate."
                                },
                                "python": {
                                    "starterCode": "def contains_duplicate(nums: list[int]) -> bool:\n    \"\"\"\n    Contains Duplicate - Check if array has duplicates\n    \n    Args:\n        nums: List of integers\n        \n    Returns:\n        True if duplicates exist, False otherwise\n    \"\"\"\n    # TODO: Implement using set\n    # 1. Use a set to track seen numbers\n    # 2. Return True if number already exists\n    # 3. Return False if no duplicates found\n    \n    return False  # Replace with your solution\n\n# Test cases\nprint(contains_duplicate([1, 2, 3, 1]))  # Expected: True\nprint(contains_duplicate([1, 2, 3, 4]))  # Expected: False",
                                    "solutionCode": "def contains_duplicate(nums: list[int]) -> bool:\n    seen = set()\n    \n    for num in nums:\n        if num in seen:\n            return True\n        seen.add(num)\n    \n    return False",
                                    "testCases": "import unittest\n\nclass TestContainsDuplicate(unittest.TestCase):\n    \n    def test_has_duplicate(self):\n        self.assertTrue(contains_duplicate([1, 2, 3, 1]))\n    \n    def test_no_duplicate(self):\n        self.assertFalse(contains_duplicate([1, 2, 3, 4]))\n\nif __name__ == \"__main__\":\n    unittest.main()",
                                    "explanation": "Use a set to track numbers we have seen. Return True immediately when we find a duplicate."
                                },
                                "java": {
                                    "starterCode": "import java.util.*;\n\npublic class Solution {\n    /**\n     * Contains Duplicate - Check if array has duplicates\n     * \n     * @param nums Array of integers\n     * @return True if duplicates exist\n     */\n    public boolean containsDuplicate(int[] nums) {\n        // TODO: Implement using HashSet\n        // 1. Use a HashSet to track seen numbers\n        // 2. Return true if number already exists\n        // 3. Return false if no duplicates found\n        \n        return false; // Replace with your solution\n    }\n    \n    public static void main(String[] args) {\n        Solution solution = new Solution();\n        \n        // Test cases\n        System.out.println(solution.containsDuplicate(new int[]{1, 2, 3, 1})); // Expected: true\n        System.out.println(solution.containsDuplicate(new int[]{1, 2, 3, 4})); // Expected: false\n    }\n}",
                                    "solutionCode": "import java.util.*;\n\npublic class Solution {\n    public boolean containsDuplicate(int[] nums) {\n        Set<Integer> seen = new HashSet<>();\n        \n        for (int num : nums) {\n            if (seen.contains(num)) {\n                return true;\n            }\n            seen.add(num);\n        }\n        \n        return false;\n    }\n}",
                                    "testCases": "import org.junit.Test;\nimport static org.junit.Assert.*;\n\npublic class SolutionTest {\n    \n    @Test\n    public void testHasDuplicate() {\n        Solution solution = new Solution();\n        assertTrue(solution.containsDuplicate(new int[]{1, 2, 3, 1}));\n    }\n    \n    @Test\n    public void testNoDuplicate() {\n        Solution solution = new Solution();\n        assertFalse(solution.containsDuplicate(new int[]{1, 2, 3, 4}));\n    }\n}",
                                    "explanation": "Use a HashSet to track numbers we have seen. Return true immediately when we find a duplicate."
                                }
                            }
                        }
                    ]
                }
            }
        ]
    }',
    'system',
    true
);