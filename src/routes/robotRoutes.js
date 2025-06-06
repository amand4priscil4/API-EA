const express = require('express');
const router = express.Router();
const robotController = require('../controllers/robotController');

// Rotas para gerenciamento de conexão
router.get('/ports', robotController.listPorts);
router.post('/connect', robotController.connect);
router.post('/disconnect', robotController.disconnect);
router.get('/status', robotController.getStatus);
router.post('/test', robotController.testConnection);

// Rotas para controle do robô
router.post('/command', robotController.sendCommand);
router.post('/emergency-stop', robotController.emergencyStop);

// Rotas de conveniência para comandos específicos
router.post('/move/forward', (req, res) => {
  req.body = { action: 'forward', speed: req.body.speed || 200 };
  robotController.sendCommand(req, res);
});

router.post('/move/backward', (req, res) => {
  req.body = { action: 'backward', speed: req.body.speed || 200 };
  robotController.sendCommand(req, res);
});

router.post('/move/left', (req, res) => {
  req.body = { action: 'left', speed: req.body.speed || 200 };
  robotController.sendCommand(req, res);
});

router.post('/move/right', (req, res) => {
  req.body = { action: 'right', speed: req.body.speed || 200 };
  robotController.sendCommand(req, res);
});

router.post('/move/stop', (req, res) => {
  req.body = { action: 'stop' };
  robotController.sendCommand(req, res);
});

module.exports = router;
