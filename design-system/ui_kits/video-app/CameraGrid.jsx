const CAMERAS = [
  { id:'c01', name:'01 · Loading Bay',     src:'../../assets/hero-vehicle-detection.jpg', status:'rec',    bbox:[{x:38,y:48,w:26,h:34,label:'VEHICLE · 96%',c:'#4f60dc'}] },
  { id:'c02', name:'02 · Entry Gate',      src:'../../assets/white-tesla-alpr.jpg',       status:'rec',    bbox:[{x:30,y:38,w:42,h:36,label:'VEHICLE · 98%',c:'#4f60dc'},{x:46,y:62,w:18,h:6,label:'PLATE',c:'#f99f25'}] },
  { id:'c03', name:'03 · South Entrance',  src:'../../assets/redactor-crosswalk.avif',     status:'motion', bbox:[{x:42,y:50,w:8,h:24,label:'PERSON · 91%',c:'#f99f25'}] },
  { id:'c04', name:'04 · North Yard',      src:'../../assets/redactor-cars-tolls.avif',    status:'rec',    bbox:[] },
  { id:'c05', name:'05 · Perimeter West',  src:'../../assets/redactor-traffic.avif',       status:'rec',    bbox:[] },
  { id:'c06', name:'06 · Warehouse Floor', src:'../../assets/hero-object-tracking.jpg',    status:'rec',    bbox:[{x:34,y:42,w:20,h:42,label:'PERSON · 94%',c:'#4f60dc'}] },
];
window.VIDEO_CAMERAS = CAMERAS;

function CameraTile({ cam, active, onSelect, t }) {
  const statusMap = {
    rec:    { l:'REC',    fg:'#fff',     bg:'#f62470', dot:'#f62470' },
    motion: { l:'MOTION', fg:'#1a1d38',  bg:'#f99f25', dot:'#f99f25' },
    offline:{ l:'OFFLINE',fg:'#1a1d38',  bg:'#d9dfe6', dot:'#9aa3b2' },
  };
  const s = statusMap[cam.status];
  return (
    <button onClick={()=>onSelect(cam.id)} style={{position:'relative',background:'#1a1d38',borderRadius:12,overflow:'hidden',cursor:'pointer',padding:0,border:'2px solid '+(active?'#4f60dc':'transparent'),boxShadow:active?'0 0 0 4px rgba(79,96,220,.18)':'none',aspectRatio:'16/9'}}>
      {cam.src ? <img src={cam.src} style={{width:'100%',height:'100%',objectFit:'cover',opacity:.94}}/> : <div className="sh-pattern-scan" style={{width:'100%',height:'100%',background:'#1a1d38'}}/>}
      {/* Detection bboxes (drawn) */}
      {cam.bbox && cam.bbox.length>0 && (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
          {cam.bbox.map((b,i)=>(
            <g key={i}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke={b.c} strokeWidth="0.4" vectorEffect="non-scaling-stroke"/>
            </g>
          ))}
        </svg>
      )}
      {cam.bbox && cam.bbox.length>0 && (
        <div style={{position:'absolute',inset:0,pointerEvents:'none'}}>
          {cam.bbox.map((b,i)=>(
            <div key={i} style={{position:'absolute',left:b.x+'%',top:(b.y-4)+'%',padding:'1px 5px',background:b.c,color:b.c==='#f99f25'?'#1a1d38':'#fff',fontSize:8,fontWeight:600,fontFamily:'SF Mono, Menlo, monospace',letterSpacing:'.04em',borderRadius:2}}>{b.label}</div>
          ))}
        </div>
      )}
      {/* Top-left camera label */}
      <div style={{position:'absolute',top:8,left:8,padding:'3px 8px',background:'rgba(26,29,56,.72)',color:'#fff',fontSize:11,fontWeight:500,borderRadius:6,backdropFilter:'blur(4px)'}}>{cam.name}</div>
      {/* Top-right status */}
      <div style={{position:'absolute',top:8,right:8,display:'flex',alignItems:'center',gap:6,padding:'3px 8px',background:s.bg,color:s.fg,fontSize:10,fontWeight:600,borderRadius:6,letterSpacing:'.06em'}}>
        <span style={{width:6,height:6,borderRadius:999,background:s.dot,boxShadow:`0 0 0 3px ${s.dot}33`,animation:cam.status==='rec'?'pulse 1.6s infinite':'none'}}/>
        {s.l}
      </div>
      {/* Bottom: burned-in timestamp + simulated frame number */}
      <div style={{position:'absolute',bottom:8,left:8,right:8,display:'flex',justifyContent:'space-between',color:'#fff',fontFamily:'SF Mono, Menlo, monospace',fontSize:10,textShadow:'0 1px 2px rgba(0,0,0,.6)'}}>
        <span>{t}</span>
        <span style={{opacity:.7}}>F#{(cam.id.replace('c','')*10000 + 2914)|0}</span>
      </div>
    </button>
  );
}

function CameraGrid({ activeId, onSelect }) {
  return (
    <div style={{flex:1,padding:'14px 18px 0',minHeight:0,overflow:'auto'}}>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .4 } }`}</style>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {CAMERAS.map(c => <CameraTile key={c.id} cam={c} active={c.id===activeId} onSelect={onSelect} t="14:32:18"/>)}
      </div>
    </div>
  );
}

window.VideoCameraGrid = CameraGrid;
