/**
 * Serviço de Chat Educacional - Edu-Ardu
 *
 * Gerencia conversas educacionais adaptativas com o tutor virtual Edu-Ardu
 */

class ChatEducationalService {
  constructor() {
    this.conversations = new Map(); // Sessões ativas de conversa
    this.userProgress = new Map(); // Progresso individual dos usuários
  }

  /**
   * Inicia nova conversa ou retoma existente
   */
  startConversation(userId, lessonType = 'introduction') {
    const conversationId = `${userId}_${Date.now()}`;

    const conversation = {
      id: conversationId,
      userId: userId,
      lessonType: lessonType,
      currentStep: 'welcome',
      context: {},
      startTime: new Date(),
      messages: [],
      progress: {
        totalSteps: 0,
        completedSteps: 0,
        correctAnswers: 0,
        badges: []
      }
    };

    this.conversations.set(conversationId, conversation);

    // Primeira mensagem do Edu-Ardu
    const welcomeMessage = this.generateEduArduResponse(conversation, null);
    conversation.messages.push(welcomeMessage);

    return {
      conversationId: conversationId,
      message: welcomeMessage,
      progress: conversation.progress
    };
  }

  /**
   * Processa resposta do usuário e gera resposta do Edu-Ardu
   */
  processUserResponse(conversationId, userChoice, userText = null) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    // Adiciona resposta do usuário
    const userMessage = {
      type: 'user',
      content: userChoice,
      text: userText,
      timestamp: new Date()
    };
    conversation.messages.push(userMessage);

    // Atualiza contexto baseado na resposta
    this.updateContext(conversation, userChoice);

    // Gera resposta do Edu-Ardu
    const eduArduResponse = this.generateEduArduResponse(conversation, userChoice);
    conversation.messages.push(eduArduResponse);

    // Atualiza progresso
    this.updateProgress(conversation, userChoice);

    return {
      message: eduArduResponse,
      progress: conversation.progress,
      context: conversation.context
    };
  }

  /**
   * Gera resposta contextual do Edu-Ardu
   */
  generateEduArduResponse(conversation, userChoice) {
    const { currentStep, lessonType, context } = conversation;
    const responses = this.getResponseDatabase();

    let responseData;

    // Determina próximo passo baseado na resposta
    if (!userChoice) {
      // Primeira mensagem
      responseData = responses[lessonType]['welcome'];
      conversation.currentStep = 'topic_selection';
    } else {
      // Busca resposta baseada no passo atual e escolha do usuário
      const stepResponses = responses[lessonType][currentStep];

      if (stepResponses && stepResponses[userChoice]) {
        responseData = stepResponses[userChoice];
        conversation.currentStep = responseData.nextStep || currentStep;
      } else {
        // Resposta padrão para escolhas não reconhecidas
        responseData = this.getDefaultResponse(userChoice);
      }
    }

    return {
      type: 'edu_ardu',
      content: responseData.text,
      options: responseData.options || [],
      hint: responseData.hint || null,
      educational_content: responseData.educational_content || null,
      timestamp: new Date(),
      avatar: 'edu-ardu',
      step: conversation.currentStep
    };
  }

  /**
   * Atualiza contexto da conversa
   */
  updateContext(conversation, userChoice) {
    const { currentStep } = conversation;

    // Armazena escolhas importantes para personalização
    switch (currentStep) {
      case 'topic_selection':
        conversation.context.preferredTopic = userChoice;
        conversation.context.difficultyLevel = this.inferDifficulty(userChoice);
        break;

      case 'knowledge_check':
        conversation.context.priorKnowledge = userChoice;
        break;

      case 'learning_style':
        conversation.context.learningStyle = userChoice;
        break;
    }
  }

  /**
   * Atualiza progresso do usuário
   */
  updateProgress(conversation, userChoice) {
    conversation.progress.completedSteps++;

    // Verifica se resposta está correta (para quizzes)
    if (this.isCorrectAnswer(conversation.currentStep, userChoice)) {
      conversation.progress.correctAnswers++;
    }

    // Adiciona badges baseado no progresso
    this.checkAndAwardBadges(conversation);
  }

  /**
   * Verifica se resposta está correta
   */
  isCorrectAnswer(step, choice) {
    const correctAnswers = {
      quiz_computational_thinking: 'decomposition',
      quiz_robotics_basic: 'sensors_and_actuators',
      quiz_arduino_intro: 'programming_board'
    };

    return correctAnswers[step] === choice;
  }

  /**
   * Sistema de badges/conquistas
   */
  checkAndAwardBadges(conversation) {
    const badges = [];

    if (
      conversation.progress.completedSteps >= 5 &&
      !conversation.progress.badges.includes('explorer')
    ) {
      badges.push('explorer');
    }

    if (
      conversation.progress.correctAnswers >= 3 &&
      !conversation.progress.badges.includes('scholar')
    ) {
      badges.push('scholar');
    }

    conversation.progress.badges.push(...badges);
    return badges;
  }

  /**
   * Infere nível de dificuldade baseado nas escolhas
   */
  inferDifficulty(choice) {
    const difficultyMap = {
      never_heard: 'beginner',
      some_knowledge: 'intermediate',
      experienced: 'advanced',
      programming_focus: 'intermediate',
      electronics_focus: 'advanced',
      general_robots: 'beginner'
    };

    return difficultyMap[choice] || 'beginner';
  }

  /**
   * Database de respostas estruturadas
   */
  getResponseDatabase() {
    return {
      introduction: {
        welcome: {
          text: '🤖 Olá! Eu sou o Edu-Ardu, seu assistente pessoal de robótica educacional! Estou aqui para te guiar nessa incrível jornada pelo mundo dos robôs. Que tal começarmos nossa aventura?',
          options: [
            { id: 'lets_start', label: 'Vamos começar! 🚀', type: 'primary' },
            { id: 'what_learn', label: 'O que vou aprender?', type: 'secondary' },
            { id: 'already_know', label: 'Já sei um pouco', type: 'secondary' }
          ]
        },

        topic_selection: {
          lets_start: {
            text: 'Que energia! Adoro essa animação! 🎉 Agora me conta: o que mais desperta sua curiosidade no mundo da robótica?',
            options: [
              { id: 'how_robots_think', label: 'Como robôs "pensam"? 🧠', type: 'primary' },
              { id: 'how_robots_move', label: 'Como robôs se movem? 🤖', type: 'primary' },
              { id: 'programming_robots', label: 'Como programar? 💻', type: 'primary' },
              { id: 'build_robots', label: 'Como construir? 🔧', type: 'primary' }
            ],
            nextStep: 'knowledge_check'
          },

          what_learn: {
            text: 'Ótima pergunta! 📚 Vou te ensinar sobre Pensamento Computacional, Robótica Básica e Arduino. Você vai aprender a pensar como um programador, entender como robôs funcionam e fazer seus próprios projetos! Preparado?',
            options: [
              { id: 'sounds_great', label: 'Parece incrível! 😍', type: 'primary' },
              { id: 'sounds_hard', label: 'Parece difícil... 😰', type: 'secondary' },
              { id: 'lets_start', label: 'Vamos começar!', type: 'primary' }
            ],
            nextStep: 'topic_selection'
          },

          already_know: {
            text: 'Que legal! Sempre bom ter alguém com experiência! 🌟 Me conta, qual seu nível de conhecimento em robótica?',
            options: [
              { id: 'some_knowledge', label: 'Conceitos básicos', type: 'secondary' },
              { id: 'built_projects', label: 'Já fiz alguns projetos', type: 'secondary' },
              { id: 'experienced', label: 'Bastante experiência', type: 'secondary' }
            ],
            nextStep: 'knowledge_check'
          }
        },

        knowledge_check: {
          how_robots_think: {
            text: "Excelente escolha! 🧠 Robôs 'pensam' usando PENSAMENTO COMPUTACIONAL - uma forma especial de resolver problemas. É como ter um superpoder mental! Quer descobrir seus 4 poderes secretos?",
            options: [
              { id: 'yes_powers', label: 'Sim! Quais são? ⚡', type: 'primary' },
              { id: 'give_example', label: 'Me dá um exemplo primeiro', type: 'secondary' }
            ],
            nextStep: 'lesson_computational_thinking',
            educational_content: {
              topic: 'computational_thinking',
              level: 'introduction'
            }
          },

          some_knowledge: {
            text: 'Perfeito! Com essa base, podemos acelerar um pouco! 🏃‍♂️ Que tal irmos direto para algo mais prático? O que te interessa mais agora?',
            options: [
              { id: 'arduino_hands_on', label: 'Arduino na prática! 🛠️', type: 'primary' },
              { id: 'advanced_robotics', label: 'Robótica avançada 🤖', type: 'primary' },
              { id: 'review_basics', label: 'Revisar o básico', type: 'secondary' }
            ],
            nextStep: 'advanced_topics'
          }
        },

        lesson_computational_thinking: {
          yes_powers: {
            text: '🎉 Os 4 superpoderes são: DECOMPOSIÇÃO (quebrar problemas), PADRÕES (encontrar repetições), ABSTRAÇÃO (focar no importante) e ALGORITMOS (criar receitas)! Qual quer explorar primeiro?',
            options: [
              { id: 'decomposition', label: 'Decomposição 🧩', type: 'primary' },
              { id: 'patterns', label: 'Padrões 🔄', type: 'primary' },
              { id: 'abstraction', label: 'Abstração ⭐', type: 'primary' },
              { id: 'algorithms', label: 'Algoritmos 📋', type: 'primary' }
            ],
            nextStep: 'deep_dive_concept'
          },

          give_example: {
            text: 'Claro! 💡 Imagine que você quer fazer um sanduíche. Primeiro DECOMPOMOS: pegar pão, escolher recheio, montar. Depois criamos um ALGORITMO: 1. Abrir pão 2. Colocar recheio 3. Fechar. Fácil, né? Agora quer conhecer todos os poderes?',
            options: [
              { id: 'yes_all_powers', label: 'Sim! Todos os poderes! 💪', type: 'primary' },
              { id: 'more_examples', label: 'Mais exemplos, por favor', type: 'secondary' }
            ],
            nextStep: 'lesson_computational_thinking'
          }
        }
      }
    };
  }

  /**
   * Resposta padrão para inputs não reconhecidos
   */
  getDefaultResponse(userChoice) {
    return {
      text: "🤔 Interessante perspectiva! Como eu sempre digo: 'Todo robô começa com uma ideia curiosa!' Que tal explorarmos isso juntos?",
      options: [
        { id: 'explore_together', label: 'Vamos explorar! 🔍', type: 'primary' },
        { id: 'need_help', label: 'Preciso de ajuda', type: 'secondary' }
      ]
    };
  }

  /**
   * Obtém histórico da conversa
   */
  getConversationHistory(conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    return {
      messages: conversation.messages,
      progress: conversation.progress,
      context: conversation.context
    };
  }

  /**
   * Lista conversas ativas do usuário
   */
  getUserConversations(userId) {
    const userConversations = [];

    for (const [id, conversation] of this.conversations) {
      if (conversation.userId === userId) {
        userConversations.push({
          id: id,
          lessonType: conversation.lessonType,
          currentStep: conversation.currentStep,
          startTime: conversation.startTime,
          progress: conversation.progress
        });
      }
    }

    return userConversations;
  }

  /**
   * Finaliza conversa e salva progresso
   */
  endConversation(conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    // Salva progresso final do usuário
    const userId = conversation.userId;
    const finalProgress = {
      ...conversation.progress,
      endTime: new Date(),
      duration: new Date() - conversation.startTime,
      lessonCompleted: conversation.currentStep === 'completed'
    };

    this.userProgress.set(userId, finalProgress);
    this.conversations.delete(conversationId);

    return finalProgress;
  }
}

module.exports = new ChatEducationalService();
