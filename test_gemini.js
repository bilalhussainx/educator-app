require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
console.log('Testing Gemini API with key:', apiKey ? apiKey.substring(0, 20) + '...' : 'NOT FOUND');

if (!apiKey) {
  console.error('GEMINI_API_KEY not found in environment');
  process.exit(1);
}

const testPrompt = 'Hello, can you help with a simple Python function?';
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

console.log('Making request to:', apiUrl.split('?')[0]);

fetch(apiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: testPrompt }] }]
  })
}).then(async response => {
  console.log('Response status:', response.status);
  console.log('Response headers:', [...response.headers.entries()]);
  const text = await response.text();
  console.log('Response body:', text);

  if (!response.ok) {
    console.error('API Error:', response.status, text);
  } else {
    const data = JSON.parse(text);
    console.log('Success! Generated content:', data.candidates?.[0]?.content?.parts?.[0]?.text);
  }
}).catch(error => {
  console.error('Fetch Error:', error.message);
});