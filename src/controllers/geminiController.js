/**
 * Controller para integração com Google Gemini AI
 */

const axios = require('axios');
const Joi = require('joi');

// Configurações do Gemini
const GEMINI_API_KEY = 'AIzaSyAhjxzyjkWzoGVOiHpk84lWBTJ_DyEKSt0';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-1.5-flash';

// Armazenamento temporário de conversas (use Redis em produção)
const conversations = new Map();

// Contexto educacional para crianças
const ROBOTICS_CONTEXT = `Você é um assistente educacional de robótica para crianças de 8 a 12 anos.

REGRAS IMPORTANTES:
- Respostas SEMPRE curtas (máximo 3 frases)
- Use MUITOS emojis em todas as respostas 🤖⚡🔧
- Linguagem simples e divertida
- Sempre termine com uma pergunta curta para manter a conversa
- Use analogias com coisas que crianças conhecem (brinquedos, animais, etc)
- Seja super animado e positivo!

Tópicos: Arduino, robôs, sensores, programação básica, projetos divertidos.

Exemplo de resposta boa:
"Sensores são como os olhos e ouvidos do robô! 👀👂 Eles ajudam o robô a 'ver' e 'sentir' o mundo. Que tipo de sensor você quer aprender? 🤔✨"`;

// Schema de validação
const chatSchema = Joi.object({
  message: Joi.string().required().min(1).max(1000),
  sessionId: Joi.string().required(),
  context: Joi.string().valid('robotics_education', 'general').default('robotics_education')
});

/**
 * Formata histórico para o Gemini
 */
function formatHistoryForGemini(history) {
  return history.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));
}

/**
 * Adiciona mensagem ao histórico
 */
function addToHistory(sessionId, message, sender) {
  if (!conversations.has(sessionId)) {
    conversations.set(sessionId, []);
  }
  
  const history = conversations.get(sessionId);
  history.push({
    text: message,
    sender: sender,
    timestamp: new Date()
  });
  
  // Limita a 20 mensagens para performance
  if (history.length > 20) {
    history.splice(0, history.length - 20);
  }
}

/**
 * Envia mensagem para o Gemini
 */
async function sendMessageToGemini(userMessage, history = []) {
  try {
    const contents = formatHistoryForGemini(history);
    
    // Adiciona mensagem atual
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const requestBody = {
      contents,
      systemInstruction: {
        parts: [{ text: ROBOTICS_CONTEXT }]
      },
      generationConfig: {
        temperature: 0.8,
        topK: 20,
        topP: 0.9,
        maxOutputTokens: 200,
        candidateCount: 1
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    };

    const response = await axios.post(
      `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const candidates = response.data.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('Nenhuma resposta gerada pelo Gemini');
    }

    const firstCandidate = candidates[0];
    if (firstCandidate.finishReason === 'SAFETY') {
      throw new Error('Resposta bloqueada por filtros de segurança');
    }

    const content = firstCandidate.content;
    if (!content || !content.parts || content.parts.length === 0) {
      throw new Error('Resposta vazia do Gemini');
    }

    return {
      success: true,
      response: content.parts[0].text,
      model: GEMINI_MODEL,
      provider: 'google-gemini',
      usage: {
        promptTokens: response.data.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.data.usageMetadata?.totalTokenCount || 0
      }
    };

  } catch (error) {
    console.error('Erro Gemini:', error.response?.data || error.message);
    
    let errorMessage = 'Erro ao processar mensagem';
    
    if (error.response?.status === 400) {
      errorMessage = 'Formato de mensagem inválido';
    } else if (error.response?.status === 403) {
      errorMessage = 'Chave de API inválida ou quota excedida';
    } else if (error.response?.status === 429) {
      errorMessage = 'Muitas requisições. Tente novamente em alguns segundos';
    } else if (error.response?.status >= 500) {
      errorMessage = 'Erro interno do Gemini. Tente novamente';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Endpoint principal do chat
 */
async function chatWithGemini(req, res) {
  try {
    const { error, value } = chatSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: `Dados inválidos: ${error.details[0].message}`
      });
    }

    const { message, sessionId, context } = value;

    console.log(`💬 Nova mensagem Gemini: sessão ${sessionId}`);

    // Obtém histórico da conversa
    const history = conversations.get(sessionId) || [];
    
    // Adiciona mensagem do usuário ao histórico
    addToHistory(sessionId, message, 'user');

    // Envia para Gemini
    const result = await sendMessageToGemini(message, history);

    if (result.success) {
      // Adiciona resposta da IA ao histórico
      addToHistory(sessionId, result.response, 'ai');

      res.status(200).json({
        success: true,
        response: result.response,
        model: result.model,
        provider: result.provider,
        sessionId: sessionId,
        conversationLength: conversations.get(sessionId).length,
        usage: result.usage
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Erro no chat Gemini:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
}

/**
 * Obtém histórico da conversa
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

    const history = conversations.get(sessionId) || [];

    res.status(200).json({
      success: true,
      sessionId: sessionId,
      messageCount: history.length,
      messages: history
    });

  } catch (error) {
    console.error('Erro ao obter histórico:', error.message);
    res.status(500).json({
      success: false,
      message: 'Falha ao obter histórico'
    });
  }
}

/**
 * Limpa histórico da conversa
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

    conversations.delete(sessionId);

    res.status(200).json({
      success: true,
      message: 'Histórico limpo com sucesso',
      sessionId: sessionId
    });

  } catch (error) {
    console.error('Erro ao limpar histórico:', error.message);
    res.status(500).json({
      success: false,
      message: 'Falha ao limpar histórico'
    });
  }
}

/**
 * Testa conexão com Gemini
 */
async function testGemini(req, res) {
  try {
    const testMessage = 'Oi! Como você está? Responda de forma curta e animada! 🤖✨';
    
    const result = await sendMessageToGemini(testMessage, []);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Gemini conectado com sucesso!',
        testResponse: result.response,
        model: result.model,
        provider: result.provider
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Erro no teste Gemini:', error.message);
    res.status(500).json({
      success: false,
      message: 'Falha no teste de conexão'
    });
  }
}

/**
 * Status do serviço Gemini
 */
async function getStatus(req, res) {
  try {
    res.status(200).json({
      success: true,
      message: 'Serviço Gemini funcionando',
      config: {
        model: GEMINI_MODEL,
        hasApiKey: !!GEMINI_API_KEY,
        activeConversations: conversations.size
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro no status Gemini:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro no serviço Gemini'
    });
  }
}

/**
 * Gera código Arduino
 */
async function generateArduinoCode(req, res) {
  try {
    const { description, components = [] } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Descrição é obrigatória'
      });
    }

    const codePrompt = `
Gere código Arduino SIMPLES para crianças: ${description}
Componentes: ${components.join(', ')}

LEMBRE-SE:
- Código bem simples
- Comentários em português
- Máximo 30 linhas
- Use emojis nos comentários! 🤖⚡
`;

    const result = await sendMessageToGemini(codePrompt, []);

    if (result.success) {
      res.status(200).json({
        success: true,
        code: result.response,
        model: result.model,
        provider: result.provider
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Erro ao gerar código:', error.message);
    res.status(500).json({
      success: false,
      message: 'Falha ao gerar código Arduino'
    });
  }
}

/**
 * Lista conversas ativas
 */
async function getActiveConversations(req, res) {
  try {
    const activeConversations = [];
    
    for (const [sessionId, messages] of conversations.entries()) {
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        activeConversations.push({
          sessionId,
          messageCount: messages.length,
          lastActivity: lastMessage.timestamp,
          lastMessage: lastMessage.text.substring(0, 50) + '...'
        });
      }
    }

    res.status(200).json({
      success: true,
      totalConversations: activeConversations.length,
      conversations: activeConversations
    });

  } catch (error) {
    console.error('Erro ao listar conversas:', error.message);
    res.status(500).json({
      success: false,
      message: 'Falha ao listar conversas ativas'
    });
  }
}

module.exports = {
  chatWithGemini,
  getHistory,
  clearHistory,
  testGemini,
  getStatus,
  generateArduinoCode,
  getActiveConversations
};