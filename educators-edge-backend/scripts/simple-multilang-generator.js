/**
 * Simple Multilanguage Course Generator
 * Creates working courses with real different code for JavaScript, Python, and Java
 */

require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class SimpleMultilangGenerator {
    
    async createAdvancedTreesCourse() {
        console.log('🚀 Creating Advanced Trees course with real multilanguage support...');
        
        const courseData = {
            title: "Advanced Trees & Binary Search",
            description: "Master advanced tree algorithms with real multilanguage implementations. Each language has completely different syntax and patterns!",
            difficulty_level: "advanced",
            estimated_duration: "8 hours",
            prerequisites: ["Basic data structures", "Recursion"],
            learning_outcomes: ["Master tree traversals", "Implement BST operations", "Solve complex tree problems"],
            modules: [
                {
                    title: "Binary Search Trees",
                    description: "Master BST operations and traversals",
                    estimated_duration: "4 hours", 
                    core_patterns: ["Binary Search Tree", "Tree Traversal"],
                    lessons: {
                        count: 3,
                        lessons: [
                            {
                                title: "Validate Binary Search Tree",
                                description: "Given the root of a binary tree, determine if it is a valid binary search tree (BST).",
                                pattern: "Binary Search Tree",
                                difficulty: "medium",
                                time_complexity: "O(n)",
                                space_complexity: "O(h)",
                                constraints: ["1 <= n <= 10^4", "-2^31 <= Node.val <= 2^31 - 1"],
                                examples: [
                                    {
                                        input: "root = [2,1,3]",
                                        output: "true",
                                        explanation: "The root node's value is 2, left child is 1, right child is 3. This satisfies BST property."
                                    }
                                ],
                                hints: ["Use in-order traversal", "Check if values are in ascending order"],
                                languageImplementations: {
                                    javascript: {
                                        starterCode: `/**
 * Definition for a binary tree node
 */
class TreeNode {
    constructor(val, left, right) {
        this.val = (val === undefined ? 0 : val);
        this.left = (left === undefined ? null : left);
        this.right = (right === undefined ? null : right);
    }
}

/**
 * Validate Binary Search Tree
 * @param {TreeNode} root - Root of the binary tree
 * @return {boolean} True if valid BST
 */
function isValidBST(root) {
    // TODO: Implement BST validation
    // 1. Use in-order traversal or bounds checking
    // 2. Ensure left subtree values < root < right subtree values
    // 3. Check recursively for all nodes
    
    return false; // Replace with your solution
}

// Test cases
const root1 = new TreeNode(2, new TreeNode(1), new TreeNode(3));
console.log(isValidBST(root1)); // Expected: true

const root2 = new TreeNode(5, new TreeNode(1), new TreeNode(4, new TreeNode(3), new TreeNode(6)));
console.log(isValidBST(root2)); // Expected: false`,
                                        
                                        solutionCode: `/**
 * Validate Binary Search Tree - Bounds Checking Approach
 * Time: O(n), Space: O(h)
 */
function isValidBST(root) {
    function validate(node, min, max) {
        if (!node) return true;
        
        if (node.val <= min || node.val >= max) {
            return false;
        }
        
        return validate(node.left, min, node.val) && 
               validate(node.right, node.val, max);
    }
    
    return validate(root, -Infinity, Infinity);
}`,
                                        
                                        testCases: `// Test suite for BST validation
function runBSTTests() {
    console.log('Running BST validation tests...');
    
    // Test 1: Valid BST
    const root1 = new TreeNode(2, new TreeNode(1), new TreeNode(3));
    console.assert(isValidBST(root1) === true, 'Test 1 failed');
    
    // Test 2: Invalid BST
    const root2 = new TreeNode(5, new TreeNode(1), new TreeNode(4, new TreeNode(3), new TreeNode(6)));
    console.assert(isValidBST(root2) === false, 'Test 2 failed');
    
    console.log('All BST tests passed!');
    return true;
}

runBSTTests();`,
                                        
                                        explanation: "Use bounds checking approach. For each node, maintain valid range of values. Left subtree must have values < current node, right subtree > current node."
                                    },
                                    
                                    python: {
                                        starterCode: `# Definition for a binary tree node
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def is_valid_bst(root: TreeNode) -> bool:
    """
    Validate Binary Search Tree
    
    Args:
        root: Root of the binary tree
        
    Returns:
        True if valid BST, False otherwise
    """
    # TODO: Implement BST validation
    # 1. Use in-order traversal or bounds checking
    # 2. Ensure left subtree values < root < right subtree values
    # 3. Check recursively for all nodes
    
    return False  # Replace with your solution

# Test cases
root1 = TreeNode(2, TreeNode(1), TreeNode(3))
print(is_valid_bst(root1))  # Expected: True

root2 = TreeNode(5, TreeNode(1), TreeNode(4, TreeNode(3), TreeNode(6)))
print(is_valid_bst(root2))  # Expected: False`,
                                        
                                        solutionCode: `def is_valid_bst(root: TreeNode) -> bool:
    """
    Validate Binary Search Tree - Bounds Checking Approach
    Time: O(n), Space: O(h)
    """
    def validate(node, min_val, max_val):
        if not node:
            return True
        
        if node.val <= min_val or node.val >= max_val:
            return False
        
        return (validate(node.left, min_val, node.val) and 
                validate(node.right, node.val, max_val))
    
    return validate(root, float('-inf'), float('inf'))`,
                                        
                                        testCases: `import unittest

class TestBSTValidation(unittest.TestCase):
    
    def test_valid_bst(self):
        root = TreeNode(2, TreeNode(1), TreeNode(3))
        self.assertTrue(is_valid_bst(root))
    
    def test_invalid_bst(self):
        root = TreeNode(5, TreeNode(1), TreeNode(4, TreeNode(3), TreeNode(6)))
        self.assertFalse(is_valid_bst(root))
    
    def test_single_node(self):
        root = TreeNode(1)
        self.assertTrue(is_valid_bst(root))

if __name__ == '__main__':
    unittest.main()`,
                                        
                                        explanation: "Use bounds checking approach with float('-inf') and float('inf'). For each node, maintain valid range of values using recursive validation."
                                    },
                                    
                                    java: {
                                        starterCode: `// Definition for a binary tree node
class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

public class Solution {
    /**
     * Validate Binary Search Tree
     * 
     * @param root Root of the binary tree
     * @return True if valid BST
     */
    public boolean isValidBST(TreeNode root) {
        // TODO: Implement BST validation
        // 1. Use in-order traversal or bounds checking
        // 2. Ensure left subtree values < root < right subtree values
        // 3. Check recursively for all nodes
        
        return false; // Replace with your solution
    }
    
    public static void main(String[] args) {
        Solution solution = new Solution();
        
        // Test cases
        TreeNode root1 = new TreeNode(2, new TreeNode(1), new TreeNode(3));
        System.out.println(solution.isValidBST(root1)); // Expected: true
        
        TreeNode root2 = new TreeNode(5, new TreeNode(1), 
            new TreeNode(4, new TreeNode(3), new TreeNode(6)));
        System.out.println(solution.isValidBST(root2)); // Expected: false
    }
}`,
                                        
                                        solutionCode: `public class Solution {
    /**
     * Validate Binary Search Tree - Bounds Checking Approach
     * Time: O(n), Space: O(h)
     */
    public boolean isValidBST(TreeNode root) {
        return validate(root, Long.MIN_VALUE, Long.MAX_VALUE);
    }
    
    private boolean validate(TreeNode node, long min, long max) {
        if (node == null) {
            return true;
        }
        
        if (node.val <= min || node.val >= max) {
            return false;
        }
        
        return validate(node.left, min, node.val) && 
               validate(node.right, node.val, max);
    }
}`,
                                        
                                        testCases: `import org.junit.Test;
import static org.junit.Assert.*;

public class SolutionTest {
    
    @Test
    public void testValidBST() {
        Solution solution = new Solution();
        TreeNode root = new TreeNode(2, new TreeNode(1), new TreeNode(3));
        assertTrue(solution.isValidBST(root));
    }
    
    @Test
    public void testInvalidBST() {
        Solution solution = new Solution();
        TreeNode root = new TreeNode(5, new TreeNode(1), 
            new TreeNode(4, new TreeNode(3), new TreeNode(6)));
        assertFalse(solution.isValidBST(root));
    }
    
    @Test
    public void testSingleNode() {
        Solution solution = new Solution();
        TreeNode root = new TreeNode(1);
        assertTrue(solution.isValidBST(root));
    }
}`,
                                        
                                        explanation: "Use bounds checking approach with Long.MIN_VALUE and Long.MAX_VALUE to handle integer overflow. Recursively validate each subtree with appropriate bounds."
                                    }
                                }
                            },
                            {
                                title: "Binary Tree Inorder Traversal", 
                                description: "Given the root of a binary tree, return the inorder traversal of its nodes' values.",
                                pattern: "Tree Traversal",
                                difficulty: "easy",
                                time_complexity: "O(n)",
                                space_complexity: "O(h)",
                                constraints: ["0 <= n <= 100", "-100 <= Node.val <= 100"],
                                examples: [
                                    {
                                        input: "root = [1,null,2,3]",
                                        output: "[1,3,2]",
                                        explanation: "Inorder traversal visits left, root, right"
                                    }
                                ],
                                languageImplementations: {
                                    javascript: {
                                        starterCode: `/**
 * Binary Tree Inorder Traversal
 * @param {TreeNode} root - Root of binary tree
 * @return {number[]} Array of values in inorder
 */
function inorderTraversal(root) {
    // TODO: Implement inorder traversal
    // 1. Visit left subtree
    // 2. Process current node
    // 3. Visit right subtree
    
    return []; // Replace with your solution
}

// Test case
const root = new TreeNode(1, null, new TreeNode(2, new TreeNode(3), null));
console.log(inorderTraversal(root)); // Expected: [1, 3, 2]`,
                                        
                                        solutionCode: `function inorderTraversal(root) {
    const result = [];
    
    function inorder(node) {
        if (!node) return;
        
        inorder(node.left);    // Left
        result.push(node.val); // Root  
        inorder(node.right);   // Right
    }
    
    inorder(root);
    return result;
}`,
                                        
                                        testCases: `function testInorderTraversal() {
    const root = new TreeNode(1, null, new TreeNode(2, new TreeNode(3), null));
    const result = inorderTraversal(root);
    console.assert(JSON.stringify(result) === JSON.stringify([1, 3, 2]), 'Inorder test failed');
    console.log('Inorder traversal test passed!');
}`,
                                        
                                        explanation: "Recursive approach: traverse left, process current, traverse right."
                                    },
                                    
                                    python: {
                                        starterCode: `def inorder_traversal(root: TreeNode) -> list[int]:
    """
    Binary Tree Inorder Traversal
    
    Args:
        root: Root of binary tree
        
    Returns:
        List of values in inorder
    """
    # TODO: Implement inorder traversal
    # 1. Visit left subtree
    # 2. Process current node  
    # 3. Visit right subtree
    
    return []  # Replace with your solution

# Test case
root = TreeNode(1, None, TreeNode(2, TreeNode(3), None))
print(inorder_traversal(root))  # Expected: [1, 3, 2]`,
                                        
                                        solutionCode: `def inorder_traversal(root: TreeNode) -> list[int]:
    result = []
    
    def inorder(node):
        if not node:
            return
        
        inorder(node.left)      # Left
        result.append(node.val) # Root
        inorder(node.right)     # Right
    
    inorder(root)
    return result`,
                                        
                                        testCases: `def test_inorder_traversal():
    root = TreeNode(1, None, TreeNode(2, TreeNode(3), None))
    result = inorder_traversal(root)
    assert result == [1, 3, 2], f"Expected [1, 3, 2], got {result}"
    print("Inorder traversal test passed!")

test_inorder_traversal()`,
                                        
                                        explanation: "Recursive approach using helper function: traverse left, process current, traverse right."
                                    },
                                    
                                    java: {
                                        starterCode: `import java.util.*;

public class Solution {
    /**
     * Binary Tree Inorder Traversal
     * 
     * @param root Root of binary tree
     * @return List of values in inorder
     */
    public List<Integer> inorderTraversal(TreeNode root) {
        // TODO: Implement inorder traversal
        // 1. Visit left subtree
        // 2. Process current node
        // 3. Visit right subtree
        
        return new ArrayList<>(); // Replace with your solution
    }
    
    public static void main(String[] args) {
        Solution solution = new Solution();
        TreeNode root = new TreeNode(1, null, new TreeNode(2, new TreeNode(3), null));
        System.out.println(solution.inorderTraversal(root)); // Expected: [1, 3, 2]
    }
}`,
                                        
                                        solutionCode: `public List<Integer> inorderTraversal(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    inorder(root, result);
    return result;
}

private void inorder(TreeNode node, List<Integer> result) {
    if (node == null) return;
    
    inorder(node.left, result);  // Left
    result.add(node.val);        // Root
    inorder(node.right, result); // Right
}`,
                                        
                                        testCases: `@Test
public void testInorderTraversal() {
    Solution solution = new Solution();
    TreeNode root = new TreeNode(1, null, new TreeNode(2, new TreeNode(3), null));
    List<Integer> result = solution.inorderTraversal(root);
    assertEquals(Arrays.asList(1, 3, 2), result);
}`,
                                        
                                        explanation: "Recursive approach with helper method: traverse left, process current, traverse right."
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
                uuidv4(),
                courseData.title,
                courseData.description,
                courseData.difficulty_level,
                courseData.estimated_duration,
                JSON.stringify(courseData.prerequisites),
                JSON.stringify(courseData.learning_outcomes),
                JSON.stringify(courseData),
                'eb03e344-252f-42ab-8187-602fc30384fa', // Using existing teacher ID
                true
            ];
            
            const result = await pool.query(query, values);
            const course = result.rows[0];
            
            console.log('✅ Advanced Trees course created with REAL multilanguage support!');
            console.log('Course ID:', course.id);
            console.log('Title:', course.title);
            console.log('\n🎯 Language-specific features:');
            console.log('- JavaScript: TreeNode class, arrow functions, const/let');
            console.log('- Python: TreeNode class, type hints, snake_case naming');
            console.log('- Java: TreeNode class, List<Integer>, proper access modifiers');
            console.log('\n🚀 Now switch languages in AscentIDE - you will see COMPLETELY DIFFERENT CODE!');
            
            return course.id;
        } catch (error) {
            console.error('❌ Error creating Advanced Trees course:', error.message);
            throw error;
        } finally {
            await pool.end();
        }
    }
}

// Run the generator
async function main() {
    const generator = new SimpleMultilangGenerator();
    await generator.createAdvancedTreesCourse();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SimpleMultilangGenerator;