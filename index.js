require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const CONTEXTO_BASE = require('./prompt'); // se estiver em outro arquivo

const app = express();
app.use(bodyParser.json());

const verifyToken = process.env.VERIFY_TOKEN || 'domingos2025';
const whatsappToken = process.env.WHATSAPP_TOKEN;
const openaiKey = process.env.OPENAI_API_KEY;

let usuarios = {}; // Armazena info por número

// Verificação do Webhook
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
  const texto = message?.text?.body;

  if (texto) {
    console.log("📩 Mensagem recebida:", texto);

    // Se não houver contexto salvo, inicia com apresentação e salva estado
    const primeiraInteracao = !usuarios[from];
    if (primeiraInteracao) {
      usuarios[from] = { apresentou: true };
    }

    // Constroi prompt com histórico
    const prompt = `
${CONTEXTO_BASE}

Mensagem do cliente: "${texto}"

${primeiraInteracao ? "⚠️ Essa é a primeira mensagem. Apresente-se como Ana Julia e pergunte o nome do lead." : ""}
Lembre-se: responda de forma consultiva e com tom humano.
    `;

    // Faz delay antes de responder
    const delay = primeiraInteracao ? 60000 : Math.floor(Math.random() * (90000 - 5000 + 1) + 5000);

    try {
      const gptResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: CONTEXTO_BASE },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const respostaIA = gptResponse.data.choices[0].message.content;

      setTimeout(async () => {
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

        console.log("🤖 Resposta enviada:", respostaIA);
      }, delay);

    } catch (err) {
      console.error("❌ Erro ao gerar ou enviar resposta:", err.response?.data || err.message);
    }
  }

  res.sendStatus(200);
});

// Inicia servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🔥 Webhook com ChatGPT rodando na porta ${PORT}`));
