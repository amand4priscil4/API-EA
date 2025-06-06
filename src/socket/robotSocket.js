const serialService = require('../services/serialService');

function setupRobotSocket(io) {
  // Namespace para controle do robô
  const robotNamespace = io.of('/robot');

  robotNamespace.on('connection', socket => {
    console.log(`Cliente conectado ao WebSocket: ${socket.id}`);

    // Envia status inicial
    socket.emit('status', serialService.getStatus());

    // Handler para comandos de movimento
    socket.on('movement', async data => {
      try {
        if (!serialService.isDeviceConnected()) {
          socket.emit('error', { message: 'Arduino não conectado' });
          return;
        }

        const { action, speed = 200, duration } = data;

        // Valida comando
        const validActions = ['forward', 'backward', 'left', 'right', 'stop'];
        if (!validActions.includes(action)) {
          socket.emit('error', { message: 'Comando inválido' });
          return;
        }

        const command = { action, speed };
        if (duration) command.duration = duration;

        const result = await serialService.sendCommand(command);

        // Confirma execução para o cliente
        socket.emit('command_result', {
          success: true,
          command: command,
          result: result,
          timestamp: new Date().toISOString()
        });

        // Notifica outros clientes sobre o movimento
        socket.broadcast.emit('robot_movement', {
          action: action,
          speed: speed,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Erro no comando WebSocket:', error.message);
        socket.emit('error', { message: error.message });
      }
    });

    // Handler para parada de emergência
    socket.on('emergency_stop', async () => {
      try {
        if (!serialService.isDeviceConnected()) {
          socket.emit('error', { message: 'Arduino não conectado' });
          return;
        }

        const result = await serialService.sendCommand({ action: 'stop' });

        // Notifica todos os clientes sobre a parada
        robotNamespace.emit('emergency_stop', {
          success: true,
          result: result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Erro na parada de emergência:', error.message);
        socket.emit('error', { message: error.message });
      }
    });

    // Handler para solicitar status
    socket.on('get_status', () => {
      socket.emit('status', serialService.getStatus());
    });

    // Handler para ping/teste
    socket.on('ping', async () => {
      try {
        if (!serialService.isDeviceConnected()) {
          socket.emit('pong', { connected: false });
          return;
        }

        await serialService.testCommunication();
        socket.emit('pong', {
          connected: true,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        socket.emit('pong', {
          connected: false,
          error: error.message
        });
      }
    });

    // Handler para desconexão
    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
    });
  });

  // Configura callback para receber dados do Arduino
  serialService.setDataCallback(data => {
    try {
      // Tenta parsear como JSON
      const jsonData = JSON.parse(data);
      robotNamespace.emit('arduino_data', {
        data: jsonData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Se não for JSON, envia como texto
      robotNamespace.emit('arduino_message', {
        message: data,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Envia status periodicamente para todos os clientes conectados
  setInterval(() => {
    if (robotNamespace.sockets.size > 0) {
      const status = serialService.getStatus();
      robotNamespace.emit('status_update', status);
    }
  }, 2000); // A cada 2 segundos

  return robotNamespace;
}

module.exports = setupRobotSocket;
