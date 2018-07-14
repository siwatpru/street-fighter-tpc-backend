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

const printState = (state) => {
  switch(state) {
    case STATE.IDLE: return 'IDLE'
    case STATE.TOB: return 'TOB'
    case STATE.PAE: return 'PAE'
    case STATE.ACTION: return 'ACTION'
  }
}

const printAction = (action) => {
  switch(action) {
    case ACTION.TOB: return 'TOB'
    case ACTION.PAE: return 'PAE'
    case ACTION.CHARGE: return 'CHARGE'
    case ACTION.ATTACK: return 'ATTACK'
    case ACTION.DEFEND: return 'DEFEND'
  }
}

const processAction = (id, action) => {
  // Process player's state
  if (
    game.player1.id === id &&
    checkActionIntregity(game.player1.state, action)
  ) {
    if (
      game.player1.state == game.player2.state ||
      game.player2.state - game.player1.state === 1
    ) {
      game.player1.state += 1;
      game.player1.lastAction = action;
    }
  }
  if (
    game.player2.id === id &&
    checkActionIntregity(game.player2.state, action)
  ) {
    if (
      game.player2.state == game.player1.state ||
      game.player1.state - game.player2.state === 1
    ) {
      game.player2.state += 1;
      game.player2.lastAction = action;
    }
  }

  // Check actions, if player state is equal and on state 4
  if (game.player1.state === STATE.ACTION && game.player2.state === STATE.ACTION) {
    if (game.player1.lastAction === ACTION.CHARGE) game.player1.charge += 1;
    if (game.player2.lastAction === ACTION.CHARGE) game.player2.charge += 1;

    if (game.player1.lastAction === ACTION.ATTACK && game.player1.charge >= 3) {
      game.player1.charge -= 3;
      if (game.player2.lastAction === ACTION.CHARGE) {
        game.player2.hp -= 1;
      }
      if (
        game.player2.lastAction === ACTION.DEFEND &&
        game.player2.charge >= 1
      ) {
        game.player2.charge -= 1;
      }
    }
    if (game.player2.lastAction === ACTION.ATTACK && game.player2.charge >= 3) {
      game.player2.charge -= 3;
      if (game.player1.lastAction === ACTION.CHARGE) {
        game.player1.hp -= 1;
      }
      if (
        game.player1.lastAction === ACTION.DEFEND &&
        game.player1.charge >= 1
      ) {
        game.player1.charge -= 1;
      }
    }
    // Revert state back to idle
    game.player1.state = STATE.IDLE;
    game.player2.state = STATE.IDLE;
  }

  console.log(`${game.player1.id}: state: ${printState(game.player1.state)} HP: ${game.player1.hp} Charge: ${game.player2.charge}`);
  console.log(`${game.player2.id}: state: ${printState(game.player2.state)} HP: ${game.player2.hp} Charge: ${game.player2.charge}`);

  // TODO:Check Player's HP and update game state
};

io.on('connection', socket => {
  console.log('Player connected')
  if (!game.player1.id){
    game.player1.id = socket.id;
  } else {
    game.player2.id = socket.id;
  }

  socket.on('action', action => {
    console.log(`${socket.id}: ${printAction(action)}`)
    processAction(socket.id, action);
  });
});

http.listen(port, () => {
  console.log('listening on *:' + port);
});
