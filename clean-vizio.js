'use strict';
// No dependencies. The paired token stays in this process, never in the page or config.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const liveData = require('./live-data');
const {createWatcher} = require('./watcher');
const TV = process.env.CLEANVIZIO_TV;
const BIND = process.env.CLEANVIZIO_BIND || '127.0.0.1';
const PORT = Number(process.env.CLEANVIZIO_PORT || 8765);
const TOKEN = process.env.CLEANVIZIO_TOKEN;
const DATA = path.join(__dirname, 'shortcuts.json');
const HOME = { APP_ID: '1', NAME_SPACE: 4, MESSAGE: '{"app":"home","bundle":"bundles/home"}' };
const key = crypto.randomBytes(24).toString('hex');
let apps = [];
if (fs.existsSync(DATA)) {
  apps = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  if (!Array.isArray(apps)) throw new Error('shortcuts.json must contain an array.');
}
function log(message) { console.log('[' + new Date().toISOString() + '] ' + message); }
function tvRequest(method, route, value) {
  log(method + ' ' + route);
  const body = value === undefined ? null : JSON.stringify(value);
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: TV, port: 7345, path: route, method,
      rejectUnauthorized: false, timeout: 8000,
      headers: { AUTH: TOKEN, 'Content-Type': 'application/json', ...(body ? {'Content-Length': Buffer.byteLength(body)} : {}) }
    }, res => {
      let result = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { result += chunk; if (result.length > 1048576) req.destroy(new Error('Response too large')); });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) throw new Error('TV HTTP status ' + res.statusCode);
          const parsed = JSON.parse(result); // Preserves differently cased JSON keys.
          const status = parsed.STATUS && parsed.STATUS.RESULT;
          if (String(status).toUpperCase() !== 'SUCCESS') throw new Error('TV returned ' + (status || 'no status'));
          log('TV accepted ' + route);
          resolve(parsed);
        } catch (err) { reject(err); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('TV request timed out')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
function saveApps() {
  fs.writeFileSync(DATA + '.tmp', JSON.stringify(apps, null, 2), {mode: 0o600});
  fs.renameSync(DATA + '.tmp', DATA);
}
function validConfig(c) {
  return c && typeof c.APP_ID === 'string' && Number.isInteger(c.NAME_SPACE) &&
    (c.MESSAGE === null || typeof c.MESSAGE === 'string');
}
const watcher = createWatcher({request:tvRequest, log, launch:() => tvRequest('PUT','/app/launch',{VALUE:{NAME_SPACE:4,APP_ID:'3001',MESSAGE:'http://'+BIND+':'+PORT+'/'}})});
async function action(input) {
  if(input.action==='remote') return require('./remote').sendRemote(input.command, tvRequest, watcher);
  if(input.action==='watcher-resume') return watcher.resume();
  if(input.action==='watcher-pause') return watcher.pause();
  if(input.action==='home') watcher.pause();
  if(['launch','show','capture'].includes(input.action)) watcher.hold();
  if (input.action === 'show') return tvRequest('PUT', '/app/launch', {VALUE: {
    NAME_SPACE: 4, APP_ID: '3001', MESSAGE: 'http://' + BIND + ':' + PORT + '/'
  }});
  if (input.action === 'home') return tvRequest('PUT', '/app/launch', {VALUE: HOME});
  if (input.action === 'launch') {
    const item = apps.find(a => a.id === input.id);
    if (!item || !validConfig(item.config)) throw new Error('Unknown shortcut');
    return tvRequest('PUT', '/app/launch', {VALUE: item.config});
  }
  if (input.action === 'capture') {
    const name = String(input.name || '').trim();
    if (!name || name.length > 40) throw new Error('Enter an app name (1-40 characters).');
    const result = await tvRequest('GET', '/app/current');
    const config = result.ITEM && result.ITEM.VALUE;
    if (!validConfig(config)) throw new Error('TV did not return a usable app launch configuration.');
    if (config.NAME_SPACE === 4 && ['1','3001'].includes(config.APP_ID))
      throw new Error('Open the streaming app on the TV first, then add it here.');
    const existing = apps.find(a => a.name.toLowerCase() === name.toLowerCase());
    if (existing) existing.config = config;
    else apps.push({id: crypto.randomBytes(8).toString('hex'), name, config});
    saveApps();
    log('Saved shortcut: ' + name);
    return {saved: name};
  }
  if (input.action === 'remove') {
    apps = apps.filter(a => a.id !== input.id); saveApps();
    return {removed: true};
  }
  throw new Error('Unknown action');
}
function legacyPage(controller) {
  const initial = JSON.stringify({key, controller, apps: apps.map(a => ({id:a.id, name:a.name}))}).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Clean Vizio</title>
<style>
*{box-sizing:border-box}html{background:#080b15}body{margin:0;color:#f8f9ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;min-height:100vh;overflow-x:hidden;background:#080b15}body:before{content:'';position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse at 78% 22%,#243e65 0,transparent 48%),radial-gradient(ellipse at 38% 100%,#302749 0,transparent 60%),linear-gradient(125deg,#080b15,#111728);z-index:0}main{position:relative;padding:5.5vh 6vw 3vh;max-width:1920px;margin:auto}.top{display:flex;justify-content:space-between;align-items:center}.brand{font-size:20px;font-weight:600;letter-spacing:-.5px}.room{margin-top:6px;color:#a6aec2;font-size:15px}.time{text-align:right;font-size:27px;font-weight:500;letter-spacing:-.7px}.date{font-size:13px;color:#a6aec2;text-align:right;margin-top:5px}.hero{position:relative;margin:6vh 0 0;min-height:35vh;padding:5vh 4vw;border:1px solid #ffffff1c;border-radius:28px;overflow:hidden;background:linear-gradient(115deg,#ffffff0d,#ffffff03)}.hero:after{content:'';position:absolute;width:44vw;height:44vw;border:1px solid #ffffff15;right:-14vw;top:-17vw;border-radius:50%;box-shadow:0 0 0 55px #ffffff03,0 0 0 110px #ffffff02;pointer-events:none}.eyebrow{text-transform:uppercase;letter-spacing:3px;font-size:12px;font-weight:600;color:#bbc4dc}.hero h1{position:relative;font-size:clamp(42px,5.2vw,88px);font-weight:600;letter-spacing:-3px;margin:18px 0 14px;z-index:1;max-width:75%;overflow-wrap:anywhere;line-height:1.05}.sub{font-size:20px;line-height:1.5;color:#b8c1d4;max-width:65%;position:relative;z-index:1}.hint{display:inline-block;margin-top:25px;color:#dce4f3;font-size:14px}.hint b{display:inline-block;border:1px solid #ffffff50;border-radius:6px;padding:3px 6px;margin-right:9px;font-size:12px}.section-head{display:flex;justify-content:space-between;align-items:center;margin:4vh 0 20px}.section-head h2{margin:0;font-size:23px;letter-spacing:-.4px;font-weight:600}.section-head span{font-size:14px;color:#9faac0}.tiles{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:22px;padding:10px 7px 18px;margin:0 -7px}button{font:inherit;cursor:pointer;color:inherit}.tile{position:relative;border:1px solid #ffffff25;border-radius:20px;background:linear-gradient(145deg,#36445e,#182335);min-height:140px;padding:26px 15px;text-align:center;font-size:clamp(19px,1.8vw,30px);font-weight:650;letter-spacing:-.6px;box-shadow:0 8px 20px #00000035;transition:transform .18s,box-shadow .18s;overflow:visible}.tile span{display:block;font-size:10px;font-weight:500;color:#e2e6ed;letter-spacing:2px;margin-top:16px}.tile.youtube{background:linear-gradient(135deg,#f1263f,#c40825)}.tile.youtube:before{content:'';display:block;margin:0 auto 12px;width:0;height:0;border-top:12px solid transparent;border-bottom:12px solid transparent;border-left:20px solid white}.tile.netflix{background:#141414;color:#ff3445}.tile.disney{background:linear-gradient(130deg,#17459a,#0c1d4e)}.tile.prime{background:linear-gradient(130deg,#168ddd,#0959a1)}.tile.home{background:linear-gradient(135deg,#475267,#242c3c)}button:focus,input:focus{outline:3px solid white;outline-offset:5px}.tile:focus{transform:scale(1.045);box-shadow:0 18px 45px #0008,0 0 24px #c4d7ff22}footer{display:flex;justify-content:space-between;gap:20px;margin-top:12px;color:#929db5;font-size:13px}.status{min-height:25px;margin-top:17px;color:#d0def7;font-size:16px}.panel{margin-top:45px;padding:30px;border-radius:22px;background:#ffffff09;border:1px solid #ffffff20;max-width:900px}.panel h2{font-size:23px}.panel p{color:#aebad0;line-height:1.6}.tools{display:flex;flex-wrap:wrap;gap:12px}.tools button{background:#e9edf7;color:#121b2c;border:0;border-radius:11px;padding:13px 20px;font-size:16px}input{background:#131d30;color:#fff;border:1px solid #79859b;border-radius:10px;padding:13px;font-size:18px;max-width:100%}.manage{margin-top:20px}.manage button{background:transparent;color:#cbd5e8;border:1px solid #65718a;border-radius:8px;padding:9px 14px;margin:5px;font-size:15px}
@media(min-width:1600px){.tile{min-height:175px}}@media(max-width:900px){.tiles{grid-template-columns:repeat(3,minmax(0,1fr))}.hero h1{font-size:54px}.sub{max-width:85%}}@media(max-width:600px){main{padding:28px 24px}.date{max-width:130px}.hero{padding:32px 24px;margin-top:32px;min-height:280px}.hero h1{font-size:42px;letter-spacing:-1.5px;max-width:100%}.sub{font-size:17px;max-width:100%}.tiles{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.tile{font-size:22px;min-height:135px}footer{flex-direction:column;gap:8px}.section-head span{font-size:12px}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style></head><body><main><div class="top"><div><div class="brand">Living Room</div><div class="room">Your space. Your screen.</div></div><div><div id="clock" class="time"></div><div id="date" class="date"></div></div></div><section class="hero"><div class="eyebrow">Make yourself at home</div><h1 id="selected-name">Good evening.</h1><div class="sub" id="selected-description">Everything you love. Right where you left it.</div><div class="hint"><b>OK</b> Open selected app</div></section><div class="section-head"><h2>Your apps</h2><span>Just your favorites</span></div><div class="tiles" id="tiles"></div><div class="status" id="status" role="status"></div><footer><span>Arrow keys to explore &nbsp; · &nbsp; OK to open</span><span>Home returns to Vizio</span></footer><section id="panel" class="panel" hidden><h2>Control your TV</h2><div class="tools"><button id="show">Show custom screen</button><button id="home">Open Vizio Home</button></div><h2 style="margin-top:30px">Add an app</h2><p>Open an app on the TV using its remote. Enter the app name below, then choose Add current app. This saves a shortcut on this computer.</p><div class="tools"><input id="name" maxlength="40" placeholder="YouTube" aria-label="App name"><button id="capture">Add current app</button></div><div class="manage" id="manage"></div></section></main>
<script>
var state=${initial};var busy=false;var tiles=document.getElementById('tiles');var statusEl=document.getElementById('status');
function say(t){statusEl.textContent=t;}
function request(data,done){if(busy)return;busy=true;say('Sending to your TV...');var x=new XMLHttpRequest();x.open('POST','/action');x.setRequestHeader('Content-Type','application/json');x.setRequestHeader('X-CleanVizio-Key',state.key);x.timeout=12000;x.onload=function(){busy=false;var r;try{r=JSON.parse(x.responseText);}catch(e){say('Unexpected response. Check the computer monitor.');return;}if(x.status!==200){say(r.error||'Request failed');return;}say(data.action==='capture'?'Shortcut saved.':'TV accepted the request. Check the screen.');if(done)done(r);};x.onerror=x.ontimeout=function(){busy=false;say('Connection interrupted. Check the computer monitor.');};x.send(JSON.stringify(data));}
function addTile(name,id){var b=document.createElement('button');b.className='tile';var lower=name.toLowerCase();if(!id)b.className+=' home';else if(lower.indexOf('youtube tv')!==-1)b.className+=' youtubetv';else if(lower.indexOf('apple')!==-1)b.className+=' apple';else if(lower.indexOf('paramount')!==-1)b.className+=' paramount';else if(lower.indexOf('youtube')!==-1)b.className+=' youtube';else if(lower.indexOf('netflix')!==-1)b.className+=' netflix';else if(lower.indexOf('disney')!==-1)b.className+=' disney';else if(lower.indexOf('prime')!==-1)b.className+=' prime';b.onfocus=function(){document.getElementById('selected-name').textContent=name;document.getElementById('selected-description').textContent=id?'Your next favorite is a click away.':'Return to your TV’s original home screen.';};b.appendChild(document.createTextNode(name));var s=document.createElement('span');s.textContent=id?'OPEN APP':'ORIGINAL HOME';b.appendChild(s);b.onclick=function(){request(id?{action:'launch',id:id}:{action:'home'});};tiles.appendChild(b);}
state.apps.forEach(function(a){addTile(a.name,a.id);});addTile('Vizio Home',null);
if(!state.apps.length)say('Add your favorite apps from the control page on your computer.');
function clock(){var d=new Date();document.getElementById('clock').textContent=d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit',timeZone:'America/New_York'});document.getElementById('date').textContent=d.toLocaleDateString([], {weekday:'long',month:'long',day:'numeric',timeZone:'America/New_York'});}clock();setInterval(clock,10000);
if(state.controller){document.getElementById('panel').hidden=false;document.getElementById('show').onclick=function(){request({action:'show'});};document.getElementById('home').onclick=function(){request({action:'home'});};document.getElementById('capture').onclick=function(){request({action:'capture',name:document.getElementById('name').value},function(){location.reload();});};state.apps.forEach(function(a){var b=document.createElement('button');b.textContent='Remove '+a.name;b.onclick=function(){request({action:'remove',id:a.id},function(){location.reload();});};document.getElementById('manage').appendChild(b);});}
document.addEventListener('keydown',function(e){if(document.activeElement&&document.activeElement.tagName==='INPUT')return;var list=Array.prototype.slice.call(document.querySelectorAll('button:not(:disabled)'));list=list.filter(function(b){return b.getClientRects().length>0;});var i=list.indexOf(document.activeElement);var code=e.keyCode;if([37,38,39,40].indexOf(code)!==-1){e.preventDefault();var step=(code===37||code===38)?-1:1;list[(i+step+list.length)%list.length].focus();}else if(code===13&&!busy&&document.activeElement&&document.activeElement.tagName==='BUTTON'){e.preventDefault();document.activeElement.click();}else if(code===27||code===10009||code===461){e.preventDefault();request({action:'home'});}});if(tiles.firstChild)tiles.firstChild.focus();
</script></body></html>`;
}

function page(controller) { return require('./glass-page')({key,apps,controller}); }

function reply(res, code, body, type) {
  res.writeHead(code, {'Content-Type': type || 'application/json; charset=utf-8',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
    'Content-Length':Buffer.byteLength(body),Connection:'close'});
  res.end(body);
}
function makeServer() {
  return http.createServer(async (req,res) => {
    const peer = (req.socket.remoteAddress || '').replace(/^::ffff:/,'');
    if (![TV,BIND,'127.0.0.1'].includes(peer)) return reply(res,403,'{"error":"Device not allowed"}');
    if (req.headers.host !== BIND + ':' + PORT) return reply(res,403,'{"error":"Unexpected host"}');
    const route = req.url.split('?')[0];
    if(req.method==='GET' && route==='/watcher') {
      if(peer===TV) return reply(res,403,JSON.stringify({error:'Computer control required'}));
      return reply(res,200,JSON.stringify(watcher.status()));
    }
    if (req.method==='GET' && (route==='/' || route==='/control')) {
      if(route==='/control' && peer===TV) return reply(res,403,'{"error":"Open controls on the computer"}');
      return reply(res,200,page(route==='/control'),'text/html; charset=utf-8');
    }
    if(req.method==='GET' && route==='/health') return reply(res,200,'{"ready":true,"version":"live-data-1"}');
    if(req.method==='GET' && (route==='/data/sports' || route==='/data/weather')) {
      try { return reply(res,200,JSON.stringify(await (route==='/data/sports'?liveData.sports():liveData.weather()))); }
      catch(err) { return reply(res,503,JSON.stringify({error:'Data temporarily unavailable'})); }
    }
    if(req.method!=='POST' || route!=='/action') return reply(res,404,'{"error":"Not found"}');
    if(req.headers['x-cleanvizio-key']!==key) return reply(res,403,'{"error":"Reload the page"}');
    if(req.headers.origin && req.headers.origin!=='http://'+BIND+':'+PORT) return reply(res,403,'{"error":"Unexpected origin"}');
    try {
      let body='';
      for await (const chunk of req) { body+=chunk; if(body.length>4096) throw new Error('Request too large'); }
      const input=JSON.parse(body);
      if(peer===TV && !['launch','home'].includes(input.action)) return reply(res,403,'{"error":"Computer control required"}');
      const result=await action(input);
      reply(res,200,JSON.stringify({ok:true,saved:result.saved}));
    } catch(err) { log('Error: '+err.message); reply(res,400,JSON.stringify({error:err.message})); }
  });
}
if (require.main === module) {
  if (!TV) throw new Error('CLEANVIZIO_TV must specify your TV address.');
  if (!TOKEN || /[\r\n]/.test(TOKEN)) throw new Error('A valid pairing token is required. Run Start-CleanVizio.ps1.');
  const server=makeServer();
  server.requestTimeout=15000; server.headersTimeout=10000;
  server.on('error',err=>{console.error('Server could not start: '+err.message);process.exitCode=1;});
  server.listen(PORT,BIND,()=>{log('Ready: http://'+BIND+':'+PORT+'/control');watcher.start();});
  process.on('SIGINT',()=>server.close(()=>process.exit(0)));
}
module.exports={page,validConfig,HOME};
