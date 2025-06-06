require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const robotRoutes = require('./routes/robotRoutes');
const chatRoutes = require('./routes/chatRoutes');
const aiRoutes = require('./routes/aiRoutes');
const setupRobotSocket = require('./socket/robotSocket');
const setupChatSocket = require('./socket/chatSocket');

// Configuração do servidor
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Rotas da API
app.use('/api/robot', robotRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai', aiRoutes);

// Rota de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EduArdu MVP Server está rodando',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EduArdu MVP - Sistema Completo de Robótica Educacional',
    endpoints: {
      health: '/health',
      robot: '/api/robot/*',
      chat: '/api/chat/*',
      ai: '/api/ai/*',
      websockets: {
        robot: '/robot',
        chat: '/chat'
      }
    },
    docs: {
      robot: {
        'Listar portas': 'GET /api/robot/ports',
        Conectar: 'POST /api/robot/connect',
        Status: 'GET /api/robot/status',
        'Enviar comando': 'POST /api/robot/command',
        Parar: 'POST /api/robot/emergency-stop'
      },
      chat_educacional: {
        'Iniciar conversa': 'POST /api/chat/start',
        'Enviar mensagem': 'POST /api/chat/message',
        Histórico: 'GET /api/chat/history/:id',
        Finalizar: 'POST /api/chat/end/:id'
      },
      chat_ia: {
        'Chat com IA': 'POST /api/ai/chat',
        Histórico: 'GET /api/ai/history/:sessionId',
        'Limpar histórico': 'DELETE /api/ai/history/:sessionId',
        'Status IA': 'GET /api/ai/status',
        'Teste IA': 'POST /api/ai/test'
      }
    }
  });
});

// Setup dos WebSockets
setupRobotSocket(io);
setupChatSocket(io);

// Middleware de tratamento de erro 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint não encontrado',
    availableEndpoints: ['/api/robot/*', '/health', '/']
  });
});

// Middleware de tratamento de erros gerais
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
  });
});

// Tratamento de sinais de processo
process.on('SIGINT', async () => {
  console.log('\nRecebido SIGINT. Encerrando servidor...');

  // Tenta desconectar do Arduino se conectado
  try {
    const serialService = require('./services/serialService');
    if (serialService.isDeviceConnected()) {
      await serialService.disconnect();
      console.log('Arduino desconectado com sucesso');
    }
  } catch (error) {
    console.error('Erro ao desconectar Arduino:', error.message);
  }

  // Fecha o servidor
  server.close(() => {
    console.log('Servidor encerrado');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('Recebido SIGTERM. Encerrando servidor...');

  try {
    const serialService = require('./services/serialService');
    if (serialService.isDeviceConnected()) {
      await serialService.disconnect();
    }
  } catch (error) {
    console.error('Erro ao desconectar Arduino:', error.message);
  }

  server.close(() => {
    console.log('Servidor encerrado');
    process.exit(0);
  });
});

// Inicia o servidor
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║           EduArdu MVP Server               ║
║                                            ║
║  🚀 Servidor rodando na porta ${PORT}           ║
║  🌐 http://localhost:${PORT}                   ║
║  📡 WebSockets: /robot, /chat              ║
║  📋 Health: /health                        ║
║  🤖 Robot API: /api/robot/*                ║
║  💬 Chat Educacional: /api/chat/*          ║
║  🧠 Chat IA: /api/ai/*                     ║
╚════════════════════════════════════════════╝
  `);

  console.log('APIs disponíveis:');
  console.log('🤖 ROBOT:');
  console.log('• GET    /api/robot/ports        - Lista portas USB');
  console.log('• POST   /api/robot/connect      - Conecta ao Arduino');
  console.log('• POST   /api/robot/command      - Envia comando');
  console.log('• GET    /api/robot/status       - Status da conexão');
  console.log('• POST   /api/robot/emergency-stop - Parada de emergência');
  console.log('');
  console.log('💬 CHAT EDUCACIONAL:');
  console.log('• POST   /api/chat/start         - Inicia conversa');
  console.log('• POST   /api/chat/message       - Envia mensagem');
  console.log('• GET    /api/chat/history/:id   - Histórico da conversa');
  console.log('• POST   /api/chat/end/:id       - Finaliza conversa');
  console.log('• GET    /api/chat/health        - Status do chat');
  console.log('');
  console.log('🧠 CHAT IA:');
  console.log('• POST   /api/ai/chat            - Chat com IA');
  console.log('• GET    /api/ai/history/:id     - Histórico da sessão');
  console.log('• DELETE /api/ai/history/:id     - Limpar histórico');
  console.log('• GET    /api/ai/status          - Status da IA');
  console.log('• POST   /api/ai/test            - Teste da IA');
  console.log('\nPressione Ctrl+C para parar o servidor');
});
