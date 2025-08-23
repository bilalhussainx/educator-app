import fs from 'fs';
import path from 'path';
import * as freeCodeCampParser from '../parsers/freeCodeCampParser.js';

const parsers = {
  'freeCodeCamp': freeCodeCampParser,
};

// The directory where we will save the final JSON files.
const OUTPUT_DIR = path.join(process.cwd(), 'output');

/**
 * Discovers all topic folders and processes them in a batch.
 * @param {string} sourceName - The key for the parser to use.
 * @param {string} metaFolderPath - The local path to the _meta folder.
 */
export async function ingestAllTopics(sourceName, metaFolderPath) {
  if (!parsers[sourceName]) {
    throw new Error(`No parser available for source: ${sourceName}`);
  }

  // Create the output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
    console.log(`Created output directory at: ${OUTPUT_DIR}`);
  }

  console.log('--- STARTING BATCH INGESTION (FROM LOCAL _meta FOLDER) ---');
  console.log(`Reading all topics from: ${metaFolderPath}`);

  // Get all items in the _meta directory
  const allTopics = fs.readdirSync(metaFolderPath, { withFileTypes: true });

  for (const topic of allTopics) {
    // We only care about directories, not files
    if (topic.isDirectory()) {
      const topicName = topic.name;
      console.log(`\nProcessing topic: ${topicName}...`);

      try {
        // Use the existing parser for this one topic
        const parsedCourse = await parsers[sourceName].parse(metaFolderPath, topicName);

        // Only save the file if the parser actually found lessons
        if (parsedCourse && parsedCourse.lessons.length > 0) {
          const outputFileName = `${topicName}.json`;
          const outputPath = path.join(OUTPUT_DIR, outputFileName);
          const jsonContent = JSON.stringify(parsedCourse, null, 2); // Pretty-print the JSON

          fs.writeFileSync(outputPath, jsonContent);
          console.log(`  -> SUCCESS: Saved ${parsedCourse.lessons.length} lessons to ${outputPath}`);
        } else {
          console.log(`  -> SKIPPED: No lessons found for ${topicName}.`);
        }
      } catch (error) {
        console.error(`  -> FAILED to process topic ${topicName}:`, error.message);
      }
    }
  }

  console.log('\n--- BATCH INGESTION COMPLETE ---');
}