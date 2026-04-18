function VideoCanvas({ src, detections, playing, onTogglePlay, time, duration }) {
  return (
    <div style={{flex:1,padding:20,display:'flex',flexDirection:'column',minWidth:0,minHeight:0}}>
      <div style={{flex:1,background:'#1a1d38',borderRadius:14,position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 20px rgba(26,29,56,.10)'}}>
        <img src={src} style={{width:'100%',height:'100%',objectFit:'cover',opacity:.92}}/>
        {/* Detection overlays */}
        {detections.map((d,i)=>(
          <div key={i} style={{position:'absolute',left:d.x+'%',top:d.y+'%',width:d.w+'%',height:d.h+'%',border:'2px solid '+(d.type==='face'?'#f62470':d.type==='plate'?'#f99f25':'#4f60dc'),borderRadius:6,background:'rgba(26,29,56,.55)',backdropFilter:'blur(8px)',pointerEvents:'none'}}>
            <div style={{position:'absolute',top:-20,left:-2,padding:'2px 8px',background:d.type==='face'?'#f62470':d.type==='plate'?'#f99f25':'#4f60dc',color:'#fff',fontSize:10,borderRadius:4,fontWeight:500,fontFamily:'Lexend',textTransform:'uppercase',letterSpacing:'.06em'}}>{d.type} · {d.conf}%</div>
          </div>
        ))}
        <div style={{position:'absolute',top:14,left:14,padding:'6px 12px',background:'rgba(26,29,56,.7)',color:'#fff',borderRadius:999,fontSize:11,fontFamily:'Lexend',fontWeight:500,display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:6,height:6,borderRadius:999,background:'#f62470'}}/> REC · Bodycam 04
        </div>
      </div>
      <div style={{marginTop:14,display:'flex',alignItems:'center',gap:14,padding:'10px 14px',background:'#fff',border:'1px solid #e4e8ef',borderRadius:12}}>
        <button onClick={onTogglePlay} style={{width:40,height:40,borderRadius:999,background:'#4f60dc',color:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {playing ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
                   : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l14 8-14 8z"/></svg>}
        </button>
        <div style={{fontSize:12,color:'#4b4f73',fontVariantNumeric:'tabular-nums',fontFamily:'Lexend',fontWeight:500}}>{time} / {duration}</div>
        <div style={{flex:1,height:6,background:'#eff3f7',borderRadius:999,position:'relative'}}>
          <div style={{position:'absolute',inset:'0 60% 0 0',background:'linear-gradient(90deg,#4f60dc,#f62470)',borderRadius:999}}/>
          <div style={{position:'absolute',left:'40%',top:-4,width:14,height:14,borderRadius:999,background:'#fff',border:'2px solid #4f60dc',boxShadow:'0 2px 6px rgba(26,29,56,.2)'}}/>
        </div>
        <div style={{fontSize:11,color:'#64708a'}}>1.0×</div>
      </div>
    </div>
  );
}
window.VideoCanvas = VideoCanvas;
