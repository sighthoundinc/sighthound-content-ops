function DetectionPanel({ detections, onToggle }) {
  const colorFor = t => t==='face'?'#f62470':t==='plate'?'#f99f25':t==='audio'?'#4f60dc':'#64708a';
  return (
    <aside style={{width:300,background:'#fff',borderLeft:'1px solid #e4e8ef',padding:18,overflow:'auto',display:'flex',flexDirection:'column',gap:18}}>
      <div>
        <div className="overline" style={{marginBottom:10}}>Auto-detected</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {[['Faces',12,'#f62470'],['Plates',4,'#f99f25'],['People',7,'#4f60dc'],['Screens',1,'#1a1d38']].map(([l,n,c])=>(
            <div key={l} style={{padding:10,background:'#f6f8fb',borderRadius:10}}>
              <div style={{fontSize:20,fontWeight:500,color:c,fontFamily:'Lexend'}}>{n}</div>
              <div style={{fontSize:11,color:'#64708a'}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:8}}>
          <div className="overline">Detections</div>
          <a href="#" style={{fontSize:11,fontWeight:500}}>Invert selection</a>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {detections.map((d,i)=>(
            <label key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',border:'1px solid #e4e8ef',borderRadius:8,cursor:'pointer'}}>
              <input type="checkbox" checked={d.on} onChange={()=>onToggle?.(i)} style={{accentColor:'#4f60dc'}}/>
              <span style={{width:8,height:8,borderRadius:999,background:colorFor(d.type)}}/>
              <span style={{fontSize:13,color:'#1a1d38',textTransform:'capitalize',fontFamily:'Lexend'}}>{d.type} #{String(i+1).padStart(2,'0')}</span>
              <span style={{marginLeft:'auto',fontSize:11,color:'#64708a'}}>{d.t}</span>
            </label>
          ))}
        </div>
      </div>
      <div style={{marginTop:'auto',padding:14,background:'#eef1fc',borderRadius:12}}>
        <div style={{fontSize:12,fontWeight:500,color:'#2e3ba4',marginBottom:4}}>CJIS compliance</div>
        <div style={{fontSize:12,color:'#4b4f73',lineHeight:1.5}}>Media never leaves your environment. Chain of custody preserved.</div>
      </div>
    </aside>
  );
}
window.DetectionPanel = DetectionPanel;
