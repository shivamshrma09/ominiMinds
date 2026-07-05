import axios from 'axios';

async function main() {
  try {
    const res = await axios.get('http://localhost:5000/health');
    console.log('HEALTH STATUS:', res.status);
    console.log('HEALTH BODY:', JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.log('HEALTH ERROR:', err.message);
  }
}

main();
