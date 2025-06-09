import axios from 'axios';

// Configuração da API
const API_BASE_URL = 'https://api-ea-qrta.onrender.com';
const API_TIMEOUT = 30000; // 30 segundos para APIs serverless

// Instância configurada do axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptador para requisições
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptador para respostas
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', error.response?.data || error.message);
    
    // Tratamento específico para APIs serverless que "dormem"
    if (error.code === 'ECONNABORTED' || error.response?.status === 503) {
      console.warn('⏳ API possivelmente "dormindo", tentando novamente...');
    }
    
    return Promise.reject(error);
  }
);

// ================ SERVIÇOS DA API ================

/**
 * Testa se a API está funcionando
 */
export const testAPI = async () => {
  try {
    const response = await apiClient.get('/health');
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
};

/**
 * ============= CHAT COM IA (GEMINI VIA BACKEND) =============
 */

/**
 * Envia mensagem para a IA via backend Gemini
 */
export const sendChatMessage = async (message, sessionId, context = 'robotics_education') => {
  try {
    console.log('🤖 Enviando mensagem para Gemini via backend...');
    
    const response = await apiClient.post('/api/gemini/chat', {
      message,
      sessionId,
      context
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Erro no chat Gemini:', error);
    
    // Fallback para API original se Gemini falhar
    try {
      console.warn('⚠️ Fallback para API original...');
      const fallbackResponse = await apiClient.post('/api/ai/chat', {
        message,
        sessionId,
        context
      });
      
      return {
        success: true,
        data: fallbackResponse.data
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: 'Erro ao conectar com serviços de IA. Tente novamente.',
        details: error.message
      };
    }
  }
};

/**
 * Obtém histórico de conversa do Gemini
 */
export const getChatHistory = async (sessionId) => {
  try {
    const response = await apiClient.get(`/api/gemini/history/${sessionId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Erro ao obter histórico'
    };
  }
};

/**
 * Limpa histórico de conversa do Gemini
 */
export const clearChatHistory = async (sessionId) => {
  try {
    const response = await apiClient.delete(`/api/gemini/history/${sessionId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Erro ao limpar histórico'
    };
  }
};

/**
 * Gera código Arduino usando Gemini
 */
export const generateArduinoCode = async (description, components = []) => {
  try {
    const response = await apiClient.post('/api/gemini/generate-code', {
      description,
      components
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Erro ao gerar código Arduino'
    };
  }
};

/**
 * Testa conectividade com Gemini
 */
export const testGeminiConnection = async () => {
  try {
    const response = await apiClient.get('/api/gemini/test');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Erro ao testar Gemini'
    };
  }
};

/**
 * Obtém status do Gemini
 */
export const getGeminiStatus = async () => {
  try {
    const response = await apiClient.get('/api/gemini/status');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Erro ao obter status do Gemini'
    };
  }
};

/**
 * ============= CONTROLE DE ROBÔ =============
 */

/**
 * Lista portas USB disponíveis
 */
export const getRobotPorts = async () => {
  try {
    const response = await apiClient.get('/api/robot/ports');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Erro ao obter portas USB'
    };
  }
};

/**
 * Conecta ao robô/Arduino
 */
export const connectRobot = async (portPath, baudRate = 9600) => {
  try {
    const response = await apiClient.post('/api/robot/connect', {
      portPath,
      baudRate
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Erro ao conectar ao robô'
    };
  }
};

/**
 * Desconecta do robô
 */
export const disconnectRobot = async () => {
  try {
    const response = await apiClient.post('/api/robot/disconnect');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Erro ao desconectar robô'
    };
  }
};

/**
 * Envia comando para o robô
 */
export const sendRobotCommand = async (action, speed = 200) => {
  try {
    const response = await apiClient.post('/api/robot/command', {
      action,
      speed
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Erro ao enviar comando'
    };
  }
};

/**
 * Parada de emergência do robô
 */
export const emergencyStopRobot = async () => {
  try {
    const response = await apiClient.post('/api/robot/emergency-stop');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Erro na parada de emergência'
    };
  }
};

/**
 * Obtém status do robô
 */
export const getRobotStatus = async () => {
  try {
    const response = await apiClient.get('/api/robot/status');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Erro ao obter status'
    };
  }
};

/**
 * ============= CHAT EDUCACIONAL =============
 */

/**
 * Inicia conversa educacional
 */
export const startEducationalChat = async (age, interests, difficultyLevel) => {
  try {
    const response = await apiClient.post('/api/chat/start', {
      userProfile: {
        age,
        interests,
        difficultyLevel
      }
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Erro ao iniciar chat educacional'
    };
  }
};

/**
 * Envia mensagem no chat educacional
 */
export const sendEducationalMessage = async (conversationId, message, messageType = 'text') => {
  try {
    const response = await apiClient.post('/api/chat/message', {
      conversationId,
      message,
      messageType
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Erro ao enviar mensagem educacional'
    };
  }
};

/**
 * Finaliza conversa educacional
 */
export const endEducationalChat = async (conversationId) => {
  try {
    const response = await apiClient.post(`/api/chat/end/${conversationId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Erro ao finalizar chat'
    };
  }
};

/**
 * ============= UTILITÁRIOS =============
 */

/**
 * Função para "acordar" a API do Render (pré-aquecimento)
 */
export const wakeUpAPI = async () => {
  console.log('🌅 Acordando API do Render...');
  try {
    // Testa endpoint principal
    await apiClient.get('/health', { timeout: 60000 });
    
    // Testa Gemini também
    await apiClient.get('/api/gemini/health', { timeout: 30000 });
    
    console.log('✅ API e Gemini acordaram com sucesso!');
    return true;
  } catch (error) {
    console.warn('⚠️ Erro ao acordar API:', error.message);
    return false;
  }
};

/**
 * Monitora saúde da API e Gemini
 */
export const monitorAPIHealth = async () => {
  try {
    const start = Date.now();
    
    // Testa API principal
    const apiTest = await testAPI();
    
    // Testa Gemini
    const geminiTest = await getGeminiStatus();
    
    const responseTime = Date.now() - start;
    
    return {
      isHealthy: apiTest.success || geminiTest.success,
      responseTime,
      timestamp: new Date().toISOString(),
      services: {
        api: {
          status: apiTest.success,
          error: apiTest.error
        },
        gemini: {
          status: geminiTest.success,
          error: geminiTest.error,
          data: geminiTest.data
        }
      }
    };
  } catch (error) {
    return {
      isHealthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Configurações da API
 */
export const getAPIConfig = () => ({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  environment: process.env.NODE_ENV || 'development',
  services: ['api', 'gemini', 'robot', 'chat']
});

// Objeto de exportação padrão
const apiServiceDefault = {
  // Testes
  testAPI,
  wakeUpAPI,
  monitorAPIHealth,
  getAPIConfig,
  
  // Chat IA (Gemini via Backend)
  sendChatMessage,
  getChatHistory,
  clearChatHistory,
  
  // Funcionalidades específicas Gemini
  generateArduinoCode,
  testGeminiConnection,
  getGeminiStatus,
  
  // Controle Robô
  getRobotPorts,
  connectRobot,
  disconnectRobot,
  sendRobotCommand,
  emergencyStopRobot,
  getRobotStatus,
  
  // Chat Educacional
  startEducationalChat,
  sendEducationalMessage,
  endEducationalChat
};

export default apiServiceDefault;