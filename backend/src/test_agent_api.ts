import axios from 'axios';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1Y2I0NzljZC05ZTUxLTRhYjQtYjNiNi04MmQ3ZjhmOWM2NzEiLCJ0d29GYWN0b3JWZXJpZmllZCI6dHJ1ZSwiaWF0IjoxNzgzMjYzNDI0LCJleHAiOjE3ODM4NjgyMjR9.mhh-lr131y4SYv3wmRYed0VTYhYWd1dnE08mfGIDXks';

async function main() {
  console.log('Sending request to /api/agent/chat...');
  try {
    const res = await axios.post(
      'http://localhost:5000/api/agent/chat',
      {
        message: 'hello what clients do I have',
        clientId: null,
        history: []
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('STATUS:', res.status);
    console.log('BODY:', JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    if (err.response) {
      console.log('ERROR STATUS:', err.response.status);
      console.log('ERROR BODY:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.log('ERROR:', err.message);
    }
  }
}

main();
