const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const verifyToken = 'domingos2025';
const whatsappToken = process.env.WHATSAPP_TOKEN;
const openAiKey = process.env.OPENAI_API_KEY;

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
    const userText = message.text.body;
    console.log("📩 Mensagem recebida:", userText);

    try {
      const gptResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'Você é um assistente da Domingos Growth. Responda de forma profissional, objetiva e humanizada.' },
            { role: 'user', content: userText }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${openAiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const respostaIA = gptResponse.data.choices[0].message.content;
      console.log("🤖 Resposta da IA:", respostaIA);

      await axios.post(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
        messaging_product: "whatsapp",
        to: from,
        text: { body: respostaIA }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${whatsappToken}`
        }
      });

    } catch (error) {
      console.error("❌ Erro no processamento da IA ou envio:", error.response?.data || error.message);
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 Webhook com ChatGPT rodando na porta ${PORT}`));

