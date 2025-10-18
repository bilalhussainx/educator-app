/**
 * =================================================================
 * ADVANCED MONACO EDITOR CONFIGURATION
 * =================================================================
 * Provides language-specific IntelliSense, auto-completion, snippets,
 * error highlighting, and best practices for coding interviews
 * =================================================================
 */

import * as monaco from 'monaco-editor';

// Language-specific keywords and snippets
export const LANGUAGE_SNIPPETS = {
  javascript: [
    {
      label: 'function',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'function ${1:name}(${2:params}) {\n\t${3:// code}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Function declaration',
    },
    {
      label: 'arrow',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'const ${1:name} = (${2:params}) => {\n\t${3:// code}\n};',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Arrow function',
    },
    {
      label: 'class',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'class ${1:ClassName} {\n\tconstructor(${2:params}) {\n\t\t${3:// initialization}\n\t}\n\n\t${4:method}() {\n\t\t${5:// method body}\n\t}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Class declaration',
    },
    {
      label: 'for',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n\t${3:// code}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'For loop',
    },
    {
      label: 'forEach',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: '${1:array}.forEach((${2:item}, ${3:index}) => {\n\t${4:// code}\n});',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Array forEach',
    },
    {
      label: 'map',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: '${1:array}.map((${2:item}) => ${3:item})',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Array map',
    },
    {
      label: 'filter',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: '${1:array}.filter((${2:item}) => ${3:condition})',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Array filter',
    },
    {
      label: 'reduce',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: '${1:array}.reduce((${2:acc}, ${3:item}) => {\n\t${4:return acc}\n}, ${5:initialValue})',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Array reduce',
    },
  ],
  python: [
    {
      label: 'def',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'def ${1:function_name}(${2:params}):\n\t${3:pass}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Function definition',
    },
    {
      label: 'class',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'class ${1:ClassName}:\n\tdef __init__(self${2:, params}):\n\t\t${3:pass}\n\n\tdef ${4:method}(self):\n\t\t${5:pass}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Class definition',
    },
    {
      label: 'for',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'For loop',
    },
    {
      label: 'while',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'while ${1:condition}:\n\t${2:pass}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'While loop',
    },
    {
      label: 'if',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'if ${1:condition}:\n\t${2:pass}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'If statement',
    },
    {
      label: 'list_comp',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: '[${1:expression} for ${2:item} in ${3:iterable}${4: if ${5:condition}}]',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'List comprehension',
    },
    {
      label: 'dict_comp',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: '{${1:key}: ${2:value} for ${3:item} in ${4:iterable}}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Dictionary comprehension',
    },
  ],
  java: [
    {
      label: 'class',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'class ${1:ClassName} {\n\tpublic ${1:ClassName}(${2:params}) {\n\t\t${3:// constructor}\n\t}\n\n\tpublic ${4:void} ${5:method}(${6:params}) {\n\t\t${7:// method body}\n\t}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Class declaration',
    },
    {
      label: 'method',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'public ${1:void} ${2:methodName}(${3:params}) {\n\t${4:// code}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Method declaration',
    },
    {
      label: 'for',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n\t${3:// code}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'For loop',
    },
    {
      label: 'foreach',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'for (${1:Type} ${2:item} : ${3:collection}) {\n\t${4:// code}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Enhanced for loop',
    },
    {
      label: 'if',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'if (${1:condition}) {\n\t${2:// code}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'If statement',
    },
  ],
  cpp: [
    {
      label: 'class',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'class ${1:ClassName} {\nprivate:\n\t${2:// private members}\npublic:\n\t${1:ClassName}(${3:params}) {\n\t\t${4:// constructor}\n\t}\n\n\t${5:void} ${6:method}(${7:params}) {\n\t\t${8:// method body}\n\t}\n};',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Class declaration',
    },
    {
      label: 'for',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3:// code}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'For loop',
    },
    {
      label: 'vector',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'vector<${1:int}> ${2:vec}${3: = {${4:values}}};',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Vector declaration',
    },
  ],
};

// Common LeetCode/competitive programming constructs
export const COMMON_PATTERNS = {
  javascript: [
    {
      label: 'twoPointers',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'let left = 0, right = ${1:array}.length - 1;\nwhile (left < right) {\n\t${2:// two pointer logic}\n\tleft++;\n\tright--;\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Two pointers pattern',
    },
    {
      label: 'slidingWindow',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'let windowStart = 0;\nfor (let windowEnd = 0; windowEnd < ${1:array}.length; windowEnd++) {\n\t${2:// process current element}\n\twhile (${3:windowCondition}) {\n\t\t${4:// shrink window}\n\t\twindowStart++;\n\t}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Sliding window pattern',
    },
    {
      label: 'binarySearch',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'let left = 0, right = ${1:array}.length - 1;\nwhile (left <= right) {\n\tconst mid = Math.floor((left + right) / 2);\n\tif (${1:array}[mid] === ${2:target}) {\n\t\treturn mid;\n\t} else if (${1:array}[mid] < ${2:target}) {\n\t\tleft = mid + 1;\n\t} else {\n\t\tright = mid - 1;\n\t}\n}\nreturn -1;',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Binary search pattern',
    },
    {
      label: 'dfs',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'function dfs(${1:node}, ${2:visited}) {\n\tif (!${1:node} || ${2:visited}.has(${1:node})) return;\n\t${2:visited}.add(${1:node});\n\t${3:// process node}\n\tfor (const neighbor of ${1:node}.neighbors) {\n\t\tdfs(neighbor, ${2:visited});\n\t}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Depth-first search pattern',
    },
    {
      label: 'bfs',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'const queue = [${1:startNode}];\nconst visited = new Set([${1:startNode}]);\nwhile (queue.length > 0) {\n\tconst node = queue.shift();\n\t${2:// process node}\n\tfor (const neighbor of node.neighbors) {\n\t\tif (!visited.has(neighbor)) {\n\t\t\tvisited.add(neighbor);\n\t\t\tqueue.push(neighbor);\n\t\t}\n\t}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Breadth-first search pattern',
    },
    {
      label: 'dp',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'const dp = new Array(${1:n}).fill(0);\ndp[0] = ${2:base};\nfor (let i = 1; i < ${1:n}; i++) {\n\tdp[i] = ${3:// recurrence relation}\n}\nreturn dp[${1:n} - 1];',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Dynamic programming pattern',
    },
  ],
  python: [
    {
      label: 'twoPointers',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'left, right = 0, len(${1:array}) - 1\nwhile left < right:\n\t${2:# two pointer logic}\n\tleft += 1\n\tright -= 1',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Two pointers pattern',
    },
    {
      label: 'slidingWindow',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'window_start = 0\nfor window_end in range(len(${1:array})):\n\t${2:# process current element}\n\twhile ${3:window_condition}:\n\t\t${4:# shrink window}\n\t\twindow_start += 1',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Sliding window pattern',
    },
    {
      label: 'binarySearch',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'left, right = 0, len(${1:array}) - 1\nwhile left <= right:\n\tmid = (left + right) // 2\n\tif ${1:array}[mid] == ${2:target}:\n\t\treturn mid\n\telif ${1:array}[mid] < ${2:target}:\n\t\tleft = mid + 1\n\telse:\n\t\tright = mid - 1\nreturn -1',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Binary search pattern',
    },
    {
      label: 'dfs',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'def dfs(${1:node}, ${2:visited}):\n\tif not ${1:node} or ${1:node} in ${2:visited}:\n\t\treturn\n\t${2:visited}.add(${1:node})\n\t${3:# process node}\n\tfor neighbor in ${1:node}.neighbors:\n\t\tdfs(neighbor, ${2:visited})',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Depth-first search pattern',
    },
    {
      label: 'bfs',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'from collections import deque\nqueue = deque([${1:start_node}])\nvisited = {${1:start_node}}\nwhile queue:\n\tnode = queue.popleft()\n\t${2:# process node}\n\tfor neighbor in node.neighbors:\n\t\tif neighbor not in visited:\n\t\t\tvisited.add(neighbor)\n\t\t\tqueue.append(neighbor)',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Breadth-first search pattern',
    },
    {
      label: 'dp',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'dp = [0] * ${1:n}\ndp[0] = ${2:base}\nfor i in range(1, ${1:n}):\n\tdp[i] = ${3:# recurrence relation}\nreturn dp[-1]',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Dynamic programming pattern',
    },
  ],
};

// Register custom completion providers for each language
export function registerLanguageProviders() {
  // JavaScript/TypeScript
  monaco.languages.registerCompletionItemProvider('javascript', {
    provideCompletionItems: () => {
      return {
        suggestions: [
          ...LANGUAGE_SNIPPETS.javascript,
          ...COMMON_PATTERNS.javascript,
        ],
      };
    },
  });

  monaco.languages.registerCompletionItemProvider('typescript', {
    provideCompletionItems: () => {
      return {
        suggestions: [
          ...LANGUAGE_SNIPPETS.javascript,
          ...COMMON_PATTERNS.javascript,
        ],
      };
    },
  });

  // Python
  monaco.languages.registerCompletionItemProvider('python', {
    provideCompletionItems: () => {
      return {
        suggestions: [
          ...LANGUAGE_SNIPPETS.python,
          ...COMMON_PATTERNS.python,
        ],
      };
    },
  });

  // Java
  monaco.languages.registerCompletionItemProvider('java', {
    provideCompletionItems: () => {
      return {
        suggestions: LANGUAGE_SNIPPETS.java,
      };
    },
  });

  // C++
  monaco.languages.registerCompletionItemProvider('cpp', {
    provideCompletionItems: () => {
      return {
        suggestions: LANGUAGE_SNIPPETS.cpp,
      };
    },
  });
}

// Enhanced editor options with language-specific settings
export function getEditorOptions(language: string): monaco.editor.IStandaloneEditorConstructionOptions {
  const baseOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    fontSize: 15,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
    fontWeight: '400',
    lineHeight: 1.6,
    minimap: { enabled: false },
    padding: { top: 20, bottom: 20 },

    // Layout & Scrolling
    automaticLayout: true,
    scrollBeyondLastLine: false,
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      useShadows: true,
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
    },

    // Indentation & Formatting
    autoIndent: 'full',
    formatOnPaste: true,
    formatOnType: true,
    detectIndentation: true,
    trimAutoWhitespace: true,

    // IntelliSense & Suggestions
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on',
    tabCompletion: 'on',
    wordBasedSuggestions: 'allDocuments',
    quickSuggestions: {
      other: true,
      comments: false,
      strings: true,
    },
    suggestSelection: 'first',

    // Code Lens & Hints
    codeLens: true,
    inlayHints: { enabled: 'on' },
    parameterHints: { enabled: true },

    // Bracket Matching
    matchBrackets: 'always',
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true,
    },

    // Selection & Cursor
    selectionHighlight: true,
    occurrencesHighlight: 'singleFile',
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',

    // Editor Behavior
    mouseWheelZoom: true,
    wordWrap: 'on',
    wrappingIndent: 'indent',
    renderWhitespace: 'selection',
    renderLineHighlight: 'all',
    smoothScrolling: true,

    // Hover & Documentation
    hover: {
      enabled: true,
      delay: 300,
    },
  };

  // Language-specific overrides
  const languageSpecificOptions: Record<string, Partial<monaco.editor.IStandaloneEditorConstructionOptions>> = {
    javascript: {
      tabSize: 2,
      insertSpaces: true,
    },
    typescript: {
      tabSize: 2,
      insertSpaces: true,
    },
    python: {
      tabSize: 4,
      insertSpaces: true,
    },
    java: {
      tabSize: 4,
      insertSpaces: true,
    },
    cpp: {
      tabSize: 2,
      insertSpaces: true,
    },
    c: {
      tabSize: 2,
      insertSpaces: true,
    },
  };

  return {
    ...baseOptions,
    ...(languageSpecificOptions[language] || {}),
  };
}

// Setup diagnostic markers for common errors
export function setupDiagnostics(monaco: typeof import('monaco-editor')) {
  // This will be enhanced with actual linting in the future
  // For now, Monaco provides built-in syntax checking
}

// Map file extension to Monaco language
export function getMonacoLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'c': 'c',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
  };
  return languageMap[ext || ''] || 'javascript';
}
