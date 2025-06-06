/**
 * Rotas para Chat com IA
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Rota principal para enviar mensagem
router.post('/chat', aiController.sendMessage);

// Rota para obter histórico de uma sessão
router.get('/history/:sessionId', aiController.getHistory);

// Rota para limpar histórico de uma sessão
router.delete('/history/:sessionId', aiController.clearHistory);

// Rota para listar conversas ativas
router.get('/conversations', aiController.getActiveConversations);

// Rota para obter provedores de IA disponíveis
router.get('/providers', aiController.getProviders);

// Rota para obter contextos disponíveis
router.get('/contexts', aiController.getContexts);

// Status do serviço de IA
router.get('/status', aiController.getStatus);

// Teste rápido do serviço
router.post('/test', aiController.testAI);

// Rotas de conveniência para diferentes contextos
router.post('/chat/robotics', (req, res) => {
  req.body.context = 'robotics_education';
  aiController.sendMessage(req, res);
});

router.post('/chat/general', (req, res) => {
  req.body.context = 'general';
  aiController.sendMessage(req, res);
});

// Rota para chat com provider específico
router.post('/chat/:provider', (req, res) => {
  const { provider } = req.params;
  req.body.provider = provider;
  aiController.sendMessage(req, res);
});

module.exports = router;
