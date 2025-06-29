const express = require('express');
const sgMail = require('@sendgrid/mail');
const cors = require('cors');

sgMail.setApiKey(process.env.SEND_GRID_KEY);

const app = express();
app.use(express.json());
app.use(cors());

app.post('/send-missed-dosage-email', async (req, res) => {
  const { to, subject, text } = req.body;
  try {
    const fullText = `Hello\n\n${text}\n\nBest,\nRxManagement`;
    await sgMail.send({
      to,
      from: 'epicavnit@gmail.com',
      subject,
      text: fullText,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('SendGrid error:', err);
    res.status(500).json({ error: err.toString() });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`SendGrid email server running on port ${PORT}`)); 