const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

console.log('\n📧 Sending Test Email with Authenticated Domain\n');
console.log('='.repeat(60));

const msg = {
  to: 'syedsam7edu@gmail.com',
  from: {
    email: process.env.FROM_EMAIL,
    name: 'Jobs4U AI'
  },
  subject: '✅ SendGrid Test - Domain Authenticated - ' + new Date().toLocaleString(),
  text: 'SUCCESS! If you receive this email, your SendGrid domain authentication is working correctly!',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">✅ SendGrid Configuration Successful!</h2>

      <p>Congratulations! Your SendGrid email service is now properly configured.</p>

      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Configuration Details:</h3>
        <ul style="line-height: 1.8;">
          <li><strong>From:</strong> ${process.env.FROM_EMAIL}</li>
          <li><strong>Domain:</strong> jobs4uai.com</li>
          <li><strong>Authentication:</strong> Domain Authenticated ✅</li>
          <li><strong>DNS Records:</strong> All Valid ✅</li>
          <li><strong>Sent:</strong> ${new Date().toLocaleString()}</li>
        </ul>
      </div>

      <p>You can now use SendGrid to send:</p>
      <ul>
        <li>Welcome emails to new users</li>
        <li>Daily job alert notifications</li>
        <li>Weekly job digest emails</li>
        <li>Application status updates</li>
      </ul>

      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        This is a test email from the Jobs4U AI application.
      </p>
    </div>
  `,
  trackingSettings: {
    clickTracking: {
      enable: true
    },
    openTracking: {
      enable: true
    }
  }
};

console.log(`\nSending email to: ${msg.to}`);
console.log(`From: ${msg.from.email}`);
console.log(`Subject: ${msg.subject}\n`);

sgMail
  .send(msg)
  .then((response) => {
    console.log('✅ EMAIL SENT SUCCESSFULLY!\n');
    console.log(`   Status Code: ${response[0].statusCode}`);
    console.log(`   Message ID: ${response[0].headers['x-message-id']}`);
    console.log('\n' + '='.repeat(60));
    console.log('\n📬 Next Steps:\n');
    console.log('   1. Check your inbox: syedsam7edu@gmail.com');
    console.log('   2. Also check your spam/junk folder');
    console.log('   3. Allow 1-2 minutes for delivery');
    console.log('\n   If you receive the email, SendGrid is working! 🎉');
    console.log('\n' + '='.repeat(60) + '\n');
  })
  .catch((error) => {
    console.error('❌ EMAIL SEND FAILED\n');
    console.error(`   Error: ${error.message}\n`);

    if (error.response) {
      console.error('   Response Body:');
      console.error(JSON.stringify(error.response.body, null, 2));
      console.error('\n' + '='.repeat(60));
      console.error('\n🔧 Troubleshooting:\n');

      const errorBody = error.response.body;

      if (errorBody.errors) {
        errorBody.errors.forEach((err) => {
          console.error(`   - ${err.message}`);

          if (err.message.includes('does not contain a valid address') ||
              err.message.includes('not verified')) {
            console.error('\n   SOLUTION: The FROM_EMAIL needs verification.');
            console.error('   Go to: https://app.sendgrid.com/settings/sender_auth/senders');
            console.error('   Click "Verify an Address" and verify: ' + process.env.FROM_EMAIL);
          }

          if (err.message.includes('Default domain')) {
            console.error('\n   SOLUTION: Set your domain as default.');
            console.error('   Go to: https://app.sendgrid.com/settings/sender_auth/domain');
            console.error('   Find jobs4uai.com and click "Set as Default"');
          }
        });
      }
      console.error('\n' + '='.repeat(60) + '\n');
    }
  });
