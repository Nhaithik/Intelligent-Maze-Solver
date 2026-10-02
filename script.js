const R=17,C=25;
let wall,start,goal,mode='wall',busy=false,drawing=false,timers=[];
const el=document.getElementById('maze'),$=id=>document.getElementById(id);
el.style.gridTemplateColumns=`repeat(${C},auto)`;
const cells=[];
for(let i=0;i<R*C;i++){const d=document.createElement('div');d.className='cell';d.dataset.i=i;el.appendChild(d);cells.push(d)}
const idx=(r,c)=>r*C+c;
function reset(){wall=new Array(R*C).fill(false);start=idx(0,0);goal=idx(R-1,C-1);render()}
function render(){cells.forEach((d,i)=>{d.className='cell'+(wall[i]?' w':'')+(i===start?' s':'')+(i===goal?' g':'')})}
function clearViz(){timers.forEach(clearTimeout);timers=[];busy=false;$('solve').disabled=$('cmpBtn').disabled=false;render()}
function setMode(m,id){mode=m;['mWall','mStart','mGoal'].forEach(b=>$(b).classList.remove('act'));$(id).classList.add('act')}
$('mWall').onclick=()=>setMode('wall','mWall');$('mStart').onclick=()=>setMode('start','mStart');$('mGoal').onclick=()=>setMode('goal','mGoal');
function edit(i){
  if(busy)return;
  if(mode==='start'&&i!==goal&&!wall[i])start=i;
  else if(mode==='goal'&&i!==start&&!wall[i])goal=i;
  else if(mode==='wall'&&i!==start&&i!==goal)wall[i]=drawing==='erase'?false:true;
  render();
}
el.addEventListener('pointerdown',e=>{const i=+e.target.dataset.i;if(isNaN(i))return;clearViz();drawing=(mode==='wall'&&wall[i])?'erase':'draw';edit(i);if(mode!=='wall')drawing=false});
el.addEventListener('pointerover',e=>{if(drawing&&mode==='wall'){const i=+e.target.dataset.i;if(!isNaN(i))edit(i)}});
addEventListener('pointerup',()=>drawing=false);
$('gen').onclick=()=>{clearViz();wall=wall.map((_,i)=>i!==start&&i!==goal&&Math.random()<0.28);render()};
$('clr').onclick=()=>{clearViz();wall.fill(false);render()};
$('rst').onclick=()=>{clearViz();reset()};

function nbrs(i){const r=Math.floor(i/C),c=i%C,o=[];
  if(r>0)o.push(i-C);if(c<C-1)o.push(i+1);if(r<R-1)o.push(i+C);if(c>0)o.push(i-1);
  return o.filter(n=>!wall[n])}
const h=i=>Math.abs(Math.floor(i/C)-Math.floor(goal/C))+Math.abs(i%C-goal%C);

function search(type){
  const t0=performance.now(),prev={},seen=new Set([start]),order=[],g={[start]:0};
  let open=[start],found=false;
  while(open.length){
    let cur;
    if(type==='bfs')cur=open.shift();
    else if(type==='dfs')cur=open.pop();
    else{let b=0;const f=n=>type==='astar'?g[n]+h(n):h(n);
      for(let k=1;k<open.length;k++)if(f(open[k])<f(open[b]))b=k;
      cur=open.splice(b,1)[0]}
    if(type==='dfs'){if(order.includes(cur))continue}
    order.push(cur);
    if(cur===goal){found=true;break}
    const ns=nbrs(cur);
    if(type==='dfs')ns.reverse();
    for(const n of ns){
      if(type==='dfs'){if(!order.includes(n)){prev[n]=cur;g[n]=g[cur]+1;open.push(n)}}
      else if(!seen.has(n)){seen.add(n);prev[n]=cur;g[n]=g[cur]+1;open.push(n)}
    }
  }
  const path=[];
  if(found){for(let n=goal;n!==undefined;n=prev[n])path.push(n);path.reverse()}
  return{order,path,found,nodes:order.length,len:found?path.length-1:0,time:performance.now()-t0}
}
const NAMES={bfs:'BFS',dfs:'DFS',astar:'A* Search',greedy:'Greedy Best-First'};
function showResult(type,r){
  $('rA').textContent=NAMES[type];
  $('rF').textContent=r.found?'Yes':'No';$('rF').style.color=r.found?'var(--green)':'#d32f2f';
  $('rN').textContent=r.nodes;$('rL').textContent=r.found?r.len:'—';$('rT').textContent=r.time.toFixed(2)+' ms';
}
$('solve').onclick=()=>{
  clearViz();
  const type=$('algo').value,r=search(type),sp=+$('speed').value;
  busy=true;$('solve').disabled=$('cmpBtn').disabled=true;
  const mark=(i,cls)=>{if(i!==start&&i!==goal)cells[i].classList.add(cls)};
  const done=()=>{busy=false;$('solve').disabled=$('cmpBtn').disabled=false;showResult(type,r);
    if(!r.found)alert('No path exists between start and goal. Try removing some walls.')};
  if(sp===0){r.order.forEach(i=>mark(i,'e'));r.path.forEach(i=>mark(i,'p'));done();return}
  r.order.forEach((i,k)=>timers.push(setTimeout(()=>mark(i,'e'),k*sp)));
  const base=r.order.length*sp;
  r.path.forEach((i,k)=>timers.push(setTimeout(()=>{cells[i].classList.remove('e');mark(i,'p')},base+k*Math.max(sp,15))));
  timers.push(setTimeout(done,base+r.path.length*Math.max(sp,15)+50));
};

const COL={bfs:'#2f6fed',dfs:'#2e9e4f',astar:'#e8851c',greedy:'#6d3fd6'};
$('cmpBtn').onclick=()=>{
  clearViz();
  const res=['bfs','dfs','astar','greedy'].map(t=>({t,...search(t)}));
  $('cmpBody').innerHTML=res.map(r=>`<tr><td>${NAMES[r.t]}</td><td class="${r.found?'yes':'no'}">${r.found?'Yes':'No'}</td><td>${r.nodes}</td><td>${r.found?r.len:'—'}</td><td>${r.time.toFixed(2)} ms</td></tr>`).join('');
  const defs=[['Nodes Explored','nodes',0],['Path Length','len',0],['Execution Time (ms)','time',2]];
  $('charts').innerHTML=defs.map(([title,key,dp])=>{
    const max=Math.max(...res.map(r=>r[key]),0.0001);
    return `<div class="chart"><h4>${title}</h4><div class="bars">`+res.map(r=>
      `<div class="bar"><div style="height:${Math.max(r[key]/max*100,2)}%;background:${COL[r.t]}"></div><span>${r[key].toFixed(dp)}</span><span>${r.t==='astar'?'A*':r.t==='greedy'?'Greedy':r.t.toUpperCase()}</span></div>`).join('')+`</div></div>`}).join('');
  $('comparison').scrollIntoView({behavior:'smooth'});
};

const links=[...document.querySelectorAll('nav a')];
addEventListener('scroll',()=>{let cur='home';['home','solver','algorithms','comparison','about'].forEach(id=>{if($(id).getBoundingClientRect().top<150)cur=id});
  links.forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+cur))});
reset();$('gen').click();
