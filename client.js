const io = require('socket.io-client');

const socket = io('http://192.168.180.228:5000');
socket.on('connect', () => {
  console.log(`connect ${socket.id}`);
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
  socket.emit('action', action);
});
