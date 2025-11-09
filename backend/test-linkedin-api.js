// Test LinkedIn API connection
// Run with: node backend/test-linkedin-api.js
require('ts-node/register');
require('dotenv').config();
const axios = require('axios');

async function testLinkedInAPI() {
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  const RAPIDAPI_HOST = 'linkedin-job-search-api.p.rapidapi.com';

  if (!RAPIDAPI_KEY) {
    console.error('❌ RAPIDAPI_KEY not found in .env file');
    console.log('\nAdd this to your .env file:');
    console.log('RAPIDAPI_KEY=e13be94427mshbe3071844e4d069p1aff77jsn862b6e3c630b');
    process.exit(1);
  }

  console.log('🔍 Testing LinkedIn API...\n');
  console.log(`API Host: ${RAPIDAPI_HOST}`);
  console.log(`API Key: ${RAPIDAPI_KEY.substring(0, 10)}...${RAPIDAPI_KEY.substring(RAPIDAPI_KEY.length - 4)}\n`);

  try {
    console.log('📡 Fetching jobs from /active-jb-1h endpoint...\n');

    const response = await axios.get(`https://${RAPIDAPI_HOST}/active-jb-1h`, {
      params: {
        offset: 0,
        description_type: 'text',
      },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
      timeout: 15000,
    });

    console.log('✅ SUCCESS! API is working!\n');
    console.log('📊 Response Status:', response.status);
    console.log('📦 Response Data Structure:', Object.keys(response.data));

    if (response.data.data && Array.isArray(response.data.data)) {
      console.log(`\n✅ Found ${response.data.data.length} jobs!\n`);

      // Show first 3 jobs
      const sampleJobs = response.data.data.slice(0, 3);
      console.log('📋 Sample Jobs:\n');
      sampleJobs.forEach((job, index) => {
        console.log(`${index + 1}. ${job.job_title || job.title || 'No title'}`);
        console.log(`   Company: ${job.company_name || job.company || 'No company'}`);
        console.log(`   Location: ${job.location || 'No location'}`);
        console.log(`   Job ID: ${job.job_id || job.id || 'No ID'}`);
        console.log('');
      });
    } else {
      console.log('\n⚠️  Response structure:', JSON.stringify(response.data, null, 2));
    }

    console.log('\n✅ LinkedIn API is configured correctly!');
    console.log('You can now run: node backend/trigger-jobs.js\n');

  } catch (error) {
    console.error('❌ Error testing LinkedIn API:\n');

    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Status Text: ${error.response.statusText}`);
      console.error(`Error Data:`, JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 401) {
        console.error('\n⚠️  Authentication failed!');
        console.error('   Check your RAPIDAPI_KEY in .env file');
      } else if (error.response.status === 429) {
        console.error('\n⚠️  Rate limit exceeded!');
        console.error('   Wait a minute and try again');
      } else if (error.response.status === 404) {
        console.error('\n⚠️  Endpoint not found!');
        console.error('   The API might have changed');
      }
    } else {
      console.error(`Message: ${error.message}`);
    }

    console.log('\n');
    process.exit(1);
  }
}

testLinkedInAPI();
