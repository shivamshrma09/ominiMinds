import 'dotenv/config';
import { extractKnowledge } from './services/gemini';

async function main() {
  console.log('Testing extractKnowledge with gemini-2.5-flash...');
  const testText = `
  Client Name: Shivam Kumar
  Discussion: Shivam wants to verify the integration. We decided to build a dark mode UI.
  The budget is $5,000 and the project must complete by next week.
  Action item: Antigravity needs to write the test script by tonight.
  `;

  try {
    const result = await extractKnowledge(testText, 'Shivam Kumar');
    console.log('\n--- EXTRACTED KNOWLEDGE ---');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n--- SUCCESS! Gemini integration works perfectly! ---');
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
