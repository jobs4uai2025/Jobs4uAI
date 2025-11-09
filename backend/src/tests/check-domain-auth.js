const axios = require('axios');
require('dotenv').config();

const apiKey = process.env.SENDGRID_API_KEY;

console.log('\n🔍 Checking SendGrid Domain Authentication\n');
console.log('='.repeat(60));

async function checkDomainAuth() {
  try {
    // Check authenticated domains
    const domainResponse = await axios.get('https://api.sendgrid.com/v3/whitelabel/domains', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    const domains = domainResponse.data;

    console.log('\n📧 Authenticated Domains:\n');

    if (domains.length === 0) {
      console.log('❌ No authenticated domains found');
      return;
    }

    domains.forEach((domain, index) => {
      console.log(`${index + 1}. Domain: ${domain.domain}`);
      console.log(`   Valid: ${domain.valid ? '✅ YES' : '❌ NO'}`);
      console.log(`   Default: ${domain.default ? '✅ YES' : '⚠️  NO'}`);
      console.log(`   Custom SPF: ${domain.custom_spf ? 'Yes' : 'No'}`);
      console.log(`   Subdomain: ${domain.subdomain || 'N/A'}`);

      if (domain.dns) {
        console.log(`\n   DNS Records Status:`);
        console.log(`   - Mail CNAME: ${domain.dns.mail_cname?.valid ? '✅' : '❌'}`);
        console.log(`   - DKIM1: ${domain.dns.dkim1?.valid ? '✅' : '❌'}`);
        console.log(`   - DKIM2: ${domain.dns.dkim2?.valid ? '✅' : '❌'}`);
      }
      console.log('');
    });

    // Check if user can send from their FROM_EMAIL
    const fromEmail = process.env.FROM_EMAIL;
    const fromDomain = fromEmail.split('@')[1];

    console.log('='.repeat(60));
    console.log(`\n✉️  Your FROM_EMAIL: ${fromEmail}`);
    console.log(`📍 Extracted domain: ${fromDomain}\n`);

    const matchingDomain = domains.find(d => {
      // SendGrid uses the root domain for authentication
      const rootDomain = fromDomain;
      const authDomain = d.domain;
      return authDomain === rootDomain || rootDomain.endsWith(authDomain);
    });

    if (matchingDomain && matchingDomain.valid) {
      console.log('✅ GOOD NEWS: Your domain is authenticated!');
      console.log(`   Authenticated domain: ${matchingDomain.domain}`);
      console.log(`   Subdomain for infrastructure: ${matchingDomain.subdomain}`);
      console.log(`\n✅ You CAN send from: ${fromEmail}`);

      if (!matchingDomain.default) {
        console.log('\n⚠️  NOTE: This domain is not set as DEFAULT');
        console.log('   This might cause issues. Consider making it default:');
        console.log(`   https://app.sendgrid.com/settings/sender_auth/domain`);
      }
    } else {
      console.log('❌ PROBLEM: Your domain is NOT properly authenticated');
      console.log(`\n   You're trying to send from: ${fromDomain}`);
      console.log(`   Authenticated domains: ${domains.map(d => d.domain).join(', ')}`);
      console.log('\n   Solution: Authenticate your domain at:');
      console.log('   https://app.sendgrid.com/settings/sender_auth/domain/create');
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error checking domain authentication');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`Error: ${error.message}`);
    }
  }
}

checkDomainAuth();
