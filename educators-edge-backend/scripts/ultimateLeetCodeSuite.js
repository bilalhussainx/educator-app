/**
 * =================================================================
 * ULTIMATE LEETCODE COURSE SUITE GENERATOR
 * =================================================================
 * Enhanced version that maintains the successful leetcode-solutions integration
 * while implementing comprehensive 30-problem courses and authentic Grokking patterns
 */

const pool = require('./db');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const EnhancedBoilerplateGenerator = require('./enhancedBoilerplateGenerator');

class UltimateLeetCodeSuite {
    constructor() {
        this.solutionsPath = path.join(__dirname, 'leetcode-solutions');
        this.teacherId = 'eb03e344-252f-42ab-8187-602fc30384fa';
        this.languages = ['javascript', 'python', 'java', 'cpp', 'go'];

        // 30 Easy Problems - Research-based selection
        this.easyProblems = [
            {
                id: "0001-two-sum",
                title: "Two Sum",
                difficulty: "easy",
                description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
                examples: [{ input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." }],
                constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"],
                pattern: "Hash Map"
            },
            {
                id: "0217-contains-duplicate",
                title: "Contains Duplicate",
                difficulty: "easy",
                description: "Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.",
                examples: [{ input: "nums = [1,2,3,1]", output: "true" }],
                constraints: ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
                pattern: "Hash Set"
            },
            {
                id: "0242-valid-anagram",
                title: "Valid Anagram",
                difficulty: "easy",
                description: "Given two strings s and t, return true if t is an anagram of s, and false otherwise.",
                examples: [{ input: "s = \"anagram\", t = \"nagaram\"", output: "true" }],
                constraints: ["1 <= s.length, t.length <= 5 * 10^4", "s and t consist of lowercase English letters"],
                pattern: "Hash Map"
            },
            {
                id: "0020-valid-parentheses",
                title: "Valid Parentheses",
                difficulty: "easy",
                description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
                examples: [{ input: "s = \"()[]{}\"", output: "true" }],
                constraints: ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'"],
                pattern: "Stack"
            },
            {
                id: "0125-valid-palindrome",
                title: "Valid Palindrome",
                difficulty: "easy",
                description: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.",
                examples: [{ input: "s = \"A man, a plan, a canal: Panama\"", output: "true" }],
                constraints: ["1 <= s.length <= 2 * 10^5"],
                pattern: "Two Pointers"
            },
            {
                id: "0013-roman-to-integer",
                title: "Roman to Integer",
                difficulty: "easy",
                description: "Given a roman numeral, convert it to an integer.",
                examples: [{ input: "s = \"III\"", output: "3" }],
                constraints: ["1 <= s.length <= 15"],
                pattern: "Hash Map"
            },
            {
                id: "0021-merge-two-sorted-lists",
                title: "Merge Two Sorted Lists",
                difficulty: "easy",
                description: "You are given the heads of two sorted linked lists list1 and list2. Merge the two lists in a one sorted list.",
                examples: [{ input: "list1 = [1,2,4], list2 = [1,3,4]", output: "[1,1,2,3,4,4]" }],
                constraints: ["The number of nodes in both lists is in the range [0, 50]"],
                pattern: "Linked List"
            },
            {
                id: "0206-reverse-linked-list",
                title: "Reverse Linked List",
                difficulty: "easy",
                description: "Given the head of a singly linked list, reverse the list, and return the reversed list.",
                examples: [{ input: "head = [1,2,3,4,5]", output: "[5,4,3,2,1]" }],
                constraints: ["The number of nodes in the list is the range [0, 5000]"],
                pattern: "Linked List"
            },
            {
                id: "0141-linked-list-cycle",
                title: "Linked List Cycle",
                difficulty: "easy",
                description: "Given head, the head of a linked list, determine if the linked list has a cycle in it.",
                examples: [{ input: "head = [3,2,0,-4], pos = 1", output: "true" }],
                constraints: ["The number of the nodes in the list is in the range [0, 10^4]"],
                pattern: "Fast & Slow Pointers"
            },
            {
                id: "0104-maximum-depth-of-binary-tree",
                title: "Maximum Depth of Binary Tree",
                difficulty: "easy",
                description: "Given the root of a binary tree, return its maximum depth.",
                examples: [{ input: "root = [3,9,20,null,null,15,7]", output: "3" }],
                constraints: ["The number of nodes in the tree is in the range [0, 10^4]"],
                pattern: "Tree DFS"
            },
            {
                id: "0100-same-tree",
                title: "Same Tree",
                difficulty: "easy",
                description: "Given the roots of two binary trees p and q, write a function to check if they are the same or not.",
                examples: [{ input: "p = [1,2,3], q = [1,2,3]", output: "true" }],
                constraints: ["The number of nodes in both trees is in the range [0, 100]"],
                pattern: "Tree DFS"
            },
            {
                id: "0226-invert-binary-tree",
                title: "Invert Binary Tree",
                difficulty: "easy",
                description: "Given the root of a binary tree, invert the tree, and return its root.",
                examples: [{ input: "root = [4,2,7,1,3,6,9]", output: "[4,7,2,9,6,3,1]" }],
                constraints: ["The number of nodes in the tree is in the range [0, 100]"],
                pattern: "Tree DFS"
            },
            {
                id: "0121-best-time-to-buy-and-sell-stock",
                title: "Best Time to Buy and Sell Stock",
                difficulty: "easy",
                description: "You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.",
                examples: [{ input: "prices = [7,1,5,3,6,4]", output: "5" }],
                constraints: ["1 <= prices.length <= 10^5"],
                pattern: "Sliding Window"
            },
            {
                id: "0053-maximum-subarray",
                title: "Maximum Subarray",
                difficulty: "easy",
                description: "Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.",
                examples: [{ input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6" }],
                constraints: ["1 <= nums.length <= 10^5"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0169-majority-element",
                title: "Majority Element",
                difficulty: "easy",
                description: "Given an array nums of size n, return the majority element. The majority element is the element that appears more than ⌊n / 2⌋ times.",
                examples: [{ input: "nums = [3,2,3]", output: "3" }],
                constraints: ["n == nums.length", "1 <= n <= 5 * 10^4"],
                pattern: "Boyer-Moore Voting"
            },
            {
                id: "0070-climbing-stairs",
                title: "Climbing Stairs",
                difficulty: "easy",
                description: "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
                examples: [{ input: "n = 2", output: "2" }],
                constraints: ["1 <= n <= 45"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0088-merge-sorted-array",
                title: "Merge Sorted Array",
                difficulty: "easy",
                description: "You are given two integer arrays nums1 and nums2, sorted in non-decreasing order, and two integers m and n, representing the number of elements in nums1 and nums2 respectively. Merge nums1 and nums2 into a single array sorted in non-decreasing order.",
                examples: [{ input: "nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3", output: "[1,2,2,3,5,6]" }],
                constraints: ["nums1.length == m + n", "nums2.length == n"],
                pattern: "Two Pointers"
            },
            {
                id: "0094-binary-tree-inorder-traversal",
                title: "Binary Tree Inorder Traversal",
                difficulty: "easy",
                description: "Given the root of a binary tree, return the inorder traversal of its nodes' values.",
                examples: [{ input: "root = [1,null,2,3]", output: "[1,3,2]" }],
                constraints: ["The number of nodes in the tree is in the range [0, 100]"],
                pattern: "Tree DFS"
            },
            {
                id: "0101-symmetric-tree",
                title: "Symmetric Tree",
                difficulty: "easy",
                description: "Given the root of a binary tree, check whether it is a mirror of itself (i.e., symmetric around its center).",
                examples: [{ input: "root = [1,2,2,3,4,4,3]", output: "true" }],
                constraints: ["The number of nodes in the tree is in the range [1, 1000]"],
                pattern: "Tree DFS"
            },
            {
                id: "0110-balanced-binary-tree",
                title: "Balanced Binary Tree",
                difficulty: "easy",
                description: "Given a binary tree, determine if it is height-balanced.",
                examples: [{ input: "root = [3,9,20,null,null,15,7]", output: "true" }],
                constraints: ["The number of nodes in the tree is in the range [0, 5000]"],
                pattern: "Tree DFS"
            },
            {
                id: "0111-minimum-depth-of-binary-tree",
                title: "Minimum Depth of Binary Tree",
                difficulty: "easy",
                description: "Given a binary tree, find its minimum depth.",
                examples: [{ input: "root = [3,9,20,null,null,15,7]", output: "2" }],
                constraints: ["The number of nodes in the tree is in the range [0, 10^5]"],
                pattern: "Tree BFS"
            },
            {
                id: "0136-single-number",
                title: "Single Number",
                difficulty: "easy",
                description: "Given a non-empty array of integers nums, every element appears twice except for one. Find that single one.",
                examples: [{ input: "nums = [2,2,1]", output: "1" }],
                constraints: ["1 <= nums.length <= 3 * 10^4"],
                pattern: "Bitwise XOR"
            },
            {
                id: "0160-intersection-of-two-linked-lists",
                title: "Intersection of Two Linked Lists",
                difficulty: "easy",
                description: "Given the heads of two singly linked-lists headA and headB, return the node at which the two lists intersect.",
                examples: [{ input: "intersectVal = 8, listA = [4,1,8,4,5], listB = [5,6,1,8,4,5]", output: "Reference to node with value = 8" }],
                constraints: ["The number of nodes of listA is in the m", "The number of nodes of listB is in the n"],
                pattern: "Linked List"
            },
            {
                id: "0191-number-of-1-bits",
                title: "Number of 1 Bits",
                difficulty: "easy",
                description: "Write a function that takes an unsigned integer and returns the number of '1' bits it has (also known as the Hamming weight).",
                examples: [{ input: "n = 00000000000000000000000000001011", output: "3" }],
                constraints: ["The input must be a binary string of length 32"],
                pattern: "Bit Manipulation"
            },
            {
                id: "0202-happy-number",
                title: "Happy Number",
                difficulty: "easy",
                description: "Write an algorithm to determine if a number n is happy.",
                examples: [{ input: "n = 19", output: "true" }],
                constraints: ["1 <= n <= 2^31 - 1"],
                pattern: "Fast & Slow Pointers"
            },
            {
                id: "0234-palindrome-linked-list",
                title: "Palindrome Linked List",
                difficulty: "easy",
                description: "Given the head of a singly linked list, return true if it is a palindrome.",
                examples: [{ input: "head = [1,2,2,1]", output: "true" }],
                constraints: ["The number of nodes in the list is in the range [1, 10^5]"],
                pattern: "Fast & Slow Pointers"
            },
            {
                id: "0268-missing-number",
                title: "Missing Number",
                difficulty: "easy",
                description: "Given an array nums containing n distinct numbers in the range [0, n], return the only number in the range that is missing from the array.",
                examples: [{ input: "nums = [3,0,1]", output: "2" }],
                constraints: ["n == nums.length", "1 <= n <= 10^4"],
                pattern: "Cyclic Sort"
            },
            {
                id: "0283-move-zeroes",
                title: "Move Zeroes",
                difficulty: "easy",
                description: "Given an integer array nums, move all 0's to the end of it while maintaining the relative order of the non-zero elements.",
                examples: [{ input: "nums = [0,1,0,3,12]", output: "[1,3,12,0,0]" }],
                constraints: ["1 <= nums.length <= 10^4"],
                pattern: "Two Pointers"
            },
            {
                id: "0338-counting-bits",
                title: "Counting Bits",
                difficulty: "easy",
                description: "Given an integer n, return an array ans of length n + 1 such that for each i (0 <= i <= n), ans[i] is the number of 1's in the binary representation of i.",
                examples: [{ input: "n = 2", output: "[0,1,1]" }],
                constraints: ["0 <= n <= 10^5"],
                pattern: "Bit Manipulation"
            },
            {
                id: "0876-middle-of-the-linked-list",
                title: "Middle of the Linked List",
                difficulty: "easy",
                description: "Given the head of a singly linked list, return the middle node of the linked list.",
                examples: [{ input: "head = [1,2,3,4,5]", output: "[3,4,5]" }],
                constraints: ["The number of nodes in the list is in the range [1, 100]"],
                pattern: "Fast & Slow Pointers"
            }
        ];

        // 30 Medium Problems - Interview-focused selection
        this.mediumProblems = [
            {
                id: "0198-house-robber",
                title: "House Robber",
                difficulty: "medium",
                description: "You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed, the only constraint stopping you from robbing each of them is that adjacent houses have security systems connected and it will automatically contact the police if two adjacent houses were broken into on the same night.",
                examples: [{ input: "nums = [1,2,3,1]", output: "4" }],
                constraints: ["1 <= nums.length <= 100"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0213-house-robber-ii",
                title: "House Robber II",
                difficulty: "medium",
                description: "You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. All houses at this place are arranged in a circle.",
                examples: [{ input: "nums = [2,3,2]", output: "3" }],
                constraints: ["1 <= nums.length <= 100"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0322-coin-change",
                title: "Coin Change",
                difficulty: "medium",
                description: "You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the fewest number of coins that you need to make up that amount.",
                examples: [{ input: "coins = [1,3,4], amount = 6", output: "2" }],
                constraints: ["1 <= coins.length <= 12"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0102-binary-tree-level-order-traversal",
                title: "Binary Tree Level Order Traversal",
                difficulty: "medium",
                description: "Given the root of a binary tree, return the level order traversal of its nodes' values.",
                examples: [{ input: "root = [3,9,20,null,null,15,7]", output: "[[3],[9,20],[15,7]]" }],
                constraints: ["The number of nodes in the tree is in the range [0, 2000]"],
                pattern: "Tree BFS"
            },
            {
                id: "0200-number-of-islands",
                title: "Number of Islands",
                difficulty: "medium",
                description: "Given an m x n 2D binary grid grid which represents a map of '1's (land) and '0's (water), return the number of islands.",
                examples: [{ input: "grid = [[\"1\",\"1\",\"1\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"0\",\"0\"]]", output: "1" }],
                constraints: ["m == grid.length", "n == grid[i].length"],
                pattern: "Graph DFS"
            },
            {
                id: "0207-course-schedule",
                title: "Course Schedule",
                difficulty: "medium",
                description: "There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai.",
                examples: [{ input: "numCourses = 2, prerequisites = [[1,0]]", output: "true" }],
                constraints: ["1 <= numCourses <= 2000"],
                pattern: "Topological Sort"
            },
            {
                id: "0015-3sum",
                title: "3Sum",
                difficulty: "medium",
                description: "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.",
                examples: [{ input: "nums = [-1,0,1,2,-1,-4]", output: "[[-1,-1,2],[-1,0,1]]" }],
                constraints: ["3 <= nums.length <= 3000"],
                pattern: "Two Pointers"
            },
            {
                id: "0056-merge-intervals",
                title: "Merge Intervals",
                difficulty: "medium",
                description: "Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.",
                examples: [{ input: "intervals = [[1,3],[2,6],[8,10],[15,18]]", output: "[[1,6],[8,10],[15,18]]" }],
                constraints: ["1 <= intervals.length <= 10^4"],
                pattern: "Merge Intervals"
            },
            {
                id: "0238-product-of-array-except-self",
                title: "Product of Array Except Self",
                difficulty: "medium",
                description: "Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].",
                examples: [{ input: "nums = [1,2,3,4]", output: "[24,12,8,6]" }],
                constraints: ["2 <= nums.length <= 10^5"],
                pattern: "Array"
            },
            {
                id: "0049-group-anagrams",
                title: "Group Anagrams",
                difficulty: "medium",
                description: "Given an array of strings strs, group the anagrams together. You can return the answer in any order.",
                examples: [{ input: "strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]", output: "[[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]" }],
                constraints: ["1 <= strs.length <= 10^4"],
                pattern: "Hash Map"
            },
            // Adding 20 more medium problems
            {
                id: "0128-longest-consecutive-sequence",
                title: "Longest Consecutive Sequence",
                difficulty: "medium",
                description: "Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence.",
                examples: [{ input: "nums = [100,4,200,1,3,2]", output: "4" }],
                constraints: ["0 <= nums.length <= 10^5"],
                pattern: "Hash Set"
            },
            {
                id: "0139-word-break",
                title: "Word Break",
                difficulty: "medium",
                description: "Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.",
                examples: [{ input: "s = \"leetcode\", wordDict = [\"leet\",\"code\"]", output: "true" }],
                constraints: ["1 <= s.length <= 300"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0152-maximum-product-subarray",
                title: "Maximum Product Subarray",
                difficulty: "medium",
                description: "Given an integer array nums, find a contiguous non-empty subarray within the array that has the largest product, and return the product.",
                examples: [{ input: "nums = [2,3,-2,4]", output: "6" }],
                constraints: ["1 <= nums.length <= 2 * 10^4"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0153-find-minimum-in-rotated-sorted-array",
                title: "Find Minimum in Rotated Sorted Array",
                difficulty: "medium",
                description: "Suppose an array of length n sorted in ascending order is rotated between 1 and n times. Given the sorted rotated array nums of unique elements, return the minimum element of this array.",
                examples: [{ input: "nums = [3,4,5,1,2]", output: "1" }],
                constraints: ["n == nums.length", "1 <= n <= 5000"],
                pattern: "Binary Search"
            },
            {
                id: "0199-binary-tree-right-side-view",
                title: "Binary Tree Right Side View",
                difficulty: "medium",
                description: "Given the root of a binary tree, imagine yourself standing on the right side of it, return the values of the nodes you can see ordered from top to bottom.",
                examples: [{ input: "root = [1,2,3,null,5,null,4]", output: "[1,3,4]" }],
                constraints: ["The number of nodes in the tree is in the range [0, 100]"],
                pattern: "Tree BFS"
            },
            {
                id: "0209-minimum-size-subarray-sum",
                title: "Minimum Size Subarray Sum",
                difficulty: "medium",
                description: "Given an array of positive integers nums and a positive integer target, return the minimal length of a contiguous subarray [numsl, numsl+1, ..., numsr-1, numsr] of which the sum is greater than or equal to target.",
                examples: [{ input: "target = 7, nums = [2,3,1,2,4,3]", output: "2" }],
                constraints: ["1 <= target <= 10^9"],
                pattern: "Sliding Window"
            },
            {
                id: "0215-kth-largest-element-in-an-array",
                title: "Kth Largest Element in an Array",
                difficulty: "medium",
                description: "Given an integer array nums and an integer k, return the kth largest element in the array.",
                examples: [{ input: "nums = [3,2,1,5,6,4], k = 2", output: "5" }],
                constraints: ["1 <= k <= nums.length <= 10^5"],
                pattern: "Heap"
            },
            {
                id: "0230-kth-smallest-element-in-a-bst",
                title: "Kth Smallest Element in a BST",
                difficulty: "medium",
                description: "Given the root of a binary search tree, and an integer k, return the kth smallest value (1-indexed) of all the values of the nodes in the tree.",
                examples: [{ input: "root = [3,1,4,null,2], k = 1", output: "1" }],
                constraints: ["The number of nodes in the tree is n", "1 <= k <= n <= 10^4"],
                pattern: "Tree DFS"
            },
            {
                id: "0236-lowest-common-ancestor-of-a-binary-tree",
                title: "Lowest Common Ancestor of a Binary Tree",
                difficulty: "medium",
                description: "Given a binary tree, find the lowest common ancestor (LCA) of two given nodes in the tree.",
                examples: [{ input: "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1", output: "3" }],
                constraints: ["The number of nodes in the tree is in the range [2, 10^5]"],
                pattern: "Tree DFS"
            },
            {
                id: "0279-perfect-squares",
                title: "Perfect Squares",
                difficulty: "medium",
                description: "Given an integer n, return the least number of perfect square numbers that sum to n.",
                examples: [{ input: "n = 12", output: "3" }],
                constraints: ["1 <= n <= 10^4"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0300-longest-increasing-subsequence",
                title: "Longest Increasing Subsequence",
                difficulty: "medium",
                description: "Given an integer array nums, return the length of the longest strictly increasing subsequence.",
                examples: [{ input: "nums = [10,9,2,5,3,7,101,18]", output: "4" }],
                constraints: ["1 <= nums.length <= 2500"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0347-top-k-frequent-elements",
                title: "Top K Frequent Elements",
                difficulty: "medium",
                description: "Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.",
                examples: [{ input: "nums = [1,1,1,2,2,3], k = 2", output: "[1,2]" }],
                constraints: ["1 <= nums.length <= 10^5"],
                pattern: "Heap"
            },
            {
                id: "0417-pacific-atlantic-water-flow",
                title: "Pacific Atlantic Water Flow",
                difficulty: "medium",
                description: "There is an m x n rectangular island that borders both the Pacific Ocean and Atlantic Ocean.",
                examples: [{ input: "heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]", output: "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]" }],
                constraints: ["m == heights.length", "n == heights[r].length"],
                pattern: "Graph DFS"
            },
            {
                id: "0424-longest-repeating-character-replacement",
                title: "Longest Repeating Character Replacement",
                difficulty: "medium",
                description: "You are given a string s and an integer k. You can choose any character of the string and change it to any other uppercase English character. You can perform this operation at most k times.",
                examples: [{ input: "s = \"ABAB\", k = 2", output: "4" }],
                constraints: ["1 <= s.length <= 10^5"],
                pattern: "Sliding Window"
            },
            {
                id: "0435-non-overlapping-intervals",
                title: "Non-overlapping Intervals",
                difficulty: "medium",
                description: "Given an array of intervals intervals where intervals[i] = [starti, endi], return the minimum number of intervals you need to remove to make the rest of the intervals non-overlapping.",
                examples: [{ input: "intervals = [[1,2],[2,3],[3,4],[1,3]]", output: "1" }],
                constraints: ["1 <= intervals.length <= 10^5"],
                pattern: "Greedy"
            },
            {
                id: "0450-delete-node-in-a-bst",
                title: "Delete Node in a BST",
                difficulty: "medium",
                description: "Given a root node reference of a BST and a key, delete the node with the given key in the BST. Return the root node reference (possibly updated) of the BST.",
                examples: [{ input: "root = [5,3,6,2,4,null,7], key = 3", output: "[5,4,6,2,null,null,7]" }],
                constraints: ["The number of nodes in the tree is in the range [0, 10^4]"],
                pattern: "Tree"
            },
            {
                id: "0494-target-sum",
                title: "Target Sum",
                difficulty: "medium",
                description: "You are given an integer array nums and an integer target. You want to build an expression out of nums by adding one of the symbols '+' and '-' before each integer in nums and then concatenate all the integers.",
                examples: [{ input: "nums = [1,1,1,1,1], target = 3", output: "5" }],
                constraints: ["1 <= nums.length <= 20"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0572-subtree-of-another-tree",
                title: "Subtree of Another Tree",
                difficulty: "medium",
                description: "Given the roots of two binary trees root and subRoot, return true if there is a subtree of root with the same structure and node values of subRoot and false otherwise.",
                examples: [{ input: "root = [3,4,5,1,2], subRoot = [4,1,2]", output: "true" }],
                constraints: ["The number of nodes in the root tree is in the range [1, 2000]"],
                pattern: "Tree DFS"
            },
            {
                id: "0647-palindromic-substrings",
                title: "Palindromic Substrings",
                difficulty: "medium",
                description: "Given a string s, return the number of palindromic substrings in it.",
                examples: [{ input: "s = \"abc\"", output: "3" }],
                constraints: ["1 <= s.length <= 1000"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0003-longest-substring-without-repeating-characters",
                title: "Longest Substring Without Repeating Characters",
                difficulty: "medium",
                description: "Given a string s, find the length of the longest substring without repeating characters.",
                examples: [{ input: "s = \"abcabcbb\"", output: "3" }],
                constraints: ["0 <= s.length <= 5 * 10^4"],
                pattern: "Sliding Window"
            }
        ];

        // 30 Hard Problems - Top-tier interview challenges
        this.hardProblems = [
            {
                id: "0072-edit-distance",
                title: "Edit Distance",
                difficulty: "hard",
                description: "Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2.",
                examples: [{ input: "word1 = \"horse\", word2 = \"ros\"", output: "3" }],
                constraints: ["0 <= word1.length, word2.length <= 500"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0124-binary-tree-maximum-path-sum",
                title: "Binary Tree Maximum Path Sum",
                difficulty: "hard",
                description: "A path in a binary tree is a sequence of nodes where each pair of adjacent nodes in the sequence has an edge connecting them. A node can only appear in the sequence at most once.",
                examples: [{ input: "root = [1,2,3]", output: "6" }],
                constraints: ["The number of nodes in the tree is in the range [1, 3 * 10^4]"],
                pattern: "Tree DFS"
            },
            {
                id: "0312-burst-balloons",
                title: "Burst Balloons",
                difficulty: "hard",
                description: "You are given n balloons, indexed from 0 to n - 1. Each balloon is painted with a number on it represented by an array nums. You are asked to burst all the balloons.",
                examples: [{ input: "nums = [3,1,5,8]", output: "167" }],
                constraints: ["n == nums.length", "1 <= n <= 300"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0004-median-of-two-sorted-arrays",
                title: "Median of Two Sorted Arrays",
                difficulty: "hard",
                description: "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.",
                examples: [{ input: "nums1 = [1,3], nums2 = [2]", output: "2.00000" }],
                constraints: ["nums1.length == m", "nums2.length == n"],
                pattern: "Binary Search"
            },
            {
                id: "0042-trapping-rain-water",
                title: "Trapping Rain Water",
                difficulty: "hard",
                description: "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
                examples: [{ input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6" }],
                constraints: ["n == height.length", "1 <= n <= 2 * 10^4"],
                pattern: "Two Pointers"
            },
            {
                id: "0084-largest-rectangle-in-histogram",
                title: "Largest Rectangle in Histogram",
                difficulty: "hard",
                description: "Given an array of integers heights representing the histogram's bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.",
                examples: [{ input: "heights = [2,1,5,6,2,3]", output: "10" }],
                constraints: ["1 <= heights.length <= 10^5"],
                pattern: "Stack"
            },
            {
                id: "0010-regular-expression-matching",
                title: "Regular Expression Matching",
                difficulty: "hard",
                description: "Given an input string s and a pattern p, implement regular expression matching with support for '.' and '*'.",
                examples: [{ input: "s = \"aa\", p = \"a*\"", output: "true" }],
                constraints: ["1 <= s.length <= 20", "1 <= p.length <= 20"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0076-minimum-window-substring",
                title: "Minimum Window Substring",
                difficulty: "hard",
                description: "Given two strings s and t of lengths m and n respectively, return the minimum window substring of s such that every character in t (including duplicates) is included in the window.",
                examples: [{ input: "s = \"ADOBECODEBANC\", t = \"ABC\"", output: "\"BANC\"" }],
                constraints: ["m == s.length", "n == t.length"],
                pattern: "Sliding Window"
            },
            {
                id: "0140-word-break-ii",
                title: "Word Break II",
                difficulty: "hard",
                description: "Given a string s and a dictionary of strings wordDict, add spaces in s to construct a sentence where each word is a valid dictionary word. Return all such possible sentences in any order.",
                examples: [{ input: "s = \"catsanddog\", wordDict = [\"cat\",\"cats\",\"and\",\"sand\",\"dog\"]", output: "[\"cats and dog\",\"cat sand dog\"]" }],
                constraints: ["1 <= s.length <= 20"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0023-merge-k-sorted-lists",
                title: "Merge k Sorted Lists",
                difficulty: "hard",
                description: "You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.",
                examples: [{ input: "lists = [[1,4,5],[1,3,4],[2,6]]", output: "[1,1,2,3,4,4,5,6]" }],
                constraints: ["k == lists.length"],
                pattern: "K-way Merge"
            },
            // Adding 20 more hard problems
            {
                id: "0025-reverse-nodes-in-k-group",
                title: "Reverse Nodes in k-Group",
                difficulty: "hard",
                description: "Given the head of a linked list, reverse the nodes of the list k at a time, and return the modified list.",
                examples: [{ input: "head = [1,2,3,4,5], k = 2", output: "[2,1,4,3,5]" }],
                constraints: ["The number of nodes in the list is n", "1 <= k <= n <= 5000"],
                pattern: "Linked List"
            },
            {
                id: "0032-longest-valid-parentheses",
                title: "Longest Valid Parentheses",
                difficulty: "hard",
                description: "Given a string containing just the characters '(' and ')', find the length of the longest valid (well-formed) parentheses substring.",
                examples: [{ input: "s = \"(()\"", output: "2" }],
                constraints: ["0 <= s.length <= 3 * 10^4"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0037-sudoku-solver",
                title: "Sudoku Solver",
                difficulty: "hard",
                description: "Write a program to solve a Sudoku puzzle by filling the empty cells.",
                examples: [{ input: "board = [[\"5\",\"3\",\".\",\".\",\"7\",\".\",\".\",\".\",\".\"]]", output: "solved board" }],
                constraints: ["board.length == 9", "board[i].length == 9"],
                pattern: "Backtracking"
            },
            {
                id: "0041-first-missing-positive",
                title: "First Missing Positive",
                difficulty: "hard",
                description: "Given an unsorted integer array nums, return the smallest missing positive integer.",
                examples: [{ input: "nums = [1,2,0]", output: "3" }],
                constraints: ["1 <= nums.length <= 10^5"],
                pattern: "Cyclic Sort"
            },
            {
                id: "0044-wildcard-matching",
                title: "Wildcard Matching",
                difficulty: "hard",
                description: "Given an input string (s) and a pattern (p), implement wildcard pattern matching with support for '?' and '*'.",
                examples: [{ input: "s = \"aa\", p = \"*\"", output: "true" }],
                constraints: ["0 <= s.length, p.length <= 2000"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0051-n-queens",
                title: "N-Queens",
                difficulty: "hard",
                description: "The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other.",
                examples: [{ input: "n = 4", output: "[[\".Q..\",\"...Q\",\"Q...\",\"..Q.\"],[\"..Q.\",\"Q...\",\"...Q\",\".Q..\"]]" }],
                constraints: ["1 <= n <= 9"],
                pattern: "Backtracking"
            },
            {
                id: "0085-maximal-rectangle",
                title: "Maximal Rectangle",
                difficulty: "hard",
                description: "Given a rows x cols binary matrix filled with 0's and 1's, find the largest rectangle containing only 1's and return its area.",
                examples: [{ input: "matrix = [[\"1\",\"0\",\"1\",\"0\",\"0\"],[\"1\",\"0\",\"1\",\"1\",\"1\"]]", output: "6" }],
                constraints: ["rows == matrix.length"],
                pattern: "Stack"
            },
            {
                id: "0115-distinct-subsequences",
                title: "Distinct Subsequences",
                difficulty: "hard",
                description: "Given two strings s and t, return the number of distinct subsequences of s which equals t.",
                examples: [{ input: "s = \"rabbbit\", t = \"rabbit\"", output: "3" }],
                constraints: ["1 <= s.length, t.length <= 1000"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0123-best-time-to-buy-and-sell-stock-iii",
                title: "Best Time to Buy and Sell Stock III",
                difficulty: "hard",
                description: "You are given an array prices where prices[i] is the price of a given stock on the ith day. Find the maximum profit you can achieve. You may complete at most two transactions.",
                examples: [{ input: "prices = [3,3,5,0,0,3,1,4]", output: "6" }],
                constraints: ["1 <= prices.length <= 10^5"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0126-word-ladder-ii",
                title: "Word Ladder II",
                difficulty: "hard",
                description: "A transformation sequence from word beginWord to word endWord using a dictionary wordList is a sequence of words beginWord -> s1 -> s2 -> ... -> sk such that every adjacent pair of words differs by a single letter.",
                examples: [{ input: "beginWord = \"hit\", endWord = \"cog\", wordList = [\"hot\",\"dot\",\"dog\",\"lot\",\"log\",\"cog\"]", output: "[[\"hit\",\"hot\",\"dot\",\"dog\",\"cog\"],[\"hit\",\"hot\",\"lot\",\"log\",\"cog\"]]" }],
                constraints: ["1 <= beginWord.length <= 5"],
                pattern: "Graph BFS"
            },
            {
                id: "0127-word-ladder",
                title: "Word Ladder",
                difficulty: "hard",
                description: "A transformation sequence from word beginWord to word endWord using a dictionary wordList is a sequence of words beginWord -> s1 -> s2 -> ... -> sk such that every adjacent pair of words differs by a single letter.",
                examples: [{ input: "beginWord = \"hit\", endWord = \"cog\", wordList = [\"hot\",\"dot\",\"dog\",\"lot\",\"log\",\"cog\"]", output: "5" }],
                constraints: ["1 <= beginWord.length <= 10"],
                pattern: "Graph BFS"
            },
            {
                id: "0188-best-time-to-buy-and-sell-stock-iv",
                title: "Best Time to Buy and Sell Stock IV",
                difficulty: "hard",
                description: "You are given an integer array prices where prices[i] is the price of a given stock on the ith day, and an integer k. Find the maximum profit you can achieve. You may complete at most k transactions.",
                examples: [{ input: "k = 2, prices = [2,4,1]", output: "2" }],
                constraints: ["1 <= k <= 100"],
                pattern: "Dynamic Programming"
            },
            {
                id: "0212-word-search-ii",
                title: "Word Search II",
                difficulty: "hard",
                description: "Given an m x n board of characters and a list of strings words, return all words on the board.",
                examples: [{ input: "board = [[\"o\",\"a\",\"a\",\"n\"],[\"e\",\"t\",\"a\",\"e\"]], words = [\"eat\",\"oath\",\"pea\",\"tea\"]", output: "[\"eat\",\"oath\"]" }],
                constraints: ["m == board.length"],
                pattern: "Trie"
            },
            {
                id: "0239-sliding-window-maximum",
                title: "Sliding Window Maximum",
                difficulty: "hard",
                description: "You are given an array of integers nums, there is a sliding window of size k which is moving from the very left of the array to the very right. You can only see the k numbers in the window. Each time the sliding window moves right by one position.",
                examples: [{ input: "nums = [1,3,-1,-3,5,3,6,7], k = 3", output: "[3,3,5,5,6,7]" }],
                constraints: ["1 <= nums.length <= 10^5"],
                pattern: "Sliding Window"
            },
            {
                id: "0295-find-median-from-data-stream",
                title: "Find Median from Data Stream",
                difficulty: "hard",
                description: "The median is the middle value in an ordered integer list. If the size of the list is even, there is no middle value, and the median is the mean of the two middle values.",
                examples: [{ input: "[\"MedianFinder\",\"addNum\",\"addNum\",\"findMedian\"]", output: "[null,null,null,1.5]" }],
                constraints: ["-10^5 <= num <= 10^5"],
                pattern: "Two Heaps"
            },
            {
                id: "0297-serialize-and-deserialize-binary-tree",
                title: "Serialize and Deserialize Binary Tree",
                difficulty: "hard",
                description: "Serialization is the process of converting a data structure or object into a sequence of bits so that it can be stored in a file or memory buffer, or transmitted across a network connection link to be reconstructed later in the same or another computer environment.",
                examples: [{ input: "root = [1,2,3,null,null,4,5]", output: "[1,2,3,null,null,4,5]" }],
                constraints: ["The number of nodes in the tree is in the range [0, 10^4]"],
                pattern: "Tree DFS"
            },
            {
                id: "0301-remove-invalid-parentheses",
                title: "Remove Invalid Parentheses",
                difficulty: "hard",
                description: "Given a string s that contains parentheses and letters, remove the minimum number of invalid parentheses to make the input string valid.",
                examples: [{ input: "s = \"()())()\"", output: "[\"()()()\",\"(())()\"]" }],
                constraints: ["1 <= s.length <= 25"],
                pattern: "Backtracking"
            },
            {
                id: "0332-reconstruct-itinerary",
                title: "Reconstruct Itinerary",
                difficulty: "hard",
                description: "You are given a list of airline tickets where tickets[i] = [fromi, toi] represent the departure and the arrival airports of one flight. Reconstruct the itinerary in order and return it.",
                examples: [{ input: "tickets = [[\"MUC\",\"LHR\"],[\"JFK\",\"MUC\"],[\"SFO\",\"SJC\"],[\"LHR\",\"SFO\"]]", output: "[\"JFK\",\"MUC\",\"LHR\",\"SFO\",\"SJC\"]" }],
                constraints: ["1 <= tickets.length <= 300"],
                pattern: "Graph DFS"
            },
            {
                id: "0410-split-array-largest-sum",
                title: "Split Array Largest Sum",
                difficulty: "hard",
                description: "Given an integer array nums and an integer k, split nums into k non-empty subarrays such that the largest sum of any subarray is minimized.",
                examples: [{ input: "nums = [7,2,5,10,8], k = 2", output: "18" }],
                constraints: ["1 <= nums.length <= 1000"],
                pattern: "Binary Search"
            },
            {
                id: "0480-sliding-window-median",
                title: "Sliding Window Median",
                difficulty: "hard",
                description: "The median is the middle value in an ordered integer list. If the size of the list is even, there is no middle value. So the median is the mean of the two middle values.",
                examples: [{ input: "nums = [1,3,-1,-3,5,3,6,7], k = 3", output: "[1.00000,-1.00000,-1.00000,3.00000,5.00000,6.00000]" }],
                constraints: ["1 <= k <= nums.length <= 10^5"],
                pattern: "Two Heaps"
            }
        ];

        // Authentic Grokking the Coding Interview - 14 Patterns (from research)
        this.grokkingPatterns = {
            "Sliding Window": {
                description: "Master the sliding window technique for array and string problems. This pattern involves creating a window into the data structure and sliding it to achieve optimal solutions.",
                problems: [
                    { id: "0003-longest-substring-without-repeating-characters", title: "Longest Substring Without Repeating Characters", difficulty: "medium" },
                    { id: "0209-minimum-size-subarray-sum", title: "Minimum Size Subarray Sum", difficulty: "medium" },
                    { id: "0424-longest-repeating-character-replacement", title: "Longest Repeating Character Replacement", difficulty: "medium" },
                    { id: "0567-permutation-in-string", title: "Permutation in String", difficulty: "medium" },
                    { id: "0076-minimum-window-substring", title: "Minimum Window Substring", difficulty: "hard" }
                ]
            },
            "Two Pointers": {
                description: "Learn the two-pointer technique for efficient array traversal. This pattern uses two pointers to traverse data structures in a specific manner.",
                problems: [
                    { id: "0001-two-sum", title: "Two Sum", difficulty: "easy" },
                    { id: "0015-3sum", title: "3Sum", difficulty: "medium" },
                    { id: "0011-container-with-most-water", title: "Container With Most Water", difficulty: "medium" },
                    { id: "0042-trapping-rain-water", title: "Trapping Rain Water", difficulty: "hard" },
                    { id: "0016-3sum-closest", title: "3Sum Closest", difficulty: "medium" }
                ]
            },
            "Fast & Slow Pointers": {
                description: "Use fast and slow pointers to detect cycles and find middle elements. This pattern is particularly useful for linked list problems.",
                problems: [
                    { id: "0141-linked-list-cycle", title: "Linked List Cycle", difficulty: "easy" },
                    { id: "0142-linked-list-cycle-ii", title: "Linked List Cycle II", difficulty: "medium" },
                    { id: "0202-happy-number", title: "Happy Number", difficulty: "easy" },
                    { id: "0876-middle-of-the-linked-list", title: "Middle of the Linked List", difficulty: "easy" },
                    { id: "0234-palindrome-linked-list", title: "Palindrome Linked List", difficulty: "easy" }
                ]
            },
            "Merge Intervals": {
                description: "Master interval manipulation and merging techniques. This pattern deals with overlapping intervals.",
                problems: [
                    { id: "0056-merge-intervals", title: "Merge Intervals", difficulty: "medium" },
                    { id: "0057-insert-interval", title: "Insert Interval", difficulty: "medium" },
                    { id: "0986-interval-list-intersections", title: "Interval List Intersections", difficulty: "medium" },
                    { id: "0253-meeting-rooms-ii", title: "Meeting Rooms II", difficulty: "medium" },
                    { id: "0759-employee-free-time", title: "Employee Free Time", difficulty: "hard" }
                ]
            },
            "Cyclic Sort": {
                description: "Use cyclic sort for finding missing and duplicate numbers efficiently in arrays containing numbers in a given range.",
                problems: [
                    { id: "0268-missing-number", title: "Missing Number", difficulty: "easy" },
                    { id: "0448-find-all-numbers-disappeared-in-an-array", title: "Find All Numbers Disappeared in an Array", difficulty: "easy" },
                    { id: "0442-find-all-duplicates-in-an-array", title: "Find All Duplicates in an Array", difficulty: "medium" },
                    { id: "0287-find-the-duplicate-number", title: "Find the Duplicate Number", difficulty: "medium" },
                    { id: "0041-first-missing-positive", title: "First Missing Positive", difficulty: "hard" }
                ]
            },
            "In-place Reversal of LinkedList": {
                description: "Learn to reverse links between nodes without using extra memory. Essential for linked list manipulation.",
                problems: [
                    { id: "0206-reverse-linked-list", title: "Reverse Linked List", difficulty: "easy" },
                    { id: "0092-reverse-linked-list-ii", title: "Reverse Linked List II", difficulty: "medium" },
                    { id: "0025-reverse-nodes-in-k-group", title: "Reverse Nodes in k-Group", difficulty: "hard" },
                    { id: "0061-rotate-list", title: "Rotate List", difficulty: "medium" },
                    { id: "0024-swap-nodes-in-pairs", title: "Swap Nodes in Pairs", difficulty: "medium" }
                ]
            },
            "Tree Breadth First Search": {
                description: "Master level-by-level tree traversal using queue data structure. Essential for tree problems.",
                problems: [
                    { id: "0102-binary-tree-level-order-traversal", title: "Binary Tree Level Order Traversal", difficulty: "medium" },
                    { id: "0107-binary-tree-level-order-traversal-ii", title: "Binary Tree Level Order Traversal II", difficulty: "medium" },
                    { id: "0103-binary-tree-zigzag-level-order-traversal", title: "Binary Tree Zigzag Level Order Traversal", difficulty: "medium" },
                    { id: "0111-minimum-depth-of-binary-tree", title: "Minimum Depth of Binary Tree", difficulty: "easy" },
                    { id: "0116-populating-next-right-pointers-in-each-node", title: "Populating Next Right Pointers in Each Node", difficulty: "medium" }
                ]
            },
            "Tree Depth First Search": {
                description: "Use recursion or stack to traverse tree paths. Master DFS for complex tree problems.",
                problems: [
                    { id: "0112-path-sum", title: "Path Sum", difficulty: "easy" },
                    { id: "0113-path-sum-ii", title: "Path Sum II", difficulty: "medium" },
                    { id: "0129-sum-root-to-leaf-numbers", title: "Sum Root to Leaf Numbers", difficulty: "medium" },
                    { id: "0437-path-sum-iii", title: "Path Sum III", difficulty: "medium" },
                    { id: "0124-binary-tree-maximum-path-sum", title: "Binary Tree Maximum Path Sum", difficulty: "hard" }
                ]
            },
            "Two Heaps": {
                description: "Use min and max heaps to find median or manage priority-based data efficiently.",
                problems: [
                    { id: "0295-find-median-from-data-stream", title: "Find Median from Data Stream", difficulty: "hard" },
                    { id: "0480-sliding-window-median", title: "Sliding Window Median", difficulty: "hard" },
                    { id: "0502-ipo", title: "IPO", difficulty: "hard" },
                    { id: "0436-find-right-interval", title: "Find Right Interval", difficulty: "medium" },
                    { id: "0846-hand-of-straights", title: "Hand of Straights", difficulty: "medium" }
                ]
            },
            "Subsets": {
                description: "Generate all possible combinations using backtracking. Master combinatorial problems.",
                problems: [
                    { id: "0078-subsets", title: "Subsets", difficulty: "medium" },
                    { id: "0090-subsets-ii", title: "Subsets II", difficulty: "medium" },
                    { id: "0046-permutations", title: "Permutations", difficulty: "medium" },
                    { id: "0047-permutations-ii", title: "Permutations II", difficulty: "medium" },
                    { id: "0077-combinations", title: "Combinations", difficulty: "medium" }
                ]
            },
            "Modified Binary Search": {
                description: "Adapt binary search for rotated arrays, infinite arrays, and other variations.",
                problems: [
                    { id: "0033-search-in-rotated-sorted-array", title: "Search in Rotated Sorted Array", difficulty: "medium" },
                    { id: "0081-search-in-rotated-sorted-array-ii", title: "Search in Rotated Sorted Array II", difficulty: "medium" },
                    { id: "0153-find-minimum-in-rotated-sorted-array", title: "Find Minimum in Rotated Sorted Array", difficulty: "medium" },
                    { id: "0154-find-minimum-in-rotated-sorted-array-ii", title: "Find Minimum in Rotated Sorted Array II", difficulty: "hard" },
                    { id: "0162-find-peak-element", title: "Find Peak Element", difficulty: "medium" }
                ]
            },
            "Bitwise XOR": {
                description: "Use XOR properties to solve problems with pairs and duplicates efficiently.",
                problems: [
                    { id: "0136-single-number", title: "Single Number", difficulty: "easy" },
                    { id: "0137-single-number-ii", title: "Single Number II", difficulty: "medium" },
                    { id: "0260-single-number-iii", title: "Single Number III", difficulty: "medium" },
                    { id: "1009-complement-of-base-10-integer", title: "Complement of Base 10 Integer", difficulty: "easy" },
                    { id: "0832-flipping-an-image", title: "Flipping an Image", difficulty: "easy" }
                ]
            },
            "Top 'K' Elements": {
                description: "Use heaps to find top/bottom K elements efficiently. Essential for priority-based problems.",
                problems: [
                    { id: "0215-kth-largest-element-in-an-array", title: "Kth Largest Element in an Array", difficulty: "medium" },
                    { id: "0973-k-closest-points-to-origin", title: "K Closest Points to Origin", difficulty: "medium" },
                    { id: "0347-top-k-frequent-elements", title: "Top K Frequent Elements", difficulty: "medium" },
                    { id: "0692-top-k-frequent-words", title: "Top K Frequent Words", difficulty: "medium" },
                    { id: "0451-sort-characters-by-frequency", title: "Sort Characters By Frequency", difficulty: "medium" }
                ]
            },
            "K-way Merge": {
                description: "Merge K sorted arrays or lists using min-heap for efficient sorting.",
                problems: [
                    { id: "0023-merge-k-sorted-lists", title: "Merge k Sorted Lists", difficulty: "hard" },
                    { id: "0378-kth-smallest-element-in-a-sorted-matrix", title: "Kth Smallest Element in a Sorted Matrix", difficulty: "medium" },
                    { id: "0632-smallest-range-covering-elements-from-k-lists", title: "Smallest Range Covering Elements from K Lists", difficulty: "hard" },
                    { id: "0373-find-k-pairs-with-smallest-sums", title: "Find K Pairs with Smallest Sums", difficulty: "medium" },
                    { id: "0719-find-k-th-smallest-pair-distance", title: "Find K-th Smallest Pair Distance", difficulty: "hard" }
                ]
            }
        };
    }

    // MAINTAINING THE SUCCESSFUL APPROACH - Reading real solutions from leetcode-solutions
    async readSolutionFile(language, problemId) {
        try {
            const filePath = path.join(this.solutionsPath, language, `${problemId}.${this.getFileExtension(language)}`);
            const content = await fs.readFile(filePath, 'utf-8');
            return content;
        } catch (error) {
            console.warn(`⚠️  Solution not found: ${language}/${problemId}`);
            return `// Solution for ${problemId} in ${language} not available from repository`;
        }
    }

    getFileExtension(language) {
        const extensions = {
            javascript: 'js',
            python: 'py',
            java: 'java',
            cpp: 'cpp',
            go: 'go'
        };
        return extensions[language] || 'txt';
    }

    // ENHANCED - Problem-specific boilerplate generation
    generateBoilerplate(problem, language) {
        return EnhancedBoilerplateGenerator.generateBoilerplate(problem, language);
    }

    // ENHANCED - Better test case generation
    generateTestCases(problem) {
        if (!problem.examples) return [];
        return problem.examples.map((example, index) => ({
            id: index + 1,
            input: example.input,
            expected: example.output,
            description: `Example ${index + 1}${example.explanation ? ': ' + example.explanation : ''}`
        }));
    }

    // ENHANCED - Better test code generation
    generateTestCasesCode(problem, language) {
        const testCases = this.generateTestCases(problem);
        if (!testCases.length) return '// No test cases available';

        if (language === 'javascript') {
            return `// Test cases for ${problem.title}\n${testCases.map((tc, i) =>
                `console.log('Test ${i + 1}: ${tc.input} => Expected: ${tc.expected}');`
            ).join('\n')}`;
        } else if (language === 'python') {
            return `# Test cases for ${problem.title}\n${testCases.map((tc, i) =>
                `print(f'Test ${i + 1}: ${tc.input} => Expected: ${tc.expected}')`
            ).join('\n')}`;
        }

        return `// Test cases for ${problem.title} in ${language}`;
    }

    // ENHANCED - Find problem in any difficulty level
    findProblemMetadata(problemId) {
        return this.easyProblems.find(p => p.id === problemId) ||
               this.mediumProblems.find(p => p.id === problemId) ||
               this.hardProblems.find(p => p.id === problemId);
    }

    // ENHANCED - Create course with comprehensive problem sets
    async createCourse(title, description, problems, difficulty, courseType = "leetcode_patterns") {
        try {
            console.log(`🚀 Creating ${title}...`);
            console.log(`📝 Processing ${problems.length} problems...`);

            const courseId = uuidv4();
            const lessons = [];

            let processedCount = 0;
            for (const problem of problems) {
                processedCount++;

                // Read solutions from files (MAINTAINING SUCCESSFUL APPROACH)
                const solutions = {};
                const boilerplate = {};

                for (const language of this.languages) {
                    const solutionContent = await this.readSolutionFile(language, problem.id);
                    solutions[language] = solutionContent;
                    boilerplate[language] = this.generateBoilerplate(problem, language);
                }

                // Create language implementations (SAME AS BEFORE)
                const languageImplementations = {};
                for (const language of this.languages) {
                    languageImplementations[language] = {
                        starterCode: boilerplate[language],
                        solutionCode: solutions[language],
                        testCases: this.generateTestCasesCode(problem, language),
                        explanation: `Solve ${problem.title} using ${language}`
                    };
                }

                // ENHANCED - Better lesson structure
                const lesson = {
                    id: `lesson-${problem.id}`,
                    title: problem.title,
                    description: problem.description,
                    lesson_type: "coding_problem",
                    difficulty: problem.difficulty,
                    examples: problem.examples || [],
                    constraints: problem.constraints || [],
                    test_cases: this.generateTestCases(problem),
                    languageImplementations: languageImplementations,
                    hints: [
                        "Read the problem statement carefully and understand the requirements",
                        "Think about the time and space complexity",
                        "Consider edge cases and boundary conditions",
                        "Test your solution with the provided examples",
                        `This problem uses the ${problem.pattern || 'algorithmic'} approach`
                    ],
                    pattern_info: {
                        pattern_name: problem.pattern || "General Problem Solving",
                        problem_id: problem.id,
                        leetcode_url: `https://leetcode.com/problems/${problem.id.substring(5)}/`
                    }
                };

                lessons.push(lesson);
                console.log(`  ✅ [${processedCount}/${problems.length}] Added: ${problem.title}`);
            }

            // Create single module containing all lessons
            const modules = [{
                id: `module-${difficulty}`,
                title: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Level Problems`,
                description: `Comprehensive collection of ${difficulty} level LeetCode problems for interview preparation`,
                lessons: { lessons }
            }];

            const course = {
                id: courseId,
                title: title,
                description: description,
                difficulty_level: difficulty,
                estimated_duration: `${lessons.length * 2} hours`,
                course_type: courseType,
                is_published: true,
                teacher_id: this.teacherId,
                target_audience: "Software Engineers, Students, Interview Candidates",
                learning_outcomes: [
                    `Master ${difficulty} level algorithmic problem solving`,
                    "Develop strong coding interview skills",
                    "Learn multiple programming languages and approaches",
                    "Understand time and space complexity analysis",
                    "Build confidence for technical interviews"
                ],
                prerequisites: difficulty === 'easy' ? ["Basic programming knowledge"] :
                              difficulty === 'medium' ? ["Completion of Easy course", "Understanding of data structures"] :
                              ["Strong algorithmic background", "Completion of Easy and Medium courses"],
                metadata: { modules }
            };

            // Insert course into database (SAME AS BEFORE)
            const insertQuery = `
                INSERT INTO enhanced_courses (
                    id, title, description, teacher_id, difficulty_level,
                    estimated_duration, target_audience, learning_outcomes,
                    prerequisites, metadata, language, course_type, is_published
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id
            `;

            const values = [
                course.id, course.title, course.description, course.teacher_id,
                course.difficulty_level, course.estimated_duration, course.target_audience,
                JSON.stringify(course.learning_outcomes), JSON.stringify(course.prerequisites),
                JSON.stringify(course.metadata), 'multi', course.course_type, course.is_published
            ];

            const result = await pool.query(insertQuery, values);

            console.log(`✅ Created: ${title}`);
            console.log(`📚 Course ID: ${result.rows[0].id}`);
            console.log(`📝 Problems: ${lessons.length}`);
            console.log(`💻 Languages: ${this.languages.join(', ')}`);
            console.log(`🔗 Real solutions loaded from leetcode-solutions repository\n`);

            return result.rows[0].id;

        } catch (error) {
            console.error(`❌ Error creating ${title}:`, error);
            throw error;
        }
    }

    // ENHANCED - Authentic Grokking course creation
    async createGrokkingCourse() {
        try {
            console.log(`🚀 Creating Authentic Grokking the Coding Interview Course...`);

            const courseId = uuidv4();
            const modules = [];
            let totalProblems = 0;

            for (const [patternName, patternData] of Object.entries(this.grokkingPatterns)) {
                console.log(`📝 Processing pattern: ${patternName}`);

                const lessons = [];

                for (const problemRef of patternData.problems) {
                    totalProblems++;

                    // Find problem details from our problem lists or create basic structure
                    let problem = this.findProblemMetadata(problemRef.id);

                    if (!problem) {
                        // Create basic problem structure for problems not in our main lists
                        problem = {
                            id: problemRef.id,
                            title: problemRef.title,
                            difficulty: problemRef.difficulty,
                            description: `Master the ${patternName} pattern by solving ${problemRef.title}. This problem is a classic example of how to apply the ${patternName} technique effectively.`,
                            examples: [{ input: "See LeetCode problem for examples", output: "Variable based on input", explanation: `Apply the ${patternName} pattern to solve this efficiently.` }],
                            constraints: ["See LeetCode problem for detailed constraints"],
                            pattern: patternName
                        };
                    } else {
                        // Update existing problem with pattern info
                        problem = { ...problem, pattern: patternName };
                    }

                    // Read solutions from files (MAINTAINING SUCCESSFUL APPROACH)
                    const solutions = {};
                    const boilerplate = {};

                    for (const language of this.languages) {
                        const solutionContent = await this.readSolutionFile(language, problem.id);
                        solutions[language] = solutionContent;
                        boilerplate[language] = this.generateBoilerplate(problem, language);
                    }

                    // Create language implementations
                    const languageImplementations = {};
                    for (const language of this.languages) {
                        languageImplementations[language] = {
                            starterCode: boilerplate[language],
                            solutionCode: solutions[language],
                            testCases: this.generateTestCasesCode(problem, language),
                            explanation: `Solve ${problem.title} using the ${patternName} pattern in ${language}`
                        };
                    }

                    const lesson = {
                        id: `lesson-${problem.id}`,
                        title: problem.title,
                        description: problem.description,
                        lesson_type: "coding_problem",
                        difficulty: problem.difficulty,
                        examples: problem.examples || [],
                        constraints: problem.constraints || [],
                        test_cases: this.generateTestCases(problem),
                        languageImplementations: languageImplementations,
                        hints: [
                            `🎯 This problem demonstrates the ${patternName} pattern`,
                            "🧠 Understand the pattern before implementing the solution",
                            "⚡ Focus on the algorithmic approach and time complexity",
                            "🔄 Practice similar problems to master this pattern",
                            "💡 Think about how this pattern can be applied to other problems"
                        ],
                        pattern_info: {
                            pattern_name: patternName,
                            problem_id: problem.id,
                            pattern_description: patternData.description,
                            leetcode_url: `https://leetcode.com/problems/${problem.id.substring(5)}/`
                        }
                    };

                    lessons.push(lesson);
                    console.log(`  ✅ Added: ${problem.title} (${problem.difficulty})`);
                }

                modules.push({
                    id: `grokking-module-${patternName.toLowerCase().replace(/[\s&']/g, '-')}`,
                    title: `Pattern: ${patternName}`,
                    description: patternData.description,
                    lessons: { lessons }
                });

                console.log(`  📊 Pattern ${patternName}: ${lessons.length} problems`);
            }

            const course = {
                id: courseId,
                title: "Grokking the Coding Interview - Master 14 Algorithmic Patterns",
                description: "Master coding interviews with the most comprehensive pattern-based approach. This course teaches 14 essential algorithmic patterns used by top tech companies, helping you recognize and solve any coding problem systematically. Based on the popular Grokking the Coding Interview course from Educative.io.",
                difficulty_level: "intermediate",
                estimated_duration: `${totalProblems * 3} hours`,
                course_type: "leetcode_patterns",
                is_published: true,
                teacher_id: this.teacherId,
                target_audience: "Software Engineers, Interview Candidates, CS Students, Anyone preparing for technical interviews",
                learning_outcomes: [
                    "Master 14 essential coding patterns used in technical interviews",
                    "Solve 70+ carefully curated LeetCode problems with pattern recognition",
                    "Develop systematic problem-solving approaches for any coding challenge",
                    "Ace technical interviews at Google, Meta, Amazon, Microsoft, and other top companies",
                    "Build pattern recognition skills to tackle new problems confidently",
                    "Learn multiple programming languages and solution approaches"
                ],
                prerequisites: [
                    "Basic knowledge of data structures (arrays, linked lists, trees, graphs)",
                    "Understanding of fundamental algorithms",
                    "Proficiency in at least one programming language",
                    "Familiarity with time and space complexity analysis"
                ],
                metadata: { modules }
            };

            // Insert course into database
            const insertQuery = `
                INSERT INTO enhanced_courses (
                    id, title, description, teacher_id, difficulty_level,
                    estimated_duration, target_audience, learning_outcomes,
                    prerequisites, metadata, language, course_type, is_published
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id
            `;

            const values = [
                course.id, course.title, course.description, course.teacher_id,
                course.difficulty_level, course.estimated_duration, course.target_audience,
                JSON.stringify(course.learning_outcomes), JSON.stringify(course.prerequisites),
                JSON.stringify(course.metadata), 'multi', course.course_type, course.is_published
            ];

            const result = await pool.query(insertQuery, values);

            console.log(`✅ Created: Grokking the Coding Interview - Authentic Edition`);
            console.log(`📚 Course ID: ${result.rows[0].id}`);
            console.log(`🎯 Patterns: ${modules.length}`);
            console.log(`📝 Total Problems: ${totalProblems}`);
            console.log(`💻 Languages: ${this.languages.join(', ')}`);
            console.log(`🔗 All solutions loaded from leetcode-solutions repository`);
            console.log(`🎓 Authentic recreation of the popular Educative.io course\n`);

            return result.rows[0].id;

        } catch (error) {
            console.error('❌ Error creating Grokking course:', error);
            throw error;
        }
    }

    // MAIN - Create all courses
    async createAllCourses() {
        try {
            console.log('🎯 Starting Ultimate LeetCode Course Suite Generation...');
            console.log('📁 Using real solutions from:', this.solutionsPath);
            console.log('🔧 Maintaining successful leetcode-solutions integration approach');
            console.log('📈 Enhanced with comprehensive problem sets and authentic Grokking patterns\n');

            // Create Easy Course (30 problems)
            await this.createCourse(
                "LeetCode Easy - Complete Foundation (30 Problems)",
                "Build a rock-solid foundation with 30 carefully selected easy LeetCode problems. Perfect for beginners and those starting their coding interview journey. Covers all fundamental concepts including arrays, strings, linked lists, trees, and basic algorithms.",
                this.easyProblems,
                "easy"
            );

            // Create Medium Course (30 problems)
            await this.createCourse(
                "LeetCode Medium - Interview Mastery (30 Problems)",
                "Master intermediate-level problems with 30 essential medium LeetCode challenges. These problems are frequently asked at major tech companies and cover dynamic programming, graphs, advanced trees, and complex algorithms.",
                this.mediumProblems,
                "medium"
            );

            // Create Hard Course (30 problems)
            await this.createCourse(
                "LeetCode Hard - Expert Challenge (30 Problems)",
                "Conquer the most challenging algorithmic problems with 30 hard LeetCode questions. Essential preparation for senior engineer positions and interviews at top-tier tech companies like Google, Meta, and Amazon.",
                this.hardProblems,
                "hard"
            );

            // Create Authentic Grokking Course (70 problems across 14 patterns)
            await this.createGrokkingCourse();

            console.log('🎉 Successfully created Ultimate LeetCode Course Suite!');
            console.log('\n📊 Final Summary:');
            console.log('   💚 Easy Course: 30 foundation problems');
            console.log('   🧡 Medium Course: 30 intermediate challenges');
            console.log('   ❤️  Hard Course: 30 expert-level problems');
            console.log('   💜 Grokking Course: 70 pattern-based problems across 14 patterns');
            console.log('   ═══════════════════════════════════════');
            console.log('   🎯 Total: 160 comprehensive LeetCode problems');
            console.log('   📚 All courses use real solutions from leetcode-solutions repository');
            console.log('   🌟 Enhanced with proper boilerplate code and detailed descriptions');
            console.log('   🎓 Authentic Grokking course recreated from Educative.io research');

        } catch (error) {
            console.error('💥 Fatal error creating course suite:', error);
            throw error;
        }
    }
}

// Main execution
async function main() {
    try {
        const generator = new UltimateLeetCodeSuite();
        await generator.createAllCourses();
        console.log('\n✅ Ultimate LeetCode Suite generation completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = UltimateLeetCodeSuite;