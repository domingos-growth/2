const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const v8n = require('v8n');

const app = express();
app.use(bodyParser.json());

const verifyToken = 'domingos2025';
const openAiKey =  process.env.OPENAI_API_KEY;  // 
const whatsappToken = process.env.WHATSAPP_TOKEN;  //

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
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

  if (message?.text?.body) {
    const userText = message.text.body;
    const from = message.from;

    console.log("📩 Mensagem recebida:", userText);

    try {
      v8n().string().minLength(1).check(userText);

      const gptResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Você é um assistente virtual da Domingos Growth no WhatsApp. Responda de forma objetiva, profissional e direta." },
          { role: "user", content: userText }
        ]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiKey}`
        }
      });

      const respostaIA = gptResponse.data.choices[0].message.content;
      console.log('🤖 Resposta da IA:', respostaIA);

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

    } catch (err) {
      console.error('❌ Erro ao processar a mensagem:', err.message);
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 Webhook com ChatGPT-4 rodando na porta ${PORT}`));
