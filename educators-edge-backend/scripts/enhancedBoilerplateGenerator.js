/**
 * Enhanced Boilerplate Generator for LeetCode Problems
 * Generates problem-specific boilerplate code based on function signatures
 */

class EnhancedBoilerplateGenerator {

    // Generate appropriate boilerplate based on problem patterns
    static generateBoilerplate(problem, language) {
        const problemId = problem.id;
        const problemTitle = problem.title;

        // Parse LeetCode problem ID to get the actual number
        const leetcodeNumber = problemId.split('-')[0];

        if (language === 'javascript') {
            return this.generateJavaScriptBoilerplate(problemId, problemTitle, leetcodeNumber);
        } else if (language === 'python') {
            return this.generatePythonBoilerplate(problemId, problemTitle, leetcodeNumber);
        } else if (language === 'java') {
            return this.generateJavaBoilerplate(problemId, problemTitle, leetcodeNumber);
        } else if (language === 'cpp') {
            return this.generateCppBoilerplate(problemId, problemTitle, leetcodeNumber);
        } else if (language === 'go') {
            return this.generateGoBoilerplate(problemId, problemTitle, leetcodeNumber);
        }

        return `// ${problemTitle} - ${language} implementation\n// TODO: Implement solution`;
    }

    static generateJavaScriptBoilerplate(problemId, problemTitle, leetcodeNumber) {
        const patterns = {
            // Array problems
            '0001': `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    \n};`,
            '0217': `/**\n * @param {number[]} nums\n * @return {boolean}\n */\nvar containsDuplicate = function(nums) {\n    \n};`,
            '0242': `/**\n * @param {string} s\n * @param {string} t\n * @return {boolean}\n */\nvar isAnagram = function(s, t) {\n    \n};`,
            '0020': `/**\n * @param {string} s\n * @return {boolean}\n */\nvar isValid = function(s) {\n    \n};`,
            '0125': `/**\n * @param {string} s\n * @return {boolean}\n */\nvar isPalindrome = function(s) {\n    \n};`,
            '0013': `/**\n * @param {string} s\n * @return {number}\n */\nvar romanToInt = function(s) {\n    \n};`,

            // Linked List problems
            '0021': `/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode} list1\n * @param {ListNode} list2\n * @return {ListNode}\n */\nvar mergeTwoLists = function(list1, list2) {\n    \n};`,
            '0206': `/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode} head\n * @return {ListNode}\n */\nvar reverseList = function(head) {\n    \n};`,
            '0141': `/**\n * Definition for singly-linked list.\n * function ListNode(val) {\n *     this.val = val;\n *     this.next = null;\n * }\n */\n/**\n * @param {ListNode} head\n * @return {boolean}\n */\nvar hasCycle = function(head) {\n    \n};`,
            '0160': `/**\n * Definition for singly-linked list.\n * function ListNode(val) {\n *     this.val = val;\n *     this.next = null;\n * }\n */\n/**\n * @param {ListNode} headA\n * @param {ListNode} headB\n * @return {ListNode}\n */\nvar getIntersectionNode = function(headA, headB) {\n    \n};`,
            '0234': `/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode} head\n * @return {boolean}\n */\nvar isPalindrome = function(head) {\n    \n};`,
            '0876': `/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode} head\n * @return {ListNode}\n */\nvar middleNode = function(head) {\n    \n};`,

            // Tree problems
            '0104': `/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @return {number}\n */\nvar maxDepth = function(root) {\n    \n};`,
            '0100': `/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} p\n * @param {TreeNode} q\n * @return {boolean}\n */\nvar isSameTree = function(p, q) {\n    \n};`,
            '0226': `/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @return {TreeNode}\n */\nvar invertTree = function(root) {\n    \n};`,
            '0110': `/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @return {boolean}\n */\nvar isBalanced = function(root) {\n    \n};`,
            '0111': `/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @return {number}\n */\nvar minDepth = function(root) {\n    \n};`,
            '0094': `/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @return {number[]}\n */\nvar inorderTraversal = function(root) {\n    \n};`,
            '0101': `/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @return {boolean}\n */\nvar isSymmetric = function(root) {\n    \n};`,

            // Dynamic Programming
            '0121': `/**\n * @param {number[]} prices\n * @return {number}\n */\nvar maxProfit = function(prices) {\n    \n};`,
            '0053': `/**\n * @param {number[]} nums\n * @return {number}\n */\nvar maxSubArray = function(nums) {\n    \n};`,
            '0070': `/**\n * @param {number} n\n * @return {number}\n */\nvar climbStairs = function(n) {\n    \n};`,
            '0198': `/**\n * @param {number[]} nums\n * @return {number}\n */\nvar rob = function(nums) {\n    \n};`,
            '0213': `/**\n * @param {number[]} nums\n * @return {number}\n */\nvar rob = function(nums) {\n    \n};`,
            '0322': `/**\n * @param {number[]} coins\n * @param {number} amount\n * @return {number}\n */\nvar coinChange = function(coins, amount) {\n    \n};`,

            // Common array operations
            '0169': `/**\n * @param {number[]} nums\n * @return {number}\n */\nvar majorityElement = function(nums) {\n    \n};`,
            '0088': `/**\n * @param {number[]} nums1\n * @param {number} m\n * @param {number[]} nums2\n * @param {number} n\n * @return {void} Do not return anything, modify nums1 in-place instead.\n */\nvar merge = function(nums1, m, nums2, n) {\n    \n};`,
            '0136': `/**\n * @param {number[]} nums\n * @return {number}\n */\nvar singleNumber = function(nums) {\n    \n};`,
            '0268': `/**\n * @param {number[]} nums\n * @return {number}\n */\nvar missingNumber = function(nums) {\n    \n};`,
            '0283': `/**\n * @param {number[]} nums\n * @return {void} Do not return anything, modify nums in-place instead.\n */\nvar moveZeroes = function(nums) {\n    \n};`,
            '0338': `/**\n * @param {number} n\n * @return {number[]}\n */\nvar countBits = function(n) {\n    \n};`,
            '0202': `/**\n * @param {number} n\n * @return {boolean}\n */\nvar isHappy = function(n) {\n    \n};`,
            '0191': `/**\n * @param {number} n - a positive integer\n * @return {number}\n */\nvar hammingWeight = function(n) {\n    \n};`,

            // String problems
            '0003': `/**\n * @param {string} s\n * @return {number}\n */\nvar lengthOfLongestSubstring = function(s) {\n    \n};`
        };

        return patterns[leetcodeNumber] || this.generateGenericJavaScriptBoilerplate(problemTitle);
    }

    static generateGenericJavaScriptBoilerplate(problemTitle) {
        // Create a generic function name from the title
        const funcName = problemTitle
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ' ')
            .split(' ')
            .filter(word => word.length > 0)
            .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
            .join('');

        return `/**\n * @param {*} input\n * @return {*}\n */\nvar ${funcName} = function(input) {\n    // TODO: Implement ${problemTitle}\n    \n};`;
    }

    static generatePythonBoilerplate(problemId, problemTitle, leetcodeNumber) {
        const patterns = {
            '0001': `class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        `,
            '0217': `class Solution:\n    def containsDuplicate(self, nums: List[int]) -> bool:\n        `,
            '0242': `class Solution:\n    def isAnagram(self, s: str, t: str) -> bool:\n        `,
            '0020': `class Solution:\n    def isValid(self, s: str) -> bool:\n        `,
            '0125': `class Solution:\n    def isPalindrome(self, s: str) -> bool:\n        `,
            '0206': `# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution:\n    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:\n        `,
            '0021': `# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution:\n    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:\n        `,
            '0141': `# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, x):\n#         self.val = x\n#         self.next = None\nclass Solution:\n    def hasCycle(self, head: Optional[ListNode]) -> bool:\n        `,
            '0104': `# Definition for a binary tree node.\n# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution:\n    def maxDepth(self, root: Optional[TreeNode]) -> int:\n        `,
            '0100': `# Definition for a binary tree node.\n# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution:\n    def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:\n        `,
            '0226': `# Definition for a binary tree node.\n# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution:\n    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:\n        `,
            '0121': `class Solution:\n    def maxProfit(self, prices: List[int]) -> int:\n        `,
            '0053': `class Solution:\n    def maxSubArray(self, nums: List[int]) -> int:\n        `,
            '0070': `class Solution:\n    def climbStairs(self, n: int) -> int:\n        `,
            '0003': `class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        `
        };

        return patterns[leetcodeNumber] || this.generateGenericPythonBoilerplate(problemTitle);
    }

    static generateGenericPythonBoilerplate(problemTitle) {
        const funcName = problemTitle
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ' ')
            .split(' ')
            .filter(word => word.length > 0)
            .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
            .join('');

        return `class Solution:\n    def ${funcName}(self, input):\n        # TODO: Implement ${problemTitle}\n        pass`;
    }

    static generateJavaBoilerplate(problemId, problemTitle, leetcodeNumber) {
        const patterns = {
            '0001': `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}`,
            '0217': `class Solution {\n    public boolean containsDuplicate(int[] nums) {\n        \n    }\n}`,
            '0242': `class Solution {\n    public boolean isAnagram(String s, String t) {\n        \n    }\n}`,
            '0020': `class Solution {\n    public boolean isValid(String s) {\n        \n    }\n}`,
            '0206': `/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     int val;\n *     ListNode next;\n *     ListNode() {}\n *     ListNode(int val) { this.val = val; }\n *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n * }\n */\nclass Solution {\n    public ListNode reverseList(ListNode head) {\n        \n    }\n}`,
            '0104': `/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode() {}\n *     TreeNode(int val) { this.val = val; }\n *     TreeNode(int val, TreeNode left, TreeNode right) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\nclass Solution {\n    public int maxDepth(TreeNode root) {\n        \n    }\n}`
        };

        return patterns[leetcodeNumber] || `class Solution {\n    // TODO: Implement ${problemTitle}\n    \n}`;
    }

    static generateCppBoilerplate(problemId, problemTitle, leetcodeNumber) {
        const patterns = {
            '0001': `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};`,
            '0217': `class Solution {\npublic:\n    bool containsDuplicate(vector<int>& nums) {\n        \n    }\n};`,
            '0206': `/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\nclass Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        \n    }\n};`,
            '0104': `/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     TreeNode *left;\n *     TreeNode *right;\n *     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n * };\n */\nclass Solution {\npublic:\n    int maxDepth(TreeNode* root) {\n        \n    }\n};`
        };

        return patterns[leetcodeNumber] || `class Solution {\npublic:\n    // TODO: Implement ${problemTitle}\n    \n};`;
    }

    static generateGoBoilerplate(problemId, problemTitle, leetcodeNumber) {
        const patterns = {
            '0001': `func twoSum(nums []int, target int) []int {\n    \n}`,
            '0217': `func containsDuplicate(nums []int) bool {\n    \n}`,
            '0206': `/**\n * Definition for singly-linked list.\n * type ListNode struct {\n *     Val int\n *     Next *ListNode\n * }\n */\nfunc reverseList(head *ListNode) *ListNode {\n    \n}`,
            '0104': `/**\n * Definition for a binary tree node.\n * type TreeNode struct {\n *     Val int\n *     Left *TreeNode\n *     Right *TreeNode\n * }\n */\nfunc maxDepth(root *TreeNode) int {\n    \n}`
        };

        return patterns[leetcodeNumber] || `// TODO: Implement ${problemTitle}\nfunc solution() {\n    \n}`;
    }
}

module.exports = EnhancedBoilerplateGenerator;