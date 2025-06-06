# 🤖 Edu-Ardu

**API educacional para controle e interação com robôs Arduino**

## 📋 Sobre o Projeto

O Edu-Ardu é uma plataforma educacional que combina robótica com Arduino, inteligência artificial e desenvolvimento web. O projeto permite que estudantes aprendam programação e robótica de forma interativa através de um robô controlado remotamente.

## 🚀 Tecnologias Utilizadas

- **Backend**: Node.js, Express.js
- **Frontend**: React.js
- **Hardware**: Arduino
- **Comunicação**: Socket.io para tempo real
- **IA**: Integração com serviços de inteligência artificial
- **Controle**: Comunicação serial com Arduino

## 📁 Estrutura do Projeto

```
API-EA/
├── src/
│   ├── controllers/        # Controladores da API
│   │   ├── aiController.js
│   │   ├── chatController.js
│   │   └── robotController.js
│   ├── routes/            # Rotas da API
│   │   ├── aiRoutes.js
│   │   ├── chatRoutes.js
│   │   └── robotRoutes.js
│   ├── services/          # Serviços do sistema
│   │   ├── aiService.js
│   │   ├── chatEducationalService.js
│   │   └── serialService.js
│   ├── socket/            # Configuração Socket.io
│   │   ├── chatSocket.js
│   │   └── robotSocket.js
│   └── index.js           # Ponto de entrada da aplicação
├── SimpleRobot.ino        # Código Arduino
└── package.json           # Dependências do projeto
```

## ⚙️ Funcionalidades

- 🤖 **Controle de Robô**: Comandos remotos para movimentação
- 💬 **Chat Educacional**: Interação com IA para aprendizado
- 📡 **Comunicação em Tempo Real**: Socket.io para updates instantâneos
- 🎓 **Conteúdo Educacional**: Material didático integrado
- 🔧 **Interface Serial**: Comunicação direta com Arduino

## 🛠️ Como Executar

### Pré-requisitos

- Node.js (versão 14 ou superior)
- Arduino IDE
- Cabo USB para Arduino

### Instalação

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/amand4priscil4/API-EA.git
   cd API-EA
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure o Arduino:**
   - Abra o arquivo `SimpleRobot.ino` no Arduino IDE
   - Conecte seu Arduino via USB
   - Faça upload do código para o Arduino

4. **Configure as variáveis de ambiente:**
   - Crie um arquivo `.env` na raiz do projeto
   - Adicione as configurações necessárias

5. **Execute a aplicação:**
   ```bash
   npm start
   ```

## 🔌 Endpoints da API

### Robô
- `GET /robot/status` - Status do robô
- `POST /robot/move` - Movimentar robô
- `POST /robot/command` - Enviar comando customizado

### Chat/IA
- `GET /chat/history` - Histórico de conversas
- `POST /chat/message` - Enviar mensagem
- `GET /ai/response` - Resposta da IA

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**Amanda Priscila** - [@amand4priscil4](https://github.com/amand4priscil4)

## 📞 Contato

- GitHub: [@amand4priscil4](https://github.com/amand4priscil4)
- Email: [seu-email@exemplo.com](mailto:seu-email@exemplo.com)

---

⭐ **Se este projeto te ajudou, deixe uma estrela!** ⭐
