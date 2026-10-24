(function () {
  if (!state.controller) return;
  var panel = document.getElementById('panel');
  var section = document.createElement('section');
  section.className = 'remote';
  section.setAttribute('aria-label', 'TV remote');
  section.innerHTML = '<p>Control the TV while an app or HDMI input is open.</p>' +
    '<div class="remote-groups"></div><p id="remote-status" role="status" aria-live="polite">Ready to send commands.</p>' +
    '<p class="remote-note">Power on requires the TV to remain reachable over Wi-Fi. If it does not respond, use the physical remote. Channel buttons control the TV tuner; streaming apps may ignore them.</p>';
  panel.insertBefore(section, panel.children[1]);
  // Put the remote before the dashboard on the computer control page only.
  document.querySelector('main').insertBefore(panel, document.querySelector('main').children[1]);
  var groups = [
    ['Navigation', [['nav-up', 'Up'], ['nav-left', 'Left'], ['nav-ok', 'OK'], ['nav-right', 'Right'], ['nav-down', 'Down'], ['nav-back', 'Back']]],
    ['Volume', [['volume-down', 'Volume −'], ['volume-up', 'Volume +'], ['mute', 'Mute'], ['unmute', 'Unmute']]],
    ['Power and input', [['power-on', 'Power on'], ['power-off', 'Power off'], ['input-next', 'Next input']]],
    ['Channels', [['channel-down', 'Channel −'], ['channel-up', 'Channel +'], ['channel-previous', 'Previous channel']]]
  ];
  var buttons = [], status = document.getElementById('remote-status');
  groups.forEach(function (group) {
    var box = document.createElement('div'), heading = document.createElement('h3');
    heading.textContent = group[0]; box.appendChild(heading);
    var row = document.createElement('div'); row.className = 'tools'; box.appendChild(row);
    if (group[0] === 'Navigation') {
      row.className += ' remote-dpad';
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', 'TV directional pad');
    }
    group[1].forEach(function (item) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = item[1];
      b.setAttribute('data-command', item[0]);
      b.setAttribute('aria-label', item[1]);
      var arrows = {'nav-up':'\u25b2', 'nav-down':'\u25bc', 'nav-left':'\u25c0', 'nav-right':'\u25b6'};
      if (arrows[item[0]]) b.textContent = arrows[item[0]];
      b.onclick = function () {
        if (busy) { status.textContent = 'Please wait for the current command.'; return; }
        busy = true;
        buttons.forEach(function (button) { button.disabled = true; });
        status.textContent = 'Sending ' + item[1].toLowerCase() + '...';
        var x = new XMLHttpRequest();
        function finish(message) {
          busy = false; buttons.forEach(function (button) { button.disabled = false; });
          status.textContent = message;
        }
        x.open('POST', '/action'); x.timeout = 12000;
        x.setRequestHeader('Content-Type', 'application/json');
        x.setRequestHeader('X-CleanVizio-Key', state.key);
        x.onload = function () {
          try {
            var result = JSON.parse(x.responseText);
            if (x.status !== 200) throw Error(result.error || 'Command failed');
            finish(item[1] + ': TV accepted the command.');
          } catch (e) { finish(e.message); }
        };
        x.onerror = x.ontimeout = function () { finish('Cannot reach the server. Check that CleanVizio is running.'); };
        x.send(JSON.stringify({action: 'remote', command: item[0]}));
      };
      buttons.push(b); row.appendChild(b);
    });
    section.querySelector('.remote-groups').appendChild(box);
  });
})();
