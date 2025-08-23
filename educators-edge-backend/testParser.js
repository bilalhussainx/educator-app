import path from 'path';
import { parseMarkdownFile } from './parsers/freeCodeCampParser.js';

// The full path to the Palindrome Checker markdown file you provided.
const FILE_TO_TEST = path.join(process.cwd(), '..', 'freeCodeCamp', 'curriculum', 'challenges', 'english', '15-javascript-algorithms-and-data-structures-22', 'build-a-palindrome-checker-project', 'build-a-palindrome-checker.md');

async function test() {
  console.log('--- TESTING THE PARSER ---');
  console.log(`Reading file: ${path.basename(FILE_TO_TEST)}`);

  const lessonObject = await parseMarkdownFile(FILE_TO_TEST);

  console.log('\n--- PARSED LESSON OBJECT ---');
  console.log(JSON.stringify(lessonObject, null, 2));

  // Add a check to confirm the problem
  if (lessonObject && (!lessonObject.description || !lessonObject.testCode)) {
    console.error('\n[CONFIRMED] The parser is failing to extract the description and/or test code.');
  } else if (lessonObject) {
    console.log('\n[SUCCESS] The parser correctly extracted all content.');
  }
}

test();