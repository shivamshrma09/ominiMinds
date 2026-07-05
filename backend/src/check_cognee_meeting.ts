import 'dotenv/config';
import axios from 'axios';

const COGNEE_BASE = process.env.COGNEE_API_BASE!;
const COGNEE_KEY = process.env.COGNEE_API_KEY!;
const CLIENT_ID = '27e5b887-79dc-4e0c-909a-a954320b8ffc'; // Latest meeting's client_id

async function recall(query: string, datasetName: string) {
  console.log(`\n🔍 Querying: "${query}" in dataset: ${datasetName}`);
  try {
    const res = await axios.post(
      `${COGNEE_BASE}/api/v1/recall`,
      { query, datasets: [datasetName], topK: 5 },
      { headers: { 'X-Api-Key': COGNEE_KEY, 'Content-Type': 'application/json' } }
    );
    const results = res.data?.results || res.data || [];
    if (!results.length) {
      console.log('  ❌ No results found');
    } else {
      console.log(`  ✅ ${results.length} result(s):`);
      results.forEach((r: any, i: number) => {
        const text = r.content || r.text || r.chunk || JSON.stringify(r);
        console.log(`  [${i + 1}] ${String(text).slice(0, 200)}...`);
      });
    }
    return results;
  } catch (err: any) {
    console.log(`  ❌ Error: ${err?.response?.status} — ${err?.response?.data?.message || err.message}`);
    return [];
  }
}

async function listDatasets() {
  console.log('\n📂 Listing all datasets in Cognee...');
  try {
    const res = await axios.get(`${COGNEE_BASE}/api/v1/datasets`, {
      headers: { 'X-Api-Key': COGNEE_KEY }
    });
    console.log('Datasets:', JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.log(`Error: ${err?.response?.status} — ${JSON.stringify(err?.response?.data)}`);
  }
}

async function main() {
  console.log('=== Checking Cognee for Meeting Data ===');

  // List datasets first
  await listDatasets();

  // Try recall in client-scoped dataset
  await recall('Shivam meeting transcript hello', CLIENT_ID);
  await recall('meeting summary action items', CLIENT_ID);

  // Try in default dataset
  await recall('Shivam meeting transcript', 'default');
  await recall('meeting', 'main');
}

main().catch(console.error);
