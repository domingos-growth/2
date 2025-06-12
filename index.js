const express = require('express');
const bodyParser = require('body-parser');
const v8n = require('v8n');

const app = express();
app.use(bodyParser.json());

const verifyToken = 'domingos2025';

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('🔗 Webhook verificado com sucesso!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', (req, res) => {
  const body = req.body;
  console.log('📥 Recebido:', JSON.stringify(body, null, 2));

  try {
    const nome = body.nome || '';
    v8n().string().minLength(3).check(nome);
    console.log('✅ Nome válido:', nome);
  } catch (err) {
    console.error('❌ Nome inválido:', err.message);
  }

  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.send('🚀 Webhook Domingos Growth com validação V8n funcionando!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 Rodando na porta ${PORT}`));
