const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: 'syedsam7edu@gmail.com', // Your actual email
  from: process.env.FROM_EMAIL,
  subject: 'Test Email from JobHunt AI',
  text: 'If you receive this, SendGrid is working!',
  html: '<strong>If you receive this, SendGrid is working!</strong>',
};

sgMail
  .send(msg)
  .then(() => {
    console.log('✅ Email sent successfully!');
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    if (error.response) {
      console.error(error.response.body);
    }
  });