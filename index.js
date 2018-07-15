const app = require('express')();

const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');

const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 5000;

let data = {};
let states = {};
let model;
let evaluate = true;
let evaluating = false;

tf.loadModel('file://./model.tfjs/model.json').then(x => {
  console.log('Model loaded');
  model = x;
});

function applyFilter(name, newMove) {
  if (!states[name] || states[name].lastMove != newMove) {
    states[name] = {
      lastMove: newMove,
      lastTime: Date.now(),
    };
    return 0;
  } else {
    var time = Date.now() - states[name].lastTime;
    if (time > 100) {
      return time;
    } else {
      return 0;
    }
  }
}

function parseData(arr) {
  // Same logic as in python
  var prevAccel = null;
  var prevGyro = null;
  var prevType = '';
  var data = [];

  var i = 0;
  arr.forEach(current => {
    if (current.type == 'gyro') prevGyro = current;
    if (prevType == 'accel' && prevGyro) {
      i++;
      if (i % 2 == 1)
        data.push([
          prevAccel.x,
          prevAccel.y,
          prevAccel.z,
          prevGyro.x,
          prevGyro.y,
          prevGyro.z,
        ]);
    }
    prevType = current.type;
    if (current.type == 'accel') prevAccel = current;
  });

  return data;
}

function clean(str) {
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-');
}

function updateDevices() {
  if (controlSocket) {
    controlSocket.emit('devices', connectedDevices.map(x => x.name));
  }
}

function argMax(arr) {
  var max = 0;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] > arr[max]) {
      max = i;
    }
  }
  return max;
}

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

let room = {};

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
  if (!room[roomId]) {
    return;
  }

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
      console.log('player1 charge');
      room[roomId].player1.charge += 1;
    }
    if (room[roomId].player2.lastAction === ACTION.CHARGE) {
      console.log('player2 charge');
      room[roomId].player2.charge += 1;
    }

    if (
      room[roomId].player1.lastAction === ACTION.ATTACK &&
      room[roomId].player1.charge >= 3
    ) {
      console.log('player1 attack');
      room[roomId].player1.charge -= 3;
      if (room[roomId].player2.lastAction === ACTION.CHARGE) {
        room[roomId].player2.hp -= 1;
      }
    }
    if (
      room[roomId].player2.lastAction === ACTION.ATTACK &&
      room[roomId].player2.charge >= 3
    ) {
      console.log('player2 attack');
      room[roomId].player2.charge -= 3;
      if (room[roomId].player1.lastAction === ACTION.CHARGE) {
        room[roomId].player1.hp -= 1;
      }
    }

    if (
      room[roomId].player1.lastAction === ACTION.DEFEND &&
      room[roomId].player1.charge >= 1
    ) {
      console.log('player1 defend');
      room[roomId].player1.charge -= 1;
    }
    if (
      room[roomId].player2.lastAction === ACTION.DEFEND &&
      room[roomId].player2.charge >= 1
    ) {
      console.log('player2 defend');
      room[roomId].player2.charge -= 1;
    }

    // Revert state back to idle
    room[roomId].player1.state = STATE.IDLE;
    room[roomId].player2.state = STATE.IDLE;
  }

  console.log(`Room: ${roomId}`);
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

  io.emit('game_state', room);

  // TODO:Check Player's HP and update game state
  if (room[roomId].player1.hp <= 0) {
    console.log('Player2 win');
    io.emit('game_end', {roomId: roomId, playerWin: 2});
    delete room[roomId];
  } else if (room[roomId].player2.hp <= 0) {
    console.log('Player1 win');
    io.emit('game_end', {roomId: roomId, playerWin: 1});
    delete room[roomId];
  }
};

io.on('connection', socket => {
  console.log(`${socket.id} connected to server`);

  socket.on('join', roomId => {
    console.log(`${socket.id} joins ${roomId}`);
    if (!room[roomId]) {
      room[roomId] = {
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
      room[roomId].player1.id = socket.id;
      io.emit('player_join', {roomId: roomId, playerNumber: 1});
    } else {
      room[roomId].player2.id = socket.id;
      io.emit('player_join', {roomId: roomId, playerNumber: 2});
      // Broadcast game started
      io.emit('game_start', {room: room});
    }
  });

  socket.on('data', msg => {
    const {roomId} = msg;

    if (!data[socket.id]) data[socket.id] = [];
    let thisData = data[socket.id];

    thisData.push(msg);

    if (evaluate && !evaluating && thisData.length > 50) {
      evaluating = true;
      const start = Date.now();
      const parsedData = [parseData(thisData.slice(-100))];
      let result = model.predict(tf.tensor3d(parsedData));
      result.data().then(data => {
        evaluating = false;
        const max = argMax(data);
        if (data[max] >= 0.5) {
          const time = Date.now() - start;
          const ms = applyFilter(socket.id, max);
          if (ms && max >= ACTION.TOB && max <= ACTION.DEFEND) {
            processAction(roomId, socket.id, max);
          }
        }
      });
    }
    // Periodically clear
    if (thisData.length > 5000) {
      data[socket.id] = thisData.slice(-500);
    }
  });

  socket.on('action', data => {
    console.log(
      `Room: ${data.roomId} ${socket.id}: ${printAction(data.action)}`,
    );
    processAction(data.roomId, socket.id, data.action);
  });
});

http.listen(port, () => {
  console.log('listening on *:' + port);
});
