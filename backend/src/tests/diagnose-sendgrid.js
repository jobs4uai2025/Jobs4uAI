const sgMail = require('@sendgrid/mail');
const axios = require('axios');
require('dotenv').config();

console.log('\n🔍 SendGrid Diagnostic Tool\n');
console.log('='.repeat(60));

// Step 1: Check environment variables
console.log('\n1️⃣  Checking Environment Variables...\n');

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.FROM_EMAIL;

if (!apiKey) {
  console.error('❌ SENDGRID_API_KEY is not set in .env file');
  process.exit(1);
}
if (!fromEmail) {
  console.error('❌ FROM_EMAIL is not set in .env file');
  process.exit(1);
}

console.log(`✅ SENDGRID_API_KEY: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
console.log(`✅ FROM_EMAIL: ${fromEmail}`);

sgMail.setApiKey(apiKey);

// Step 2: Verify API Key
console.log('\n2️⃣  Verifying API Key...\n');

axios.get('https://api.sendgrid.com/v3/scopes', {
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
})
  .then(response => {
    console.log('✅ API Key is VALID');
    console.log(`   Permissions: ${response.data.scopes.slice(0, 5).join(', ')}...`);
    return checkSenderVerification();
  })
  .catch(error => {
    console.error('❌ API Key is INVALID');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    process.exit(1);
  });

// Step 3: Check Sender Verification
async function checkSenderVerification() {
  console.log('\n3️⃣  Checking Sender Verification...\n');

  try {
    const response = await axios.get('https://api.sendgrid.com/v3/verified_senders', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const verifiedSenders = response.data.results || [];

    if (verifiedSenders.length === 0) {
      console.error('❌ NO VERIFIED SENDERS FOUND');
      console.error('\n⚠️  THIS IS LIKELY THE PROBLEM!\n');
      console.error('   You need to verify your sender email in SendGrid:');
      console.error('   1. Go to: https://app.sendgrid.com/settings/sender_auth/senders');
      console.error('   2. Click "Create New Sender" or verify existing one');
      console.error('   3. Add your FROM_EMAIL and verify it via email');
      console.error('\n');
      await testEmailSend(false);
      return;
    }

    console.log(`✅ Found ${verifiedSenders.length} verified sender(s):\n`);

    let fromEmailVerified = false;
    verifiedSenders.forEach((sender, index) => {
      const isVerified = sender.verified;
      const isFromEmail = sender.from_email === fromEmail;
      const status = isVerified ? '✅ VERIFIED' : '⚠️  PENDING';

      console.log(`   ${index + 1}. ${sender.from_email} - ${status}`);
      console.log(`      Name: ${sender.from_name}`);
      console.log(`      Created: ${new Date(sender.created_at * 1000).toLocaleDateString()}`);

      if (isFromEmail && isVerified) {
        fromEmailVerified = true;
      }
      console.log('');
    });

    if (fromEmailVerified) {
      console.log(`\n✅ Your FROM_EMAIL (${fromEmail}) is VERIFIED!\n`);
      await testEmailSend(true);
    } else {
      console.error(`\n❌ Your FROM_EMAIL (${fromEmail}) is NOT in the verified list!\n`);
      console.error('⚠️  THIS IS THE PROBLEM!\n');
      console.error('   Solution:');
      console.error(`   1. Go to: https://app.sendgrid.com/settings/sender_auth/senders`);
      console.error(`   2. Verify the email: ${fromEmail}`);
      console.error('   3. Check your inbox and click the verification link');
      console.error('\n');
      await testEmailSend(false);
    }

  } catch (error) {
    console.error('❌ Error checking verified senders');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
  }
}

// Step 4: Test Email Send
async function testEmailSend(shouldSucceed) {
  console.log('\n4️⃣  Testing Email Send...\n');

  const msg = {
    to: 'syedsam7edu@gmail.com',
    from: fromEmail,
    subject: 'SendGrid Diagnostic Test - ' + new Date().toISOString(),
    text: 'This is a test email from the SendGrid diagnostic tool.',
    html: '<strong>This is a test email from the SendGrid diagnostic tool.</strong><br><br>If you receive this, SendGrid is working correctly!',
  };

  try {
    await sgMail.send(msg);
    console.log('✅ Email send request ACCEPTED by SendGrid!');

    if (!shouldSucceed) {
      console.log('\n⚠️  NOTE: Even though SendGrid accepted the request,');
      console.log('   the email will likely NOT be delivered because');
      console.log('   your FROM_EMAIL is not verified.');
      console.log('\n   Check your SendGrid Activity Feed for rejection:');
      console.log('   https://app.sendgrid.com/email_activity\n');
    } else {
      console.log('\n✅ Email should be delivered successfully!');
      console.log('   Check your inbox: syedsam7edu@gmail.com');
      console.log('   (Also check spam folder)\n');
    }
  } catch (error) {
    console.error('❌ Email send FAILED');
    console.error(`   Error: ${error.message}`);
    if (error.response) {
      console.error(`   Response: ${JSON.stringify(error.response.body, null, 2)}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY:\n');

  if (shouldSucceed) {
    console.log('✅ Everything looks good! Email should be delivered.');
  } else {
    console.log('❌ Issue found: Sender email not verified');
    console.log('   Fix: Verify your sender email in SendGrid dashboard');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}
