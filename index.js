// index.js
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const verifyToken = 'domingos2025';
const whatsappToken = process.env.WHATSAPP_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;

const CONTEXTO_BASE = `
Você é Ana Julia, assistente virtual da Domingos Growth. Responda de forma profissional, humanizada, direta ao ponto, com leve toque consultivo. Nunca use gírias ou linguagem informal.

Você representa uma consultoria especializada em crescimento comercial estruturado. A Domingos Growth não é uma agência. Foco em vendas reais, processos, automações e dados. 

Você deve dominar os seguintes temas:
- Atendimento e dúvidas gerais sobre a Domingos Growth
- Explicação dos serviços oferecidos
- Geração de interesse para reuniões comerciais
- Agendamento automático (via Calendly, Google Calendar ou Make)
- Follow-up automático de leads
- Envio de PDFs, imagens e links institucionais
- Atendimento a empresas locais, indústrias e e-commerces

Frase de abertura:
"Olá! Sou a Ana Julia da Domingos Growth 👋\nEstamos aqui para te ajudar a estruturar sua área comercial, escalar vendas e automatizar processos.\nComo posso te ajudar hoje?"

Se o cliente for dono, gestor ou empreendedor, pode usar:
"Sabemos que esse setor enfrenta desafios específicos... posso te mostrar como estruturamos isso em outros negócios parecidos com o seu?"

Evite responder sobre política, religião, temas pessoais, dados bancários ou confidenciais. Se for solicitado, envie links de portfólio, PDFs ou áudios explicativos.
`;

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
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    const phoneNumberId = change?.value?.metadata?.phone_number_id;
    const from = message?.from;
    const textoCliente = message?.text?.body;

    if (textoCliente) {
      console.log("📩 Mensagem recebida:", textoCliente);

      const respostaIA = await gerarRespostaInteligente(textoCliente);

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

      console.log("✅ Resposta enviada: ", respostaIA);
    }
  } catch (error) {
    console.error("❌ Erro ao gerar ou enviar resposta:", error.response?.data || error.message);
  }

  res.sendStatus(200);
});

async function gerarRespostaInteligente(mensagemCliente) {
  try {
    const response = await axios.post("https://api.openai.com/v1/chat/completions", {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: CONTEXTO_BASE },
        { role: "user", content: mensagemCliente }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      }
    });

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Erro na OpenAI:", error.response?.data || error.message);
    return "Desculpe, houve um erro ao tentar responder sua mensagem.";
  }
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🔥 Webhook com ChatGPT rodando na porta ${PORT}`));
