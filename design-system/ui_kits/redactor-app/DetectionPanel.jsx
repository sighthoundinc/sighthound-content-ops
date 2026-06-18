function DetectionPanel({ detections, onToggle }) {
  const colorFor = t => t==='face'?'#f62470':t==='plate'?'#f99f25':t==='audio'?'#4f60dc':'#64708a';
  // Detections over time (per 10s bucket)
  const buckets = [3,5,4,7,6,9,11,8,12,10,14,11,9,7,5,4];
  const maxB = Math.max(...buckets);
  return (
    <aside style={{width:320,background:'#fff',borderLeft:'1px solid #e4e8ef',padding:0,overflow:'auto',display:'flex',flexDirection:'column',fontFamily:'Lexend'}}>
      <div style={{padding:'18px 18px 14px',borderBottom:'1px solid #eef1fc'}}>
        <div style={{fontSize:11,fontWeight:600,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>Auto-detected</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {[['Faces',12,'#f62470'],['Plates',4,'#f99f25'],['People',7,'#4f60dc'],['Screens',1,'#1a1d38']].map(([l,n,c])=>(
            <div key={l} style={{padding:10,background:'#f6f8fb',borderRadius:10}}>
              <div style={{fontSize:22,fontWeight:500,color:c,fontFamily:'Lexend',fontVariantNumeric:'tabular-nums',lineHeight:1}}>{n}</div>
              <div style={{fontSize:11,color:'#64708a',marginTop:4}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution sparkline */}
      <div style={{padding:'14px 18px',borderBottom:'1px solid #eef1fc'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:600,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em'}}>Detections over time</div>
          <div style={{fontSize:11,color:'#64708a'}}>per 10 s</div>
        </div>
        <div style={{display:'flex',alignItems:'flex-end',gap:3,height:48}}>
          {buckets.map((b,i)=>(
            <div key={i} style={{flex:1,height:(b/maxB*100)+'%',background:i===7?'#4f60dc':'#dee2f8',borderRadius:2,minHeight:2}}/>
          ))}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#9aa3b2',marginTop:4,fontVariantNumeric:'tabular-nums'}}>
          <span>00:00</span><span>02:14</span>
        </div>
      </div>

      <div style={{padding:'14px 18px 14px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:600,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em'}}>Detections</div>
          <a href="#" style={{fontSize:11,fontWeight:500}}>Invert</a>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {detections.map((d,i)=>(
            <label key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',border:'1px solid #e4e8ef',borderRadius:8,cursor:'pointer'}}>
              <input type="checkbox" checked={d.on} onChange={()=>onToggle?.(i)} style={{accentColor:'#4f60dc'}}/>
              <span style={{width:8,height:8,borderRadius:999,background:colorFor(d.type)}}/>
              <span style={{fontSize:13,color:'#1a1d38',textTransform:'capitalize',fontFamily:'Lexend'}}>{d.type} #{String(i+1).padStart(2,'0')}</span>
              <span style={{marginLeft:'auto',fontSize:11,color:'#64708a',fontFamily:'SF Mono, Menlo, monospace',fontVariantNumeric:'tabular-nums'}}>{d.t}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{marginTop:'auto',padding:'14px 18px 18px'}}>
        <div className="sh-pattern-topo" style={{padding:14,background:'#eef1fc',borderRadius:12,position:'relative',overflow:'hidden'}}>
          <div style={{position:'relative'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2e3ba4" strokeWidth="1.75"><path d="M12 2L3 7v6c0 5 4 9 9 10 5-1 9-5 9-10V7l-9-5z"/></svg>
              <div style={{fontSize:12,fontWeight:500,color:'#2e3ba4'}}>CJIS · FOIA · GDPR-ready</div>
            </div>
            <div style={{fontSize:12,color:'#4b4f73',lineHeight:1.5}}>Media never leaves your environment. Chain of custody preserved.</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
window.DetectionPanel = DetectionPanel;
