(function(){
 if(!state.controller)return;
 var panel=document.getElementById('panel');
 var title=document.createElement('h2');title.textContent='Automatic home screen';panel.appendChild(title);
 var info=document.createElement('p');panel.appendChild(info);
 var controls=document.createElement('div');controls.className='tools';panel.appendChild(controls);
 [['Start watcher','watcher-resume'],['Pause watcher','watcher-pause']].forEach(function(pair){
  var b=document.createElement('button');b.textContent=pair[0];b.onclick=function(){request({action:pair[1]},refresh);};controls.appendChild(b);
 });
 var note=document.createElement('p');note.textContent='Physical Home returns here after a short delay while watching. Open Vizio Home pauses the watcher. It starts paused after a server restart.';panel.appendChild(note);
 function refresh(){var x=new XMLHttpRequest();x.open('GET','/watcher');x.timeout=5000;x.onload=function(){if(x.status!==200)return;var s=JSON.parse(x.responseText);info.textContent=(s.enabled?'On — ':'Off — ')+s.detail+(s.observed?' | Last TV state: '+JSON.stringify(s.observed):'');};x.onerror=x.ontimeout=function(){info.textContent='Server unavailable';};x.send();}
 refresh();setInterval(refresh,3000);
}());
