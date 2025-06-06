/**
 * Serviço de IA para Chat
 *
 * Integra com diferentes provedores de IA (OpenAI, Anthropic, Google, etc.)
 */

const axios = require('axios');

class AIService {
  constructor() {
    this.conversations = new Map(); // Armazena histórico de conversas
    this.provider = process.env.AI_PROVIDER || 'gemini'; // Default Gemini
    this.apiKey = process.env.AI_API_KEY || null;

    // Configurações por provedor
    this.configs = {
      openai: {
        baseURL: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo',
        endpoint: '/chat/completions'
      },
      anthropic: {
        baseURL: 'https://api.anthropic.com/v1',
        model: 'claude-3-sonnet-20240229',
        endpoint: '/messages'
      },
      gemini: {
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemini-pro',
        endpoint: '/models/gemini-pro:generateContent'
      },
      local: {
        baseURL: 'http://localhost:11434/v1', // Ollama local
        model: 'llama2',
        endpoint: '/chat/completions'
      }
    };

    // Sistema de prompts contextuais
    this.systemPrompts = {
      robotics_education: `Você é um assistente especializado em robótica educacional e tecnologia. 
      Seu nome é "Assistente IA" e você trabalha junto com o Edu-Ardu para ajudar estudantes.
      
      Características:
      - Explique conceitos de forma didática e acessível
      - Use exemplos práticos quando possível
      - Seja paciente e encorajador
      - Foque em robótica, Arduino, programação e eletrônica
      - Responda em português brasileiro
      - Use emojis ocasionalmente para deixar mais amigável
      - Se não souber algo, seja honesto e sugira recursos
      
      Evite:
      - Respostas muito técnicas sem explicação
      - Informações incorretas sobre eletrônica (segurança é importante)
      - Códigos muito complexos sem explicação
      
      Lembre-se: você está ajudando estudantes a aprender robótica de forma divertida e segura!`,

      general: `Você é um assistente IA útil e amigável. Responda de forma clara e concisa em português brasileiro.`
    };
  }

  /**
   * Envia mensagem para IA e retorna resposta
   */
  async sendMessage(message, sessionId, context = 'general', options = {}) {
    try {
      // Obtém ou cria histórico da conversa
      let conversation = this.conversations.get(sessionId) || [];

      // Adiciona mensagem do usuário ao histórico
      conversation.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      // Determina qual provedor usar
      const provider = options.provider || this.provider;

      // Se não tem API key, força usar mock
      const finalProvider = !this.apiKey && provider !== 'mock' ? 'mock' : provider;

      // Gera resposta baseada no provedor
      let response;
      switch (finalProvider) {
        case 'openai':
          response = await this.callOpenAI(conversation, context, options);
          break;
        case 'anthropic':
          response = await this.callAnthropic(conversation, context, options);
          break;
        case 'gemini':
          response = await this.callGemini(conversation, context, options);
          break;
        case 'local':
          response = await this.callLocal(conversation, context, options);
          break;
        case 'mock':
          response = await this.callMock(conversation, context, options);
          break;
        default:
          response = await this.callMock(conversation, context, options);
      }

      // Adiciona resposta da IA ao histórico
      conversation.push({
        role: 'assistant',
        content: response.text,
        timestamp: new Date(),
        model: response.model,
        provider: finalProvider
      });

      // Limita histórico a últimas 20 mensagens para não exceder limite de tokens
      if (conversation.length > 20) {
        conversation = conversation.slice(-20);
      }

      // Salva histórico atualizado
      this.conversations.set(sessionId, conversation);

      return {
        response: response.text,
        model: response.model,
        provider: finalProvider,
        conversationLength: conversation.length,
        sessionId: sessionId
      };
    } catch (error) {
      console.error('Erro no serviço de IA:', error.message);
      throw new Error(`Falha ao processar mensagem: ${error.message}`);
    }
  }

  /**
   * Chama API da OpenAI
   */
  async callOpenAI(conversation, context, options) {
    const config = this.configs.openai;
    const systemPrompt = this.systemPrompts[context] || this.systemPrompts.general;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversation.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    const response = await axios.post(
      `${config.baseURL}${config.endpoint}`,
      {
        model: options.model || config.model,
        messages: messages,
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7,
        stream: false
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      text: response.data.choices[0].message.content,
      model: response.data.model
    };
  }

  /**
   * Chama API da Anthropic (Claude)
   */
  async callAnthropic(conversation, context, options) {
    const config = this.configs.anthropic;
    const systemPrompt = this.systemPrompts[context] || this.systemPrompts.general;

    const messages = conversation.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    const response = await axios.post(
      `${config.baseURL}${config.endpoint}`,
      {
        model: options.model || config.model,
        max_tokens: options.maxTokens || 500,
        system: systemPrompt,
        messages: messages
      },
      {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      }
    );

    return {
      text: response.data.content[0].text,
      model: response.data.model
    };
  }

  /**
   * Chama API do Google Gemini
   */
  async callGemini(conversation, context, options) {
    const config = this.configs.gemini;
    const systemPrompt = this.systemPrompts[context] || this.systemPrompts.general;

    // Formata conversa para Gemini
    const contents = [
      { parts: [{ text: systemPrompt }] },
      ...conversation.map(msg => ({
        parts: [{ text: msg.content }],
        role: msg.role === 'assistant' ? 'model' : 'user'
      }))
    ];

    const response = await axios.post(`${config.baseURL}${config.endpoint}?key=${this.apiKey}`, {
      contents: contents,
      generationConfig: {
        maxOutputTokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7
      }
    });

    return {
      text: response.data.candidates[0].content.parts[0].text,
      model: 'gemini-pro'
    };
  }

  /**
   * Chama modelo local (Ollama)
   */
  async callLocal(conversation, context, options) {
    const config = this.configs.local;
    const systemPrompt = this.systemPrompts[context] || this.systemPrompts.general;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversation.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    const response = await axios.post(`${config.baseURL}${config.endpoint}`, {
      model: options.model || config.model,
      messages: messages,
      stream: false
    });

    return {
      text: response.data.choices[0].message.content,
      model: response.data.model
    };
  }

  /**
   * Resposta mock para desenvolvimento/teste
   */
  async callMock(conversation, context, options) {
    // Simula delay da API
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const lastMessage = conversation[conversation.length - 1]?.content || '';

    // Respostas contextuais baseadas na mensagem
    const responses = {
      robotics: [
        'Ótima pergunta sobre robótica! 🤖 Os robôs funcionam através da integração de sensores, atuadores e programação. Quer que eu explique algum componente específico?',
        'Robótica é fascinante! 🔧 Posso te ajudar com conceitos básicos, programação Arduino, ou projetos práticos. No que você está mais interessado?',
        'Vamos explorar a robótica juntos! ⚡ Desde sensores ultrassônicos até motores servo, há muito para descobrir. Qual área te desperta mais curiosidade?'
      ],
      arduino: [
        'Arduino é uma excelente escolha para começar! 💻 É uma plataforma open-source perfeita para aprender eletrônica e programação. Precisa de ajuda com algum projeto específico?',
        'Adorei sua pergunta sobre Arduino! 🔌 Posso te ajudar desde o básico como piscar um LED até projetos mais avançados com sensores e motores.',
        'Arduino torna a eletrônica acessível para todos! 🛠️ Que tipo de projeto você tem em mente? Automação residencial, robô, ou algo diferente?'
      ],
      programming: [
        'Programação é a linguagem dos robôs! 💾 Posso te ajudar com lógica de programação, C++ para Arduino, ou Python para Raspberry Pi. O que você gostaria de aprender?',
        'Código é poder! ⚡ Desde loops básicos até algoritmos complexos, posso te guiar no aprendizado. Em que linguagem você quer focar?',
        'Programação abre infinitas possibilidades! 🚀 Quer começar com conceitos básicos ou tem algum projeto específico em mente?'
      ],
      default: [
        'Interessante! 🤔 Como posso te ajudar com isso? Estou aqui para esclarecer dúvidas sobre robótica, programação, eletrônica ou qualquer outro assunto.',
        'Entendi! 💡 Posso explicar melhor ou você tem alguma dúvida específica? Estou aqui para ajudar no que precisar.',
        'Boa pergunta! 📚 Quer que eu detalhe mais algum aspecto específico? Sempre posso fornecer exemplos práticos ou exercícios.'
      ]
    };

    // Determina categoria da resposta
    let category = 'default';
    if (lastMessage.toLowerCase().includes('robot') || lastMessage.toLowerCase().includes('robô')) {
      category = 'robotics';
    } else if (lastMessage.toLowerCase().includes('arduino')) {
      category = 'arduino';
    } else if (
      lastMessage.toLowerCase().includes('programa') ||
      lastMessage.toLowerCase().includes('código')
    ) {
      category = 'programming';
    }

    // Seleciona resposta aleatória da categoria
    const categoryResponses = responses[category];
    const randomResponse = categoryResponses[Math.floor(Math.random() * categoryResponses.length)];

    return {
      text: randomResponse,
      model: 'Mock AI Assistant'
    };
  }

  /**
   * Obtém histórico de uma conversa
   */
  getConversationHistory(sessionId) {
    return this.conversations.get(sessionId) || [];
  }

  /**
   * Limpa histórico de uma conversa
   */
  clearConversation(sessionId) {
    this.conversations.delete(sessionId);
    return true;
  }

  /**
   * Lista todas as conversas ativas
   */
  getActiveConversations() {
    const sessions = [];
    for (const [sessionId, conversation] of this.conversations) {
      sessions.push({
        sessionId: sessionId,
        messageCount: conversation.length,
        lastActivity: conversation[conversation.length - 1]?.timestamp || null
      });
    }
    return sessions;
  }

  /**
   * Configurações disponíveis
   */
  getAvailableProviders() {
    return Object.keys(this.configs);
  }

  /**
   * Status do serviço
   */
  getStatus() {
    return {
      provider: this.provider,
      hasApiKey: !!this.apiKey,
      activeConversations: this.conversations.size,
      availableProviders: this.getAvailableProviders(),
      systemStatus: 'operational'
    };
  }
}

module.exports = new AIService();
