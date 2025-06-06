/*
 * EduArdu MVP - Código Arduino para Controle Direto
 * 
 * Este código recebe comandos JSON via Serial e controla motores
 * Comandos aceitos:
 * {"action": "forward", "speed": 255}
 * {"action": "backward", "speed": 255}
 * {"action": "left", "speed": 200}
 * {"action": "right", "speed": 200}
 * {"action": "stop"}
 * {"action": "ping"}
 */

#include <ArduinoJson.h>

// Pinos dos motores (ajuste conforme seu hardware)
const int MOTOR_LEFT_A = 5;   // PWM
const int MOTOR_LEFT_B = 6;   // PWM
const int MOTOR_RIGHT_A = 9;  // PWM
const int MOTOR_RIGHT_B = 10; // PWM

// Pinos de direção (opcional, se usar driver de motor)
const int LEFT_DIR1 = 2;
const int LEFT_DIR2 = 3;
const int RIGHT_DIR1 = 4;
const int RIGHT_DIR2 = 7;

// LED integrado para feedback
const int LED_PIN = 13;

// Variáveis de controle
String inputBuffer = "";
bool commandComplete = false;
unsigned long lastPing = 0;

void setup() {
  // Inicializa comunicação serial
  Serial.begin(9600);
  
  // Configura pinos dos motores
  pinMode(MOTOR_LEFT_A, OUTPUT);
  pinMode(MOTOR_LEFT_B, OUTPUT);
  pinMode(MOTOR_RIGHT_A, OUTPUT);
  pinMode(MOTOR_RIGHT_B, OUTPUT);
  
  // Configura pinos de direção
  pinMode(LEFT_DIR1, OUTPUT);
  pinMode(LEFT_DIR2, OUTPUT);
  pinMode(RIGHT_DIR1, OUTPUT);
  pinMode(RIGHT_DIR2, OUTPUT);
  
  // LED de status
  pinMode(LED_PIN, OUTPUT);
  
  // Para todos os motores
  stopMotors();
  
  // Sinal de inicialização
  blinkLED(3);
  
  Serial.println("{\"status\":\"ready\",\"message\":\"Arduino inicializado\"}");
}

void loop() {
  // Lê dados da serial
  readSerial();
  
  // Processa comando se completo
  if (commandComplete) {
    processCommand(inputBuffer);
    inputBuffer = "";
    commandComplete = false;
  }
  
  // Pisca LED periodicamente para mostrar que está vivo
  if (millis() - lastPing > 5000) {
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    lastPing = millis();
  }
}

void readSerial() {
  while (Serial.available()) {
    char c = Serial.read();
    
    if (c == '\n' || c == '\r') {
      if (inputBuffer.length() > 0) {
        commandComplete = true;
      }
    } else {
      inputBuffer += c;
    }
  }
}

void processCommand(String jsonString) {
  // Cria documento JSON
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, jsonString);
  
  if (error) {
    Serial.println("{\"error\":\"JSON inválido\"}");
    return;
  }
  
  // Extrai parâmetros
  String action = doc["action"];
  int speed = doc["speed"] | 200; // Valor padrão 200
  int duration = doc["duration"] | 0;
  
  // Executa comando
  executeAction(action, speed, duration);
}

void executeAction(String action, int speed, int duration) {
  // Limita velocidade
  speed = constrain(speed, 0, 255);
  
  if (action == "forward") {
    moveForward(speed);
    Serial.println("{\"status\":\"moving\",\"action\":\"forward\",\"speed\":" + String(speed) + "}");
    
  } else if (action == "backward") {
    moveBackward(speed);
    Serial.println("{\"status\":\"moving\",\"action\":\"backward\",\"speed\":" + String(speed) + "}");
    
  } else if (action == "left") {
    turnLeft(speed);
    Serial.println("{\"status\":\"turning\",\"action\":\"left\",\"speed\":" + String(speed) + "}");
    
  } else if (action == "right") {
    turnRight(speed);
    Serial.println("{\"status\":\"turning\",\"action\":\"right\",\"speed\":" + String(speed) + "}");
    
  } else if (action == "stop") {
    stopMotors();
    Serial.println("{\"status\":\"stopped\",\"action\":\"stop\"}");
    
  } else if (action == "ping") {
    Serial.println("{\"status\":\"alive\",\"action\":\"pong\",\"timestamp\":" + String(millis()) + "}");
    blinkLED(1);
    
  } else {
    Serial.println("{\"error\":\"Comando não reconhecido\",\"action\":\"" + action + "\"}");
  }
  
  // Se duration especificado, para após o tempo
  if (duration > 0 && action != "stop" && action != "ping") {
    delay(duration);
    stopMotors();
    Serial.println("{\"status\":\"stopped\",\"reason\":\"duration_ended\"}");
  }
}

void moveForward(int speed) {
  // Motor esquerdo para frente
  digitalWrite(LEFT_DIR1, HIGH);
  digitalWrite(LEFT_DIR2, LOW);
  analogWrite(MOTOR_LEFT_A, speed);
  analogWrite(MOTOR_LEFT_B, 0);
  
  // Motor direito para frente
  digitalWrite(RIGHT_DIR1, HIGH);
  digitalWrite(RIGHT_DIR2, LOW);
  analogWrite(MOTOR_RIGHT_A, speed);
  analogWrite(MOTOR_RIGHT_B, 0);
}

void moveBackward(int speed) {
  // Motor esquerdo para trás
  digitalWrite(LEFT_DIR1, LOW);
  digitalWrite(LEFT_DIR2, HIGH);
  analogWrite(MOTOR_LEFT_A, 0);
  analogWrite(MOTOR_LEFT_B, speed);
  
  // Motor direito para trás
  digitalWrite(RIGHT_DIR1, LOW);
  digitalWrite(RIGHT_DIR2, HIGH);
  analogWrite(MOTOR_RIGHT_A, 0);
  analogWrite(MOTOR_RIGHT_B, speed);
}

void turnLeft(int speed) {
  // Motor esquerdo para trás (ou parado)
  digitalWrite(LEFT_DIR1, LOW);
  digitalWrite(LEFT_DIR2, HIGH);
  analogWrite(MOTOR_LEFT_A, 0);
  analogWrite(MOTOR_LEFT_B, speed/2);
  
  // Motor direito para frente
  digitalWrite(RIGHT_DIR1, HIGH);
  digitalWrite(RIGHT_DIR2, LOW);
  analogWrite(MOTOR_RIGHT_A, speed);
  analogWrite(MOTOR_RIGHT_B, 0);
}

void turnRight(int speed) {
  // Motor esquerdo para frente
  digitalWrite(LEFT_DIR1, HIGH);
  digitalWrite(LEFT_DIR2, LOW);
  analogWrite(MOTOR_LEFT_A, speed);
  analogWrite(MOTOR_LEFT_B, 0);
  
  // Motor direito para trás (ou parado)
  digitalWrite(RIGHT_DIR1, LOW);
  digitalWrite(RIGHT_DIR2, HIGH);
  analogWrite(MOTOR_RIGHT_A, 0);
  analogWrite(MOTOR_RIGHT_B, speed/2);
}

void stopMotors() {
  // Para todos os motores
  analogWrite(MOTOR_LEFT_A, 0);
  analogWrite(MOTOR_LEFT_B, 0);
  analogWrite(MOTOR_RIGHT_A, 0);
  analogWrite(MOTOR_RIGHT_B, 0);
  
  // Desativa direções
  digitalWrite(LEFT_DIR1, LOW);
  digitalWrite(LEFT_DIR2, LOW);
  digitalWrite(RIGHT_DIR1, LOW);
  digitalWrite(RIGHT_DIR2, LOW);
}

void blinkLED(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }
}