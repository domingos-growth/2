const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const verifyToken = 'domingos2025';
const whatsappToken = process.env.WHATSAPP_TOKEN;
const openaiKey = process.env.OPENAI_API_KEY;

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
  const body = message?.text?.body;

  if (body) {
    console.log("📩 Mensagem recebida:", body);

    try {
      // ENVIA PARA OPENAI
      const gptResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: body }],
        temperature: 0.7
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        }
      });

      const reply = gptResponse.data.choices[0].message.content;

      // ENVIA PARA WHATSAPP
      await axios.post(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
        messaging_product: "whatsapp",
        to: from,
        text: { body: reply }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${whatsappToken}`
        }
      });

      console.log("✅ Resposta enviada com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao gerar ou enviar resposta:", error.response?.data || error.message);
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🔥 Webhook rodando na porta ${PORT}`));

