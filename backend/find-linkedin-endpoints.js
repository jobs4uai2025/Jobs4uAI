// Test all LinkedIn API endpoints to find which ones work
// Run with: node backend/find-linkedin-endpoints.js

require('dotenv').config();
const axios = require('axios');

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'linkedin-job-search-api.p.rapidapi.com';

// Common endpoint patterns to test
const endpointsToTest = [
  // Search endpoints
  { path: '/search', params: { keywords: 'software engineer', location: 'United States' } },
  { path: '/jobs', params: { keywords: 'software engineer' } },
  { path: '/job-search', params: { keywords: 'developer' } },
  { path: '/search-jobs', params: { q: 'engineer' } },

  // List endpoints
  { path: '/jobs/list', params: {} },
  { path: '/active-jobs', params: {} },
  { path: '/recent-jobs', params: {} },
  { path: '/active-jb-24h', params: { offset: 0 } },
  { path: '/active-jb-7d', params: { offset: 0 } },

  // Filter endpoints
  { path: '/jobs/filter', params: { title: 'engineer' } },
  { path: '/filter', params: { keyword: 'software' } },

  // Root endpoint
  { path: '/', params: { keywords: 'software' } },
];

async function testEndpoint(endpoint) {
  try {
    const response = await axios.get(`https://${RAPIDAPI_HOST}${endpoint.path}`, {
      params: endpoint.params,
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
      timeout: 10000,
    });

    return {
      success: true,
      status: response.status,
      dataKeys: Object.keys(response.data),
      sampleData: response.data,
    };
  } catch (error) {
    if (error.response) {
      return {
        success: false,
        status: error.response.status,
        error: error.response.data?.message || error.response.statusText,
      };
    }
    return {
      success: false,
      error: error.message,
    };
  }
}

async function findWorkingEndpoints() {
  console.log('🔍 Testing LinkedIn API Endpoints\n');
  console.log(`API Host: ${RAPIDAPI_HOST}`);
  console.log(`API Key: ${RAPIDAPI_KEY?.substring(0, 10)}...${RAPIDAPI_KEY?.substring(RAPIDAPI_KEY.length - 4)}\n`);
  console.log('═'.repeat(70));
  console.log('\n📡 Testing endpoints...\n');

  const results = [];

  for (const endpoint of endpointsToTest) {
    process.stdout.write(`Testing ${endpoint.path.padEnd(25)} ... `);

    const result = await testEndpoint(endpoint);
    results.push({ endpoint: endpoint.path, ...result });

    if (result.success) {
      console.log('✅ SUCCESS');
    } else {
      console.log(`❌ ${result.error || 'Failed'}`);
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n📊 RESULTS SUMMARY:\n');

  const working = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (working.length > 0) {
    console.log(`✅ ${working.length} Working Endpoint(s):\n`);
    working.forEach(r => {
      console.log(`   ${r.endpoint}`);
      console.log(`      Status: ${r.status}`);
      console.log(`      Response keys: ${r.dataKeys?.join(', ')}`);

      if (r.sampleData?.data && Array.isArray(r.sampleData.data)) {
        console.log(`      Jobs found: ${r.sampleData.data.length}`);
        if (r.sampleData.data[0]) {
          const job = r.sampleData.data[0];
          console.log(`      Sample: ${job.job_title || job.title || 'N/A'} at ${job.company_name || job.company || 'N/A'}`);
        }
      }
      console.log('');
    });

    console.log('\n🎯 RECOMMENDED ENDPOINT TO USE:');
    console.log(`   ${working[0].endpoint}\n`);

  } else {
    console.log('❌ No working endpoints found!\n');
  }

  if (failed.length > 0) {
    console.log(`\n⚠️  ${failed.length} Failed Endpoint(s):\n`);
    failed.forEach(r => {
      console.log(`   ${r.endpoint}: ${r.error}`);
    });
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n💡 NEXT STEPS:\n');

  if (working.length > 0) {
    console.log('1. I will update the code to use the working endpoint');
    console.log('2. Run: node backend/trigger-jobs.js');
    console.log('3. LinkedIn jobs will be fetched successfully!\n');
  } else {
    console.log('1. Check your RapidAPI subscription at:');
    console.log('   https://rapidapi.com/rockapis-rockapis-default/api/linkedin-job-search-api');
    console.log('2. Go to "Endpoints" tab and see which ones are available');
    console.log('3. Your subscription tier might not include job search endpoints\n');
  }
}

findWorkingEndpoints().catch(console.error);
