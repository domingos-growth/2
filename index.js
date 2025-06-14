
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const verifyToken = 'domingos2025';
const whatsappToken = process.env.WHATSAPP_TOKEN;

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === verifyToken) {
    console.log('✅ Webhook verificado com sucesso!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  const entry = req.body.entry?.[0];
  const change = entry?.changes?.[0];
  const message = change?.value?.messages?.[0];
  const phoneNumberId = change?.value?.metadata?.phone_number_id;
  const from = message?.from;

  if (message?.text?.body) {
    console.log("📩 Mensagem recebida:", message.text.body);

    try {
      await axios.post(\`https://graph.facebook.com/v17.0/\${phoneNumberId}/messages`, {
        messaging_product: "whatsapp",
        to: from,
        text: { body: "✅ Recebido com sucesso! 🚀" }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${whatsappToken}\`
        }
      });

      console.log("✅ Mensagem de resposta enviada!");
    } catch (error) {
      console.error("❌ Erro ao enviar resposta:", error.response?.data || error.message);
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`🔥 Webhook básico rodando na porta \${PORT}`));
