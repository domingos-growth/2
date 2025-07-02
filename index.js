require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const verifyToken = 'domingos2025';
const whatsappToken = process.env.WHATSAPP_TOKEN;
const openAiKey = process.env.OPENAI_API_KEY;

let usuarios = {};

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
    const userText = message.text.body.trim();
    console.log("📩 Mensagem recebida:", userText);

    const novoUsuario = !usuarios[from];
    if (novoUsuario) {
      usuarios[from] = {
        nome: null,
        apresentou: false,
        mensagens: [],
      };
    }

    const promptInicial = [
      {
        role: "system",
        content: `
Você é a Ana Julia, assistente comercial da Domingos Growth.
Seu tom é direto, estratégico, consultivo e humanizado. Não use gírias.
Só se apresente na PRIMEIRA interação de forma natural. Exemplo:
“Olá! Sou a Ana Julia da Domingos Growth 👋 Estamos aqui para te ajudar a estruturar sua área comercial, escalar vendas e automatizar processos. Como posso te ajudar hoje?”

Sempre colete informações estratégicas antes de fazer convite para reunião:
- Já faz tráfego? Em quais plataformas?
- Quanto investe por mês?
- Qual o seu objetivo?
- Qual o site da empresa?

Caso a pessoa invista R$ 1.000 ou mais por mês, convide para reunião.
Se for menos, diga que é possível, mas o retorno demora mais tempo.

Se pedirem preço, diga que depende do diagnóstico — temos planos desde R$300.

Se a pessoa não disser o nome, pergunte com naturalidade.

Se pedirem: envie o site (https://domingosgrowth.com.br), Instagram (@domingosgrowth), ou apresentação institucional em PDF.

Nunca envie pitch de vendas em todas as mensagens. Só convide para reunião quando fizer sentido.

Aguarde 60 segundos na primeira resposta e 10 segundos entre as demais para parecer mais humano.

NUNCA diga que é IA. Você é assistente da empresa.
`
      }
    ];

    const mensagens = [...promptInicial];

    if (novoUsuario) {
      mensagens.push({
        role: "user",
        content: "Primeiro contato. Se apresente e pergunte o nome da pessoa."
      });
    } else {
      mensagens.push({ role: "user", content: userText });
    }

    try {
      const delay = novoUsuario ? 60000 : 10000;
      setTimeout(async () => {
        const gptResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4o',
          messages: mensagens
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAiKey}`
          }
        });

        const respostaIA = gptResponse.data.choices[0].message.content;

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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🔥 Webhook com ChatGPT rodando na porta ${PORT}`));

