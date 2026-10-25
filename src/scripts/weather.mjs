const themes = ['off', 'rain', 'sun', 'snow', 'autumn'];
const names = { off: 'main theme', rain: 'Rainwash', sun: 'Sunlight', snow: 'Snowfall', autumn: 'Autumn leaves' };

export function initDesktopWeather(menu) {
  const root = document.documentElement;
  const human = () => root.dataset.siteView === 'desktop' && root.dataset.audience !== 'agents';
  if (menu.dataset.weatherReady || !human()) return;
  menu.dataset.weatherReady = 'true';
  menu.classList.add('desktop-menu');
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const stored = read('lc-desktop-weather');
  let choice = ['auto', ...themes].includes(stored) ? stored : 'auto';
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const panel = menu.querySelector('nav') || document.createElement('nav');
  panel.setAttribute('aria-label', 'Desktop theme');
  if (!panel.parentElement) menu.append(panel);
  panel.innerHTML = `<label>Theme<select aria-label="Desktop theme" data-weather-select><option value="auto">Local weather</option><option value="off">Off — main theme</option><option value="rain">Rainwash</option><option value="sun">Sunlight</option><option value="snow">Snowfall</option><option value="autumn">Autumn leaves</option></select></label>
    <label><span>Animate effects</span><input type="checkbox" data-weather-motion></label>
    <label><span>Cloud visitor</span><input type="checkbox" data-weather-visitor></label>
    <button type="button" data-weather-stop>Stop theme</button><span role="status" data-weather-status></span>
    <small>Weather: <a href="https://www.met.no/en/free-meteorological-data/Licensing-and-crediting" target="_blank" rel="noopener noreferrer">MET Norway · CC BY 4.0</a>. Forecasts simplified into visual themes. Leaves follow the local season.</small>`;
  const select = panel.querySelector('[data-weather-select]'), animate = panel.querySelector('[data-weather-motion]'), visit = panel.querySelector('[data-weather-visitor]'), stop = panel.querySelector('[data-weather-stop]'), status = panel.querySelector('[data-weather-status]');
  select.value = choice;
  animate.checked = read('lc-weather-motion') === 'play' || read('lc-weather-motion') !== 'pause' && !reduced.matches;
  visit.checked = read('lc-weather-visitor') === 'true';
  let weather='off', paused=!animate.checked, visitor=visit.checked, time=0, last=0, raf=0, width=1, height=1, shapes=[], drops=[];
  let backdrop, edges, ctx, edge, styles, dirty=true, forecast, controller, refresh, revision=0;
  const shell = document.querySelector('[data-desktop-shell]');
  const observer = new MutationObserver(() => { dirty=true; schedule(); });
  function stylesheet() {
    if (styles) return;
    const link=styles=document.createElement('link');link.rel='stylesheet';link.href=menu.dataset.weather.split(' ')[1];
    link.onerror=()=>{if(styles!==link)return;weather='off';select.value=choice='off';unmount();status.textContent='Theme styles unavailable. Using the main theme.';link.remove();styles=undefined;};
    document.head.append(link);
  }
  function unmount() {
    cancelAnimationFrame(raf);raf=0;last=0;observer.disconnect();
    backdrop?.remove();edges?.remove();backdrop=edges=ctx=edge=undefined;
    delete root.dataset.desktopWeather;
  }
  function mount() {
    if (!backdrop) {
      backdrop=document.createElement('canvas');edges=document.createElement('canvas');
      for(const [canvas,className] of [[backdrop,'desktop-weather-backdrop'],[edges,'desktop-weather-edges']]){canvas.className=className;canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:'+(canvas===backdrop?'0':'70');}
      document.querySelector('.desktop-background').after(backdrop);document.body.append(edges);
      ctx=backdrop.getContext('2d');edge=edges.getContext('2d');
      if(!ctx||!edge){unmount();status.textContent='Weather effects are unavailable in this browser.';return;}
      observer.observe(shell,{childList:true,subtree:true,attributes:true,attributeFilter:['style','hidden','data-expanded']});
    }
    root.dataset.desktopWeather=weather;dirty=true;schedule();
  }
  function schedule() { if(!raf&&backdrop&&!document.hidden&&human())raf=requestAnimationFrame(tick); }
  function tick(now) {
    raf=0;if(!backdrop||!human()||document.hidden)return;
    if(!paused&&last&&now-last<1000/30){schedule();return;}
    if(dirty){measure();dirty=false;}
    const dt=paused?0:last?Math.min((now-last)/1000,.06):0;last=now;draw(dt);
    if(!paused)schedule();
  }
  function paint() {
    cancelAnimationFrame(raf);raf=0;last=0;paused=!animate.checked;visitor=visit.checked;
    if(weather==='off')unmount();else mount();
  }
  async function update() {
    const current=++revision;clearTimeout(refresh);controller?.abort();
    stop.disabled=choice==='off';
    if(!human()){unmount();styles?.remove();styles=undefined;return;}
    stylesheet();
    if(document.hidden){cancelAnimationFrame(raf);raf=0;return;}
    if(choice!=='auto'){weather=choice;status.textContent=choice==='off'?'Main theme. Weather is off.':names[choice];paint();return;}
    if(!forecast||forecast.expiresAt<=Date.now()) {
      weather='off';paint();status.textContent='Checking approximate local weather…';
      const requestController=controller=new AbortController();const timeout=setTimeout(()=>requestController.abort(),5000);
      try {
        const base=shell.dataset.base||'/';
        const received=await fetch(base+'api/weather',{credentials:'omit',cache:'no-store',signal:controller.signal});
        if(!received.ok)throw Error('Weather unavailable');
        const data=await received.json();
        if(!themes.includes(data.theme)||!Number.isFinite(data.expiresAt)||data.expiresAt<=Date.now())throw Error('Invalid weather');
        if(current!==revision)return;
        forecast=data;
      } catch {
        if(current!==revision)return;
        forecast={theme:'off',expiresAt:Date.now()+1800000,unavailable:true};
      } finally {clearTimeout(timeout);}
    }
    if(current!==revision||!human()||document.hidden)return;
    weather=forecast.theme;status.textContent=forecast.unavailable?'Local weather unavailable. Using the main theme.':'Local weather: '+names[weather]+'.';paint();
    refresh=setTimeout(update,Math.max(1800000,forecast.expiresAt-Date.now()));
  }
  const save = () => {
    choice=select.value;
    try {localStorage.setItem('lc-desktop-weather',choice);localStorage.setItem('lc-weather-motion',animate.checked?'play':'pause');localStorage.setItem('lc-weather-visitor',String(visit.checked));} catch {}
    update();
  };
  panel.addEventListener('change',save);
  stop.addEventListener('click',()=>{select.value='off';save();menu.open=false;});
  window.addEventListener('resize',()=>{dirty=true;schedule();});
  window.addEventListener('lc:audience-change',update);window.addEventListener('lc:view-change',update);
  document.addEventListener('lc:page-mounted',()=>{dirty=true;schedule();});document.addEventListener('visibilitychange',update);
  reduced.addEventListener('change',event=>{if(event.matches){animate.checked=false;save();}});
  const random=(a,b)=>a+Math.random()*(b-a);
  const reset=p=>{p.x=random(-30,width+30);p.y=random(-height*.5,-10);p.speed=random(.7,1.5);p.size=random(1,3);p.phase=random(0,6.28);return p;};
  function measure(){
    width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio||1,2);
    for(const canvas of [backdrop,edges]){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.getContext('2d').setTransform(dpr,0,0,dpr,0,0);}
    shapes=[...document.querySelectorAll('.desktop-window')].filter(el=>el.getClientRects().length&&!el.hidden).map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}).sort((a,b)=>a.y-b.y);
    if(!drops.length)drops=Array.from({length:190},()=>{const p=reset({});p.y=random(0,height);return p;});
  }
  function drawVisitor(){
    if(!visitor||!shapes.length)return;
    const r=shapes[0],x=r.x+r.w-75+Math.sin(time*.25)*25,y=r.y-19+Math.sin(time*.9)*2;
    edge.save();edge.fillStyle='#ecf6ff';edge.shadowColor='#172a4d50';edge.shadowBlur=8;
    edge.beginPath();edge.roundRect(x-23,y-5,46,23,12);edge.fill();
    for(const c of [[-7,-8,14],[9,-4,11]]){edge.beginPath();edge.arc(x+c[0],y+c[1],c[2],0,Math.PI*2);edge.fill();}
    edge.shadowBlur=0;edge.fillStyle='#385778';for(const dx of [-5,5]){edge.beginPath();edge.arc(x+dx,y+3,1.4,0,Math.PI*2);edge.fill();}
    edge.strokeStyle='#385778';edge.lineWidth=1.2;edge.beginPath();edge.arc(x,y+6,4,.2,Math.PI-.2);edge.stroke();edge.restore();
  }
  function draw(dt){
    time+=dt;ctx.clearRect(0,0,width,height);edge.clearRect(0,0,width,height);
    const active=document.documentElement.dataset.siteView==='desktop'&&document.documentElement.dataset.audience!=='agents'&&innerWidth>=1024;
    if(!active||weather==='off')return;
    drawVisitor();
    if(weather==='sun'){
      const glow=ctx.createRadialGradient(width*.92,50,5,width*.92,50,width*.73);
      glow.addColorStop(0,'#fff2c2db');glow.addColorStop(.46,'#ffeab75c');glow.addColorStop(1,'#fff4d000');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
      for(let i=0;i<5;i++){const origin=width*.92+Math.sin(time*.06)*60;ctx.beginPath();ctx.moveTo(origin,40);ctx.lineTo(width*(.05+i*.17),height);ctx.lineTo(width*(.15+i*.17),height);ctx.closePath();ctx.fillStyle='#fff9d46b';ctx.fill();}
      edge.strokeStyle='#f3cf8277';edge.lineWidth=2;for(const r of shapes){edge.beginPath();edge.moveTo(r.x+10,r.y-1);edge.lineTo(r.x+r.w-10,r.y-1);edge.stroke();}return;
    }
    const rain=weather==='rain',snow=weather==='snow',leaves=weather==='autumn';
    if(rain){const mist=ctx.createLinearGradient(0,0,0,height);mist.addColorStop(0,'#abc6d517');mist.addColorStop(.7,'#abc6d500');mist.addColorStop(1,'#c3e2eb28');ctx.fillStyle=mist;ctx.fillRect(0,0,width,height);}
    const limit=rain?190:snow?85:29;
    for(let i=0;i<limit;i++){
      const p=drops[i],oldY=p.y;
      p.y+=dt*(rain?520:snow?30:45)*p.speed;p.x+=dt*(rain?-37:snow?Math.sin(time+p.phase)*10:20+Math.sin(time+p.phase)*25);
      if(p.y>height+30||p.x< -40||p.x>width+40)reset(p);
      const hit=shapes.find(r=>p.x>r.x&&p.x<r.x+r.w&&oldY<r.y&&p.y>=r.y);
      if(hit){if(rain){edge.strokeStyle='#7cb9e0b3';edge.lineWidth=1;edge.beginPath();edge.moveTo(p.x-3,hit.y-2);edge.lineTo(p.x,hit.y-5);edge.lineTo(p.x+3,hit.y-2);edge.stroke();}reset(p);continue;}
      if(rain){ctx.strokeStyle='#cee8ff';ctx.globalAlpha=.25+p.speed*.2;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+1.8,p.y-12*p.speed);ctx.stroke();}
      if(snow){ctx.fillStyle='#ffffff';ctx.globalAlpha=.55+p.speed*.2;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a4b9ca66';ctx.lineWidth=.5;ctx.stroke();}
      if(leaves){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(time*.6+p.phase);ctx.fillStyle=['#b96132','#dba24b','#a94e32'][i%3];ctx.globalAlpha=.85;ctx.beginPath();ctx.ellipse(0,0,p.size*1.2,p.size*2.7,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e5be80';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(0,-p.size*2);ctx.lineTo(0,p.size*3.2);ctx.stroke();ctx.restore();}
    }
    ctx.globalAlpha=1;
    if(rain)for(const r of shapes){
      edge.strokeStyle='#9bceeeab';edge.lineWidth=3.2;edge.beginPath();
      for(let x=9;x<r.w-9;x+=3){const y=r.y-1.6-Math.sin(x*.09+time*1.6)*1.1;x===9?edge.moveTo(r.x+x,y):edge.lineTo(r.x+x,y);}edge.stroke();edge.strokeStyle='#d5f0ffb3';edge.lineWidth=.8;edge.stroke();
      for(const sign of [-1,1]){const x=sign<0?r.x-.8:r.x+r.w+.8;edge.strokeStyle='#9ed2ec66';edge.lineWidth=3;edge.beginPath();edge.moveTo(x,r.y+8);edge.lineTo(x,r.y+r.h-8);edge.stroke();for(let j=0;j<4;j++){const travel=((time*.2+j*.25)%1)*(r.h+30);edge.strokeStyle='#b3e0f9d9';edge.lineWidth=1.7;edge.beginPath();edge.moveTo(x,r.y+travel);edge.bezierCurveTo(x+sign*4,r.y+travel+8,x-sign*2,r.y+travel+15,x+sign*3,r.y+travel+30);edge.stroke();}}
      for(let i=0;i<7;i++){edge.strokeStyle='#c2e7f4cc';edge.lineWidth=1;edge.beginPath();edge.ellipse(r.x+15+(r.w-30)*i/6,r.y-2,3.5+Math.sin(time+i),1.7,0,0,Math.PI*2);edge.stroke();}
    }
    if(snow){edge.fillStyle='#f6fbff';edge.strokeStyle='#c3d5e3';edge.lineWidth=.6;for(const r of shapes){edge.beginPath();edge.moveTo(r.x+5,r.y+1);for(let x=5;x<r.w-5;x+=3)edge.lineTo(r.x+x,r.y-3-Math.sin(x*.08)*1.6-Math.sin(x*.027)*2);edge.lineTo(r.x+r.w-5,r.y+1);edge.closePath();edge.fill();edge.stroke();}}
    if(leaves)for(const r of shapes)for(let i=0;i<7;i++){edge.fillStyle=['#b96132','#dba24b','#a94e32'][i%3];edge.beginPath();edge.ellipse(r.x+r.w*(.1+i*.13),r.y-2,4,2.2,i*.5,0,Math.PI*2);edge.fill();}
  }

  update();
}
