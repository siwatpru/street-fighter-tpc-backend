const io = require('socket.io-client');

const STATE = {
  IDLE: 0,
  TOB: 1,
  PAE: 2,
  ACTION: 3,
};

const ACTION = {
  TOB: 0,
  PAE: 1,
  CHARGE: 2,
  ATTACK: 3,
  DEFEND: 4,
};

const printState = state => {
  switch (state) {
    case STATE.IDLE:
      return 'IDLE';
    case STATE.TOB:
      return 'TOB';
    case STATE.PAE:
      return 'PAE';
    case STATE.ACTION:
      return 'ACTION';
  }
};

const printAction = action => {
  switch (action) {
    case ACTION.TOB:
      return 'TOB';
    case ACTION.PAE:
      return 'PAE';
    case ACTION.CHARGE:
      return 'CHARGE';
    case ACTION.ATTACK:
      return 'ATTACK';
    case ACTION.DEFEND:
      return 'DEFEND';
  }
};

const socket = io('http://192.168.180.228:5000');
socket.on('connect', () => {
  console.log(`connect ${socket.id}`);

  socket.emit('join_room', 5555);
});

socket.on('game_start', ({roomId}) => {
  console.log(`Game start at room ${roomId}`);
});

socket.on('player_join', ({roomId, playerNumber}) => {
  console.log(`Room: ${roomId}: ${playerNumber} players`);
});

socket.on('game_state', room => {
  let roomId = 5555;
  console.log(
    `${room[roomId].player1.id}: state: ${printState(
      room[roomId].player1.state,
    )} HP: ${room[roomId].player1.hp} Charge: ${
      room[roomId].player1.charge
    } lastAction ${printAction(room[roomId].player1.lastAction)}`,
  );
  console.log(
    `${room[roomId].player2.id}: state: ${printState(
      room[roomId].player2.state,
    )} HP: ${room[roomId].player2.hp} Charge: ${
      room[roomId].player2.charge
    } lastAction ${printAction(room[roomId].player2.lastAction)}`,
  );
});

socket.on('win', () => {
  console.log(`win`);
});

socket.on('lose', () => {
  console.log(`lose`);
});

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on('line', input => {
  const action = parseInt(input);
  socket.emit('action', {roomId: 5555, action});
});
