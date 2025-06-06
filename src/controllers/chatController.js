/**
 * Controller para Chat Educacional Edu-Ardu
 *
 * Gerencia todas as interações de chat educacional
 */

const chatEducationalService = require('../services/chatEducationalService');
const Joi = require('joi');

// Schemas de validação
const startChatSchema = Joi.object({
  userId: Joi.string().required(),
  lessonType: Joi.string()
    .valid('introduction', 'computational_thinking', 'robotics_basic', 'arduino_intro')
    .default('introduction')
});

const chatResponseSchema = Joi.object({
  conversationId: Joi.string().required(),
  userChoice: Joi.string().required(),
  userText: Joi.string().optional().allow('', null)
});

/**
 * Inicia nova conversa educacional
 */
async function startChat(req, res) {
  try {
    const { error, value } = startChatSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: `Dados inválidos: ${error.details[0].message}`
      });
    }

    const { userId, lessonType } = value;

    console.log(`Iniciando chat educacional para usuário: ${userId}, lição: ${lessonType}`);

    const result = chatEducationalService.startConversation(userId, lessonType);

    res.status(200).json({
      success: true,
      message: 'Conversa iniciada com sucesso',
      data: {
        conversationId: result.conversationId,
        eduArduMessage: result.message,
        progress: result.progress,
        avatar: 'edu-ardu'
      }
    });
  } catch (error) {
    console.error('Erro ao iniciar chat:', error.message);
    res.status(500).json({
      success: false,
      message: `Falha ao iniciar conversa: ${error.message}`
    });
  }
}

/**
 * Processa resposta do usuário no chat
 */
async function sendMessage(req, res) {
  try {
    const { error, value } = chatResponseSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: `Dados inválidos: ${error.details[0].message}`
      });
    }

    const { conversationId, userChoice, userText } = value;

    console.log(`Processando resposta do usuário: ${conversationId}, escolha: ${userChoice}`);

    const result = chatEducationalService.processUserResponse(conversationId, userChoice, userText);

    res.status(200).json({
      success: true,
      message: 'Resposta processada com sucesso',
      data: {
        eduArduMessage: result.message,
        progress: result.progress,
        context: result.context,
        avatar: 'edu-ardu'
      }
    });
  } catch (error) {
    console.error('Erro ao processar mensagem:', error.message);
    res.status(500).json({
      success: false,
      message: `Falha ao processar mensagem: ${error.message}`
    });
  }
}

/**
 * Obtém histórico da conversa
 */
async function getHistory(req, res) {
  try {
    const { conversationId } = req.params;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'ID da conversa é obrigatório'
      });
    }

    console.log(`Obtendo histórico da conversa: ${conversationId}`);

    const history = chatEducationalService.getConversationHistory(conversationId);

    res.status(200).json({
      success: true,
      data: {
        messages: history.messages,
        progress: history.progress,
        context: history.context
      }
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
 * Lista conversas do usuário
 */
async function getUserChats(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário é obrigatório'
      });
    }

    console.log(`Listando conversas do usuário: ${userId}`);

    const conversations = chatEducationalService.getUserConversations(userId);

    res.status(200).json({
      success: true,
      data: {
        conversations: conversations,
        totalConversations: conversations.length
      }
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
 * Finaliza conversa
 */
async function endChat(req, res) {
  try {
    const { conversationId } = req.params;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'ID da conversa é obrigatório'
      });
    }

    console.log(`Finalizando conversa: ${conversationId}`);

    const finalProgress = chatEducationalService.endConversation(conversationId);

    res.status(200).json({
      success: true,
      message: 'Conversa finalizada com sucesso',
      data: {
        finalProgress: finalProgress,
        badges: finalProgress.badges,
        completionRate: (finalProgress.correctAnswers / finalProgress.completedSteps) * 100
      }
    });
  } catch (error) {
    console.error('Erro ao finalizar conversa:', error.message);
    res.status(500).json({
      success: false,
      message: `Falha ao finalizar conversa: ${error.message}`
    });
  }
}

/**
 * Obtém sugestões de resposta baseadas no contexto
 */
async function getSuggestions(req, res) {
  try {
    const { conversationId } = req.params;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'ID da conversa é obrigatório'
      });
    }

    // Busca conversa para gerar sugestões contextuais
    const history = chatEducationalService.getConversationHistory(conversationId);

    // Gera sugestões baseadas no contexto atual
    const suggestions = generateContextualSuggestions(history.context, history.messages);

    res.status(200).json({
      success: true,
      data: {
        suggestions: suggestions,
        context: history.context
      }
    });
  } catch (error) {
    console.error('Erro ao obter sugestões:', error.message);
    res.status(500).json({
      success: false,
      message: `Falha ao obter sugestões: ${error.message}`
    });
  }
}

/**
 * Gera sugestões contextuais para o usuário
 */
function generateContextualSuggestions(context, messages) {
  const suggestions = [];

  // Sugestões baseadas no tópico preferido
  if (context.preferredTopic) {
    switch (context.preferredTopic) {
      case 'how_robots_think':
        suggestions.push(
          { text: 'Me explica melhor', type: 'clarification' },
          { text: 'Quero um exemplo prático', type: 'example' },
          { text: 'Como aplicar isso?', type: 'application' }
        );
        break;
      case 'programming_robots':
        suggestions.push(
          { text: 'Parece complicado...', type: 'difficulty' },
          { text: 'Vamos programar algo!', type: 'hands_on' },
          { text: 'Que linguagem usar?', type: 'technical' }
        );
        break;
    }
  }

  // Sugestões baseadas no nível de dificuldade
  if (context.difficultyLevel === 'beginner') {
    suggestions.push(
      { text: 'Pode ir mais devagar?', type: 'pace' },
      { text: 'Ainda não entendi...', type: 'confusion' }
    );
  }

  // Sugestões padrão sempre disponíveis
  suggestions.push(
    { text: 'Continuar', type: 'continue' },
    { text: 'Tenho uma dúvida', type: 'question' },
    { text: 'Quero fazer um quiz!', type: 'assessment' }
  );

  return suggestions.slice(0, 4); // Limita a 4 sugestões
}

/**
 * Health check específico para o chat
 */
async function chatHealthCheck(req, res) {
  try {
    const stats = {
      activeConversations: chatEducationalService.conversations.size,
      totalUsers: chatEducationalService.userProgress.size,
      systemStatus: 'operational',
      timestamp: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'Chat educacional funcionando normalmente',
      stats: stats
    });
  } catch (error) {
    console.error('Erro no health check do chat:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro no sistema de chat'
    });
  }
}

module.exports = {
  startChat,
  sendMessage,
  getHistory,
  getUserChats,
  endChat,
  getSuggestions,
  chatHealthCheck
};
