/**
 * Rotas para integração com Google Gemini AI
 */

const express = require('express');
const router = express.Router();
const geminiController = require('../controllers/geminiController');

// Middleware de logging para rotas Gemini
router.use((req, res, next) => {
  console.log(`🤖 Gemini Route: ${req.method} ${req.path}`);
  next();
});

/**
 * @route POST /api/gemini/chat
 * @desc Chat principal com Gemini AI
 * @body { message, sessionId, context? }
 */
router.post('/chat', geminiController.chatWithGemini);

/**
 * @route GET /api/gemini/history/:sessionId
 * @desc Obtém histórico de uma conversa
 * @param sessionId - ID da sessão
 */
router.get('/history/:sessionId', geminiController.getHistory);

/**
 * @route DELETE /api/gemini/history/:sessionId
 * @desc Limpa histórico de uma conversa
 * @param sessionId - ID da sessão
 */
router.delete('/history/:sessionId', geminiController.clearHistory);

/**
 * @route GET /api/gemini/test
 * @desc Testa conectividade com Gemini
 */
router.get('/test', geminiController.testGemini);

/**
 * @route GET /api/gemini/status
 * @desc Status do serviço Gemini
 */
router.get('/status', geminiController.getStatus);

/**
 * @route POST /api/gemini/generate-code
 * @desc Gera código Arduino usando Gemini
 * @body { description, components? }
 */
router.post('/generate-code', geminiController.generateArduinoCode);

/**
 * @route GET /api/gemini/conversations
 * @desc Lista conversas ativas
 */
router.get('/conversations', geminiController.getActiveConversations);

/**
 * @route GET /api/gemini/health
 * @desc Health check específico do Gemini
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Gemini service is running',
    service: 'gemini-ai',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;