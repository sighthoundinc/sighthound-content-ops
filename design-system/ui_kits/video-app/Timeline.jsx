function Timeline() {
  // 4-hour scale, motion bands per camera. Each band: array of [startPct, widthPct, type]
  const cams = [
    { id:'01', bands:[[3,8,'m'], [22,4,'v'], [42,12,'m'], [78,3,'v']] },
    { id:'02', bands:[[10,3,'p'], [38,5,'p'], [60,6,'p'], [85,4,'p']] },
    { id:'03', bands:[[0,11,'m'], [18,7,'m'], [50,10,'m'], [70,15,'m'], [92,6,'m']] },
    { id:'04', bands:[[28,3,'v'], [56,2,'v'], [80,4,'v']] },
    { id:'05', bands:[[12,2,'m'], [44,3,'m'], [76,3,'m']] },
    { id:'06', bands:[[5,10,'m'], [30,6,'m'], [58,8,'m'], [88,4,'m']] },
  ];
  const colorFor = t => t==='v'?'#4f60dc':t==='p'?'#f99f25':'#8792e8';
  const hours = ['11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30'];
  return (
    <section style={{padding:'12px 18px 16px',background:'#fff',borderTop:'1px solid #e4e8ef'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:8}}>
        <div style={{fontSize:11,fontWeight:600,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em'}}>Timeline · past 4 h</div>
        <div style={{display:'flex',gap:14,fontSize:11,color:'#4b4f73'}}>
          <span style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:8,height:8,borderRadius:2,background:'#8792e8'}}/>Motion</span>
          <span style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:8,height:8,borderRadius:2,background:'#4f60dc'}}/>Vehicle</span>
          <span style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:8,height:8,borderRadius:2,background:'#f99f25'}}/>Plate</span>
        </div>
      </div>
      <div style={{position:'relative',paddingLeft:24}}>
        {/* Now indicator */}
        <div style={{position:'absolute',top:0,bottom:18,right:0,width:2,background:'#4f60dc',zIndex:2}}>
          <div style={{position:'absolute',top:-4,right:-5,width:12,height:12,borderRadius:999,background:'#4f60dc',boxShadow:'0 0 0 4px rgba(79,96,220,.2)'}}/>
        </div>
        {cams.map(c => (
          <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <div style={{position:'absolute',left:0,fontSize:10,color:'#64708a',fontFamily:'SF Mono, Menlo, monospace',width:20,textAlign:'right'}}>{c.id}</div>
            <div style={{flex:1,height:10,background:'#f6f8fb',borderRadius:3,position:'relative'}}>
              {c.bands.map((b,i)=>(
                <div key={i} style={{position:'absolute',left:b[0]+'%',width:b[1]+'%',top:0,bottom:0,background:colorFor(b[2]),borderRadius:2}}/>
              ))}
            </div>
          </div>
        ))}
        <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:9,color:'#9aa3b2',fontFamily:'SF Mono, Menlo, monospace',fontVariantNumeric:'tabular-nums'}}>
          {hours.map(h => <span key={h}>{h}</span>)}
        </div>
      </div>
    </section>
  );
}
window.VideoTimeline = Timeline;
