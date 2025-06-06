const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

class SerialService {
  constructor() {
    this.port = null;
    this.parser = null;
    this.isConnected = false;
    this.devicePath = null;
    this.onDataCallback = null;
  }

  /**
   * Lista portas seriais disponíveis
   */
  async listPorts() {
    try {
      const ports = await SerialPort.list();
      return ports.filter(
        port =>
          port.vendorId ||
          port.productId ||
          port.path.includes('USB') ||
          port.path.includes('ACM') ||
          port.path.includes('cu.usbmodem')
      );
    } catch (error) {
      throw new Error(`Erro ao listar portas: ${error.message}`);
    }
  }

  /**
   * Conecta à porta serial especificada
   */
  async connect(portPath, baudRate = 9600) {
    try {
      if (this.isConnected) {
        await this.disconnect();
      }

      this.port = new SerialPort({
        path: portPath,
        baudRate: baudRate,
        autoOpen: false
      });

      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

      return new Promise((resolve, reject) => {
        this.port.open(error => {
          if (error) {
            reject(new Error(`Erro ao conectar: ${error.message}`));
            return;
          }

          this.isConnected = true;
          this.devicePath = portPath;

          // Setup do parser para receber dados
          this.parser.on('data', data => {
            if (this.onDataCallback) {
              this.onDataCallback(data.trim());
            }
          });

          // Tratamento de erros
          this.port.on('error', error => {
            console.error('Erro na porta serial:', error.message);
            this.isConnected = false;
          });

          this.port.on('close', () => {
            console.log('Conexão serial fechada');
            this.isConnected = false;
          });

          resolve({
            success: true,
            message: 'Conectado com sucesso',
            devicePath: portPath,
            baudRate: baudRate
          });
        });
      });
    } catch (error) {
      throw new Error(`Falha na conexão: ${error.message}`);
    }
  }

  /**
   * Desconecta da porta serial
   */
  async disconnect() {
    try {
      if (this.port && this.port.isOpen) {
        return new Promise((resolve, reject) => {
          this.port.close(error => {
            if (error) {
              reject(new Error(`Erro ao desconectar: ${error.message}`));
              return;
            }

            this.isConnected = false;
            this.devicePath = null;
            this.port = null;
            this.parser = null;

            resolve({
              success: true,
              message: 'Desconectado com sucesso'
            });
          });
        });
      }

      this.isConnected = false;
      return { success: true, message: 'Já estava desconectado' };
    } catch (error) {
      throw new Error(`Falha ao desconectar: ${error.message}`);
    }
  }

  /**
   * Envia comando para o Arduino
   */
  async sendCommand(command) {
    try {
      if (!this.isConnected || !this.port) {
        throw new Error('Não conectado ao dispositivo');
      }

      const commandStr = JSON.stringify(command) + '\n';

      return new Promise((resolve, reject) => {
        this.port.write(commandStr, error => {
          if (error) {
            reject(new Error(`Erro ao enviar comando: ${error.message}`));
            return;
          }

          resolve({
            success: true,
            message: 'Comando enviado',
            command: command,
            timestamp: new Date().toISOString()
          });
        });
      });
    } catch (error) {
      throw new Error(`Falha ao enviar comando: ${error.message}`);
    }
  }

  /**
   * Testa a comunicação com o Arduino
   */
  async testCommunication() {
    try {
      const testCommand = { action: 'ping' };
      const result = await this.sendCommand(testCommand);

      return {
        success: true,
        message: 'Teste de comunicação realizado',
        result: result
      };
    } catch (error) {
      throw new Error(`Falha no teste: ${error.message}`);
    }
  }

  /**
   * Define callback para receber dados do Arduino
   */
  setDataCallback(callback) {
    this.onDataCallback = callback;
  }

  /**
   * Obtém status da conexão
   */
  getStatus() {
    return {
      connected: this.isConnected,
      devicePath: this.devicePath,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Verifica se está conectado
   */
  isDeviceConnected() {
    return this.isConnected && this.port && this.port.isOpen;
  }
}

module.exports = new SerialService();
