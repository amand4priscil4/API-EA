const serialService = require('../services/serialService');
const Joi = require('joi');

// Schema de validação para comandos
const commandSchema = Joi.object({
  action: Joi.string().valid('forward', 'backward', 'left', 'right', 'stop', 'ping').required(),
  speed: Joi.number().integer().min(0).max(255).optional(),
  duration: Joi.number().integer().min(0).optional()
});

// Schema de validação para conexão
const connectSchema = Joi.object({
  portPath: Joi.string().required(),
  baudRate: Joi.number().integer().valid(9600, 19200, 38400, 57600, 115200).default(9600)
});

/**
 * Lista portas USB/Serial disponíveis
 */
async function listPorts(req, res) {
  try {
    const ports = await serialService.listPorts();

    res.status(200).json({
      success: true,
      message: `Encontradas ${ports.length} portas`,
      ports: ports
    });
  } catch (error) {
    console.error('Erro ao listar portas:', error.message);
    res.status(500).json({
      success: false,
      message: `Falha ao listar portas: ${error.message}`
    });
  }
}

/**
 * Conecta ao Arduino via USB/Serial
 */
async function connect(req, res) {
  try {
    const { error, value } = connectSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: `Dados inválidos: ${error.details[0].message}`
      });
    }

    const { portPath, baudRate } = value;
    const result = await serialService.connect(portPath, baudRate);

    // Teste básico de comunicação
    setTimeout(async () => {
      try {
        await serialService.testCommunication();
      } catch (testError) {
        console.warn('Teste de comunicação falhou:', testError.message);
      }
    }, 1000);

    res.status(200).json({
      success: true,
      message: 'Conectado com sucesso',
      connection: result
    });
  } catch (error) {
    console.error('Erro ao conectar:', error.message);
    res.status(500).json({
      success: false,
      message: `Falha ao conectar: ${error.message}`
    });
  }
}

/**
 * Desconecta do Arduino
 */
async function disconnect(req, res) {
  try {
    const result = await serialService.disconnect();

    res.status(200).json({
      success: true,
      message: 'Desconectado com sucesso',
      result: result
    });
  } catch (error) {
    console.error('Erro ao desconectar:', error.message);
    res.status(500).json({
      success: false,
      message: `Falha ao desconectar: ${error.message}`
    });
  }
}

/**
 * Envia comando para o Arduino
 */
async function sendCommand(req, res) {
  try {
    if (!serialService.isDeviceConnected()) {
      return res.status(400).json({
        success: false,
        message: 'Não conectado ao Arduino'
      });
    }

    const { error, value } = commandSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: `Comando inválido: ${error.details[0].message}`
      });
    }

    // Adiciona velocidade padrão se não especificada
    if (value.action !== 'stop' && value.action !== 'ping' && !value.speed) {
      value.speed = 200;
    }

    const result = await serialService.sendCommand(value);

    res.status(200).json({
      success: true,
      message: 'Comando enviado com sucesso',
      result: result
    });
  } catch (error) {
    console.error('Erro ao enviar comando:', error.message);
    res.status(500).json({
      success: false,
      message: `Falha ao enviar comando: ${error.message}`
    });
  }
}

/**
 * Obtém status da conexão
 */
async function getStatus(req, res) {
  try {
    const status = serialService.getStatus();

    res.status(200).json({
      success: true,
      status: status
    });
  } catch (error) {
    console.error('Erro ao obter status:', error.message);
    res.status(500).json({
      success: false,
      message: `Falha ao obter status: ${error.message}`
    });
  }
}

/**
 * Testa comunicação com Arduino
 */
async function testConnection(req, res) {
  try {
    if (!serialService.isDeviceConnected()) {
      return res.status(400).json({
        success: false,
        message: 'Não conectado ao Arduino'
      });
    }

    const result = await serialService.testCommunication();

    res.status(200).json({
      success: true,
      message: 'Teste realizado com sucesso',
      test: result
    });
  } catch (error) {
    console.error('Erro no teste:', error.message);
    res.status(500).json({
      success: false,
      message: `Falha no teste: ${error.message}`
    });
  }
}

/**
 * Parada de emergência
 */
async function emergencyStop(req, res) {
  try {
    if (!serialService.isDeviceConnected()) {
      return res.status(400).json({
        success: false,
        message: 'Não conectado ao Arduino'
      });
    }

    const stopCommand = { action: 'stop' };
    const result = await serialService.sendCommand(stopCommand);

    res.status(200).json({
      success: true,
      message: 'Parada de emergência acionada',
      result: result
    });
  } catch (error) {
    console.error('Erro na parada de emergência:', error.message);
    res.status(500).json({
      success: false,
      message: `Falha na parada de emergência: ${error.message}`
    });
  }
}

module.exports = {
  listPorts,
  connect,
  disconnect,
  sendCommand,
  getStatus,
  testConnection,
  emergencyStop
};
