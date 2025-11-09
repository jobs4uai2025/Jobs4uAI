// Debug LinkedIn API response structure
// Run with: node backend/debug-linkedin-data.js

require('dotenv').config();
const axios = require('axios');

async function debugLinkedInData() {
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  const RAPIDAPI_HOST = 'linkedin-job-search-api.p.rapidapi.com';

  console.log('🔍 Fetching LinkedIn data to inspect structure...\n');

  try {
    const response = await axios.get(`https://${RAPIDAPI_HOST}/active-jb-24h`, {
      params: {
        offset: 0,
        description_type: 'text',
      },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
    });

    console.log('✅ Got response!\n');
    console.log(`Total jobs: ${response.data.length}\n`);

    // Show first job structure
    console.log('📋 FIRST JOB STRUCTURE:\n');
    console.log(JSON.stringify(response.data[0], null, 2));

    console.log('\n📊 FIELD NAMES IN FIRST JOB:\n');
    console.log(Object.keys(response.data[0]).sort());

    console.log('\n\n📋 SECOND JOB (for comparison):\n');
    console.log(JSON.stringify(response.data[1], null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error(error.response.data);
    }
  }
}

debugLinkedInData();
