// Check available models for Claude API
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

async function checkModels() {
    console.log('🔍 Checking available Claude models...\n');
    
    const modelsToTest = [
        "claude-3-5-sonnet-20241022",
        "claude-3-haiku-20240307",
        "claude-3-sonnet-20240229", 
        "claude-3-opus-20240229"
    ];

    for (const model of modelsToTest) {
        try {
            console.log(`Testing ${model}...`);
            
            const response = await anthropic.messages.create({
                model: model,
                max_tokens: 10,
                messages: [
                    {
                        role: "user",
                        content: "Say 'OK'"
                    }
                ]
            });

            console.log(`✅ ${model} works!`);
            console.log(`Response: ${response.content[0].text}\n`);
            
        } catch (error) {
            console.log(`❌ ${model} failed: ${error.message}\n`);
        }
    }
}

checkModels();