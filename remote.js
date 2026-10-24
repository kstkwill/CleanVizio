'use strict';
// Documented SmartCast remote key codes. Accept named commands only.
const commands = Object.freeze({
  'nav-up': [3, 8], 'nav-down': [3, 0],
  'nav-left': [3, 1], 'nav-right': [3, 7],
  'nav-ok': [3, 2], 'nav-back': [4, 0],
  'volume-down': [5, 0], 'volume-up': [5, 1],
  'unmute': [5, 2], 'mute': [5, 3],
  'input-next': [7, 1], 'channel-down': [8, 0],
  'channel-up': [8, 1], 'channel-previous': [8, 2],
  'power-off': [11, 0], 'power-on': [11, 1]
});
async function sendRemote(command, request, watcher) {
  if (typeof command !== 'string' || !Object.hasOwn(commands, command)) {
    throw new Error('Unknown remote command');
  }
  const [CODESET, CODE] = commands[command];
  // Give manual input changes time to settle before automatic home detection.
  if (command === 'input-next' || command.startsWith('power-') || command.startsWith('nav-')) watcher.hold();
  return request('PUT', '/key_command/', {KEYLIST: [{CODESET, CODE, ACTION: 'KEYPRESS'}]});
}
module.exports = {sendRemote};
