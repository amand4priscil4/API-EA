/**
 * Rotas para Chat Educacional Edu-Ardu
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Rota para iniciar nova conversa educacional
router.post('/start', chatController.startChat);

// Rota para enviar mensagem/resposta no chat
router.post('/message', chatController.sendMessage);

// Rota para obter histórico de uma conversa específica
router.get('/history/:conversationId', chatController.getHistory);

// Rota para listar todas as conversas de um usuário
router.get('/user/:userId', chatController.getUserChats);

// Rota para finalizar conversa e salvar progresso
router.post('/end/:conversationId', chatController.endChat);

// Rota para obter sugestões contextuais
router.get('/suggestions/:conversationId', chatController.getSuggestions);

// Health check específico do chat
router.get('/health', chatController.chatHealthCheck);

// Rotas de conveniência para tipos específicos de lição
router.post('/lesson/computational-thinking', (req, res) => {
  req.body.lessonType = 'computational_thinking';
  chatController.startChat(req, res);
});

router.post('/lesson/robotics-basic', (req, res) => {
  req.body.lessonType = 'robotics_basic';
  chatController.startChat(req, res);
});

router.post('/lesson/arduino-intro', (req, res) => {
  req.body.lessonType = 'arduino_intro';
  chatController.startChat(req, res);
});

// Rota para reiniciar conversa (finaliza atual e inicia nova)
router.post('/restart/:conversationId', async (req, res) => {
  try {
    // Finaliza conversa atual
    await chatController.endChat(req, res);

    // Inicia nova conversa
    req.body.lessonType = req.body.lessonType || 'introduction';
    await chatController.startChat(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao reiniciar conversa'
    });
  }
});

module.exports = router;
