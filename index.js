const app = require('express')();

const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 5000;

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

let room = {
}

let game = {
  player1: {
    id: null,
    state: STATE.IDLE,
    hp: 3,
    charge: 0,
    lastAction: -1,
  },
  player2: {
    id: null,
    state: STATE.IDLE,
    hp: 3,
    charge: 0,
    lastAction: -1,
  },
};

const emptyPlayerObject = {
  state: STATE.IDLE,
  hp: 3,
};

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const checkActionIntregity = (state, action) => {
  if (action < 2) {
    return action == state;
  } else {
    return state == STATE.PAE;
  }
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

const processAction = (roomId, id, action) => {
  // Process player's state
  if (
    room[roomId].player1.id === id &&
    checkActionIntregity(room[roomId].player1.state, action)
  ) {
    if (
      room[roomId].player1.state == room[roomId].player2.state ||
      room[roomId].player2.state - room[roomId].player1.state === 1
    ) {
      room[roomId].player1.state += 1;
      room[roomId].player1.lastAction = action;
    }
  } else if (
    room[roomId].player2.id === id &&
    checkActionIntregity(room[roomId].player2.state, action)
  ) {
    if (
      room[roomId].player2.state == room[roomId].player1.state ||
      room[roomId].player1.state - room[roomId].player2.state === 1
    ) {
      room[roomId].player2.state += 1;
      room[roomId].player2.lastAction = action;
    }
  }

  // Check actions, if player state is equal and on state 4
  if (
    room[roomId].player1.state === STATE.ACTION &&
    room[roomId].player2.state === STATE.ACTION
  ) {
    if (room[roomId].player1.lastAction === ACTION.CHARGE) {
      console.log('player1 charge')
      room[roomId].player1.charge += 1;
    }
    if (room[roomId].player2.lastAction === ACTION.CHARGE) {
      console.log('player2 charge')
      room[roomId].player2.charge += 1;
    }

    if (room[roomId].player1.lastAction === ACTION.ATTACK && room[roomId].player1.charge >= 3) {
      console.log('player1 attack')
      room[roomId].player1.charge -= 3;
      if (room[roomId].player2.lastAction === ACTION.CHARGE) {
        room[roomId].player2.hp -= 1;
      }
    }
    if (room[roomId].player2.lastAction === ACTION.ATTACK && room[roomId].player2.charge >= 3) {
      console.log('player2 attack')
      room[roomId].player2.charge -= 3;
      if (room[roomId].player1.lastAction === ACTION.CHARGE) {
        room[roomId].player1.hp -= 1;
      }
    }

    if (room[roomId].player1.lastAction === ACTION.DEFEND && room[roomId].player1.charge >= 1) {
      console.log('player1 defend')
      room[roomId].player1.charge -= 1;
    }
    if (room[roomId].player2.lastAction === ACTION.DEFEND && room[roomId].player2.charge >= 1) {
      console.log('player2 defend')
      room[roomId].player2.charge -= 1;
    }

    // Revert state back to idle
    room[roomId].player1.state = STATE.IDLE;
    room[roomId].player2.state = STATE.IDLE;
  }

  console.log(`Room: ${roomId}`)
  console.log(
    `${room[roomId].player1.id}: state: ${printState(room[roomId].player1.state)} HP: ${
      room[roomId].player1.hp
    } Charge: ${room[roomId].player1.charge} lastAction ${room[roomId].player1.lastAction}`,
  );
  console.log(
    `${room[roomId].player2.id}: state: ${printState(room[roomId].player2.state)} HP: ${
      room[roomId].player2.hp
    } Charge: ${room[roomId].player2.charge} lastAction ${room[roomId].player2.lastAction}`,
  );

  io.emit('game_state', room)

  // TODO:Check Player's HP and update game state
  if (game.player1.hp <= 0) console.log('Player2 win');
  if (game.player2.hp <= 0) console.log('Player1 win');
};

io.on('connection', socket => {
  console.log('Player connected to server');

  socket.on('join_room', roomId => {
    console.log(`${socket.id} joins ${roomId}`)
    if(!room[roomId]) {
      room[roomId] = Object.assign({}, game)
      room[roomId].player1.id = socket.id
    } else {
      room[roomId].player2.id = socket.id

      // Broadcast game started
      io.emit('game_start', roomId)
    }
  })

  socket.on('action', data => {
    console.log(`Room: ${data.roomId} ${socket.id}: ${printAction(data.action)}`);
    processAction(data.roomId, socket.id, data.action);
  });
});

http.listen(port, () => {
  console.log('listening on *:' + port);
});
