// Vertical story intro: tap the left side (or swipe left) for the next screen, right side to go back.
(function(){
  const LS={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  const slides=[...document.querySelectorAll('.s')];
  const bars=document.getElementById('bars');
  slides.forEach(()=>{const i=document.createElement('i');i.appendChild(document.createElement('b'));bars.appendChild(i);});
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cur=-1;
  function show(n){
    n=Math.max(0,Math.min(slides.length-1,n));if(n===cur)return;
    slides.forEach((s,i)=>s.classList.toggle('on',i===n));
    [...bars.children].forEach((b,i)=>b.classList.toggle('on',i<=n));
    cur=n;
    document.getElementById('hint').style.opacity=n===0?'':'0';
    const fx=slides[n].dataset.fx;
    if(fx==='hearts')rain(1800);
    if(fx==='dedication')rain(1600);
    try{navigator.vibrate&&navigator.vibrate(6)}catch(e){}
  }
  function finish(){
    LS.set('ns:introSeen',Date.now());
    const k=LS.get('ns:room'),p=LS.get('ns:me');
    location.replace(k&&p?`/?k=${encodeURIComponent(k)}&p=${encodeURIComponent(p)}`:'/');
  }
  document.getElementById('go').addEventListener('click',e=>{e.stopPropagation();finish();});
  document.getElementById('skip').addEventListener('click',e=>{e.stopPropagation();finish();});
  let sx=0,sy=0,moved=false;
  addEventListener('pointerdown',e=>{sx=e.clientX;sy=e.clientY;moved=false;});
  addEventListener('pointerup',e=>{
    if(e.target.closest('button'))return;
    const dx=e.clientX-sx,dy=e.clientY-sy;
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)){show(cur+(dx<0?1:-1));return;}
    if(Math.abs(dx)>12||Math.abs(dy)>12)return;
    if(slides[cur].scrollTop>0&&false)return;
    show(cur+(e.clientX<innerWidth*0.62?1:-1));
  });
  addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key===' ')show(cur+1);if(e.key==='ArrowRight')show(cur-1);});

  // soft falling hearts and stars
  const cv=document.getElementById('fx'),cx=cv.getContext('2d');let ps=[],raf=0,dpr=1;
  function size(){dpr=Math.min(2,devicePixelRatio||1);cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;}
  size();addEventListener('resize',size);
  function rain(ms){if(reduce)return;const end=performance.now()+ms;const cols=['#FF5C8A','#F7C653','#B095FF','#3FD6C6','#FFD1DE'];
    (function tick(){for(let i=0;i<2;i++)ps.push({x:Math.random()*innerWidth,y:-20,vx:(Math.random()-.5)*1.2,vy:1.2+Math.random()*1.8,r:7+Math.random()*9,rot:Math.random()*6,vr:(Math.random()-.5)*.06,k:Math.random()<.7?'h':'s',c:cols[Math.floor(Math.random()*cols.length)],a:.55+Math.random()*.4});
      if(!raf)loop();if(performance.now()<end)setTimeout(tick,90);})();}
  function shape(p){const r=p.r;cx.beginPath();
    if(p.k==='h'){cx.moveTo(0,r*.35);cx.bezierCurveTo(-r*1.1,-r*.4,-r*.45,-r*1.1,0,-r*.45);cx.bezierCurveTo(r*.45,-r*1.1,r*1.1,-r*.4,0,r*.35);}
    else{for(let i=0;i<10;i++){const rr=i%2?r*.42:r,a=i*Math.PI/5-Math.PI/2;cx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}}
    cx.closePath();cx.fill();}
  function loop(){cx.setTransform(1,0,0,1,0,0);cx.clearRect(0,0,cv.width,cv.height);
    ps=ps.filter(p=>p.y<innerHeight+30);
    for(const p of ps){p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;cx.setTransform(dpr,0,0,dpr,p.x*dpr,p.y*dpr);cx.rotate(p.rot);cx.globalAlpha=p.a;cx.fillStyle=p.c;shape(p);}
    cx.globalAlpha=1;raf=ps.length?requestAnimationFrame(loop):0;}
  show(0);
})();
