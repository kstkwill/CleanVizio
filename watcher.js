'use strict';
// Unknown states fail closed. Never sends power or input commands.
function value(r) { return r && (r.ITEM || (r.ITEMS && r.ITEMS[0]))?.VALUE; }
function eligible(s) {
  return (s.power === 1 || s.power === '1') &&
    typeof s.input === 'string' && /^(smartcast|cast|vizio home)$/i.test(s.input.trim()) &&
    s.app && Number(s.app.NAME_SPACE) === 4 && String(s.app.APP_ID) === '1';
}
function createWatcher({request, launch, log = () => {}, now = Date.now}) {
  let enabled = false, generation = 0, homeSince = null, lastAttempt = -Infinity;
  let holdUntil = 0, running = false, timer, detail = 'Paused', observed = null;
  const status = () => ({enabled, detail, observed});
  function pause() { enabled = false; generation++; homeSince = null; detail = 'Paused'; return status(); }
  function resume() { enabled = true; generation++; homeSince = null; detail = 'Watching'; return status(); }
  function hold() { generation++; homeSince = null; holdUntil = now() + 30000; }
  async function snapshot() {
    const power = value(await request('GET', '/state/device/power_mode'));
    if (power !== 1 && power !== '1') return {power};
    const input = value(await request('GET', '/menu_native/dynamic/tv_settings/devices/current_input'));
    const app = value(await request('GET', '/app/current'));
    return {power, input, app};
  }
  async function tick() {
    if (!enabled || running) return;
    running = true;
    const version = generation;
    try {
      const s = await snapshot();
      if (!enabled || version !== generation) return;
      observed = {power:s.power ?? null, input:s.input ?? null,
        app:s.app ? {APP_ID:s.app.APP_ID, NAME_SPACE:s.app.NAME_SPACE} : null};
      if (!eligible(s)) { homeSince = null; detail = 'Waiting: TV off, another app/input, or unknown state'; return; }
      if (now() < holdUntil || now() - lastAttempt < 60000) { homeSince = null; detail = 'Waiting after a command'; return; }
      if (homeSince === null) homeSince = now();
      detail = 'Home detected; waiting 2 seconds';
      if (now() - homeSince < 2000) return;
      // Fresh power/input/app checks immediately before launch reduce transition races.
      const fresh = await snapshot();
      if (!enabled || version !== generation || !eligible(fresh)) { homeSince = null; return; }
      lastAttempt = now(); homeSince = null;
      await launch();
      if (version === generation) detail = 'Launch accepted; waiting for TV';
      log('Watcher requested CleanVizio');
    } catch (e) {
      if (version === generation) { homeSince = null; detail = 'TV unavailable: ' + e.message; }
    } finally { running = false; }
  }
  return {status, pause, resume, hold, tick,
    start() { if (!timer) timer = setInterval(tick, 1000); },
    stop() { pause(); clearInterval(timer); timer = null; }};
}
module.exports = {createWatcher, eligible};
