/**
 * Controller para Chat com IA
 */

const aiService = require('../services/aiService');
const Joi = require('joi');

// Schema de validação para chat
const chatSchema = Joi.object({
  message: Joi.string().required().min(1).max(2000),
  sessionId: Joi.string().required(),
  context: Joi.string().valid('robotics_education', 'general').default('general'),
  provider: Joi.string().valid('openai', 'anthropic', 'gemini', 'local', 'mock').optional(),
  options: Joi.object({
    model: Joi.string().optional(),
    maxTokens: Joi.number().integer().min(50).max(2000).optional(),
    temperature: Joi.number().min(0).max(2).optional()
  }).optional()
});

/**
 * Envia mensagem para IA
 */
async function sendMessage(req, res) {
  try {
    const { error, value } = chatSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: `Dados inválidos: ${error.details[0].message}`
      });
    }

    const { message, sessionId, context, provider, options } = value;

    console.log(`Nova mensagem IA: sessão ${sessionId}, contexto ${context}`);

    const result = await aiService.sendMessage(message, sessionId, context, {
      provider,
      ...options
    });

    res.status(200).json({
      success: true,
      response: result.response,
      model: result.model,
      provider: result.provider,
      sessionId: result.sessionId,
      conversationLength: result.conversationLength
    });
  } catch (error) {
    console.error('Erro no chat IA:', error.message);
    res.status(500).json({
      success: false,
      message: `Falha ao processar mensagem: ${error.message}`
    });
  }
}

/**
 * Obtém histórico de uma conversa
 */
async function getHistory(req, res) {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'ID da sessão é obrigatório'
      });
    }

    const history = aiService.getConversationHistory(sessionId);

    res.status(200).json({
      success: true,
      sessionId: sessionId,
      messageCount: history.length,
      messages: history.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        model: msg.model || null
      }))
    });
  } catch (error) {
    console.error('Erro ao obter histórico:', error.message);
    res.status(500).json({
      success: false,
      message: `Falha ao obter histórico: ${error.message}`
    });
  }
}

/**
 * Limpa histórico de uma conversa
 */
async function clearHistory(req, res) {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'ID da sessão é obrigatório'
      });
    }

    const cleared = aiService.clearConversation(sessionId);

    res.status(200).json({
      success: true,
      message: 'Histórico limpo com sucesso',
      sessionId: sessionId,
      cleared: cleared
    });
  } catch (error) {
    console.error('Erro ao limpar histórico:', error.message);
    res.status(500).json({
      success: false,
      message: `Falha ao limpar histórico: ${error.message}`
    });
  }
}

/**
 * Lista conversas ativas
 */
async function getActiveConversations(req, res) {
  try {
    const conversations = aiService.getActiveConversations();

    res.status(200).json({
      success: true,
      totalConversations: conversations.length,
      conversations: conversations
    });
  } catch (error) {
    console.error('Erro ao listar conversas:', error.message);
    res.status(500).json({
      success: false,
      message: `Falha ao listar conversas: ${error.message}`
    });
  }
}

/**
 * Obtém provedores disponíveis
 */
async function getProviders(req, res) {
  try {
    const providers = aiService.getAvailableProviders();

    res.status(200).json({
      success: true,
      availableProviders: providers,
      currentProvider: process.env.AI_PROVIDER || 'mock',
      hasApiKey: !!process.env.AI_API_KEY
    });
  } catch (error) {
    console.error('Erro ao obter provedores:', error.message);
    res.status(500).json({
      success: false,
      message: `Falha ao obter provedores: ${error.message}`
    });
  }
}

/**
 * Status do serviço de IA
 */
async function getStatus(req, res) {
  try {
    const status = aiService.getStatus();

    res.status(200).json({
      success: true,
      message: 'Serviço de IA funcionando normalmente',
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro no status IA:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro no serviço de IA'
    });
  }
}

/**
 * Teste rápido do serviço
 */
async function testAI(req, res) {
  try {
    const testSessionId = 'test_' + Date.now();
    const testMessage = req.body.message || 'Olá! Este é um teste do sistema de IA.';

    const result = await aiService.sendMessage(
      testMessage,
      testSessionId,
      'general',
      { provider: 'mock' } // Força usar mock para teste
    );

    // Limpa sessão de teste
    aiService.clearConversation(testSessionId);

    res.status(200).json({
      success: true,
      message: 'Teste realizado com sucesso',
      testMessage: testMessage,
      aiResponse: result.response,
      model: result.model,
      provider: result.provider
    });
  } catch (error) {
    console.error('Erro no teste IA:', error.message);
    res.status(500).json({
      success: false,
      message: `Falha no teste: ${error.message}`
    });
  }
}

/**
 * Configurações contextuais
 */
async function getContexts(req, res) {
  try {
    const contexts = {
      general: {
        name: 'Geral',
        description: 'Assistente geral para qualquer assunto'
      },
      robotics_education: {
        name: 'Robótica Educacional',
        description: 'Especializado em robótica, Arduino e eletrônica'
      }
    };

    res.status(200).json({
      success: true,
      availableContexts: contexts,
      defaultContext: 'general'
    });
  } catch (error) {
    console.error('Erro ao obter contextos:', error.message);
    res.status(500).json({
      success: false,
      message: `Falha ao obter contextos: ${error.message}`
    });
  }
}

module.exports = {
  sendMessage,
  getHistory,
  clearHistory,
  getActiveConversations,
  getProviders,
  getStatus,
  testAI,
  getContexts
};
