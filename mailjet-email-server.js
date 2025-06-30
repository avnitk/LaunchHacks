const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mailjet = require('node-mailjet');
require('dotenv').config();

const mailjetClient = mailjet.apiConnect(
  process.env.MJ_APIKEY_PUBLIC,
  process.env.MJ_APIKEY_PRIVATE
);

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/send-missed-dosage-email', async (req, res) => {
  const { to, subject, text } = req.body;
  try {
    const request = mailjetClient
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: 'epicavnit@gmail.com',
              Name: 'RxManagement'
            },
            To: [
              {
                Email: to,
              }
            ],
            Subject: subject,
            TextPart: text,
            HTMLPart: `<p>${text.replace(/\n/g, '<br>')}</p>`
          }
        ]
      });
    const result = await request;
    res.json({ success: true, result: result.body });
  } catch (err) {
    console.error('Mailjet error:', err);
    res.status(500).json({ error: err.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mailjet email server running on port ${PORT}`);
}); 