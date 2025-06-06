/**
 * WebSocket Handler para Chat Educacional Edu-Ardu
 *
 * Gerencia comunicação em tempo real para chat educacional
 */

const chatEducationalService = require('../services/chatEducationalService');

function setupChatSocket(io) {
  // Namespace específico para chat educacional
  const chatNamespace = io.of('/chat');

  chatNamespace.on('connection', socket => {
    console.log(`Usuário conectado ao chat: ${socket.id}`);

    // Evento para iniciar nova conversa
    socket.on('start_conversation', async data => {
      try {
        const { userId, lessonType = 'introduction' } = data;

        console.log(`Iniciando conversa via WebSocket: usuário ${userId}, lição ${lessonType}`);

        const result = chatEducationalService.startConversation(userId, lessonType);

        // Entra em sala específica da conversa para comunicação privada
        socket.join(result.conversationId);

        // Envia primeira mensagem do Edu-Ardu
        socket.emit('conversation_started', {
          success: true,
          conversationId: result.conversationId,
          message: result.message,
          progress: result.progress
        });

        // Simula "digitando" para dar sensação de conversa real
        setTimeout(() => {
          socket.emit('edu_ardu_typing', { typing: false });
        }, 1500);
      } catch (error) {
        console.error('Erro ao iniciar conversa via WebSocket:', error.message);
        socket.emit('error', {
          success: false,
          message: error.message
        });
      }
    });

    // Evento para enviar resposta do usuário
    socket.on('send_message', async data => {
      try {
        const { conversationId, userChoice, userText } = data;

        console.log(`Mensagem recebida via WebSocket: ${conversationId}, escolha: ${userChoice}`);

        // Confirma recebimento da mensagem do usuário
        socket.emit('message_received', {
          success: true,
          userMessage: {
            type: 'user',
            content: userChoice,
            text: userText,
            timestamp: new Date()
          }
        });

        // Mostra que Edu-Ardu está "pensando/digitando"
        socket.emit('edu_ardu_thinking', { thinking: true });

        // Simula tempo de processamento para dar sensação mais natural
        setTimeout(async () => {
          try {
            const result = chatEducationalService.processUserResponse(
              conversationId,
              userChoice,
              userText
            );

            // Para de mostrar "digitando"
            socket.emit('edu_ardu_thinking', { thinking: false });

            // Envia resposta do Edu-Ardu
            socket.emit('edu_ardu_response', {
              success: true,
              message: result.message,
              progress: result.progress,
              context: result.context
            });

            // Verifica se ganhou badges
            if (result.progress.badges.length > 0) {
              socket.emit('badge_earned', {
                badges: result.progress.badges,
                message: '🎉 Parabéns! Você ganhou uma nova conquista!'
              });
            }

            // Notifica outros usuários sobre progresso (se for sala compartilhada)
            socket.to(conversationId).emit('user_progress_update', {
              userId: data.userId,
              progress: result.progress
            });
          } catch (error) {
            socket.emit('edu_ardu_thinking', { thinking: false });
            socket.emit('error', {
              success: false,
              message: error.message
            });
          }
        }, Math.random() * 2000 + 1000); // 1-3 segundos de delay realístico
      } catch (error) {
        console.error('Erro ao processar mensagem via WebSocket:', error.message);
        socket.emit('error', {
          success: false,
          message: error.message
        });
      }
    });

    // Evento para obter histórico da conversa
    socket.on('get_history', async data => {
      try {
        const { conversationId } = data;

        const history = chatEducationalService.getConversationHistory(conversationId);

        socket.emit('conversation_history', {
          success: true,
          messages: history.messages,
          progress: history.progress,
          context: history.context
        });
      } catch (error) {
        socket.emit('error', {
          success: false,
          message: error.message
        });
      }
    });

    // Evento para finalizar conversa
    socket.on('end_conversation', async data => {
      try {
        const { conversationId } = data;

        const finalProgress = chatEducationalService.endConversation(conversationId);

        socket.emit('conversation_ended', {
          success: true,
          finalProgress: finalProgress,
          message: '🎉 Conversa finalizada! Seu progresso foi salvo.'
        });

        // Remove da sala da conversa
        socket.leave(conversationId);
      } catch (error) {
        socket.emit('error', {
          success: false,
          message: error.message
        });
      }
    });

    // Evento para indicar que usuário está digitando
    socket.on('user_typing', data => {
      const { conversationId, typing } = data;
      socket.to(conversationId).emit('user_typing_indicator', {
        userId: socket.id,
        typing: typing
      });
    });

    // Evento para obter sugestões de resposta
    socket.on('get_suggestions', async data => {
      try {
        const { conversationId } = data;

        const history = chatEducationalService.getConversationHistory(conversationId);

        // Gera sugestões contextuais simples
        const suggestions = [
          { id: 'continue', label: 'Continuar', type: 'primary' },
          { id: 'explain_more', label: 'Explique melhor', type: 'secondary' },
          { id: 'give_example', label: 'Me dê um exemplo', type: 'secondary' },
          { id: 'im_confused', label: 'Estou confuso...', type: 'help' }
        ];

        socket.emit('suggestions_available', {
          success: true,
          suggestions: suggestions
        });
      } catch (error) {
        socket.emit('error', {
          success: false,
          message: error.message
        });
      }
    });

    // Evento para ping/pong de conectividade
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: new Date().toISOString(),
        serverTime: Date.now()
      });
    });

    // Handler para desconexão
    socket.on('disconnect', () => {
      console.log(`Usuário desconectado do chat: ${socket.id}`);
    });

    // Handler para erro de conexão
    socket.on('connect_error', error => {
      console.error('Erro de conexão no chat:', error);
      socket.emit('connection_error', {
        message: 'Erro de conexão com o servidor'
      });
    });
  });

  // Eventos para broadcast geral (não específicos de conversa)
  setInterval(() => {
    chatNamespace.emit('server_heartbeat', {
      timestamp: new Date().toISOString(),
      activeConnections: chatNamespace.sockets.size,
      serverStatus: 'online'
    });
  }, 30000); // A cada 30 segundos

  return chatNamespace;
}

module.exports = setupChatSocket;
