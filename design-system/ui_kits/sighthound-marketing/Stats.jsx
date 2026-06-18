function Stats() {
  const kpis = [
    { l:'Deployments',     v:'2,800+', s:'in 47 countries' },
    { l:'Cameras online',  v:'190K',   s:'streaming today' },
    { l:'Plates / second', v:'160',    s:'on a single GPU' },
    { l:'Latency',         v:'< 40 ms', s:'at the edge' },
  ];
  const spark = [40,32,38,22,28,18,24,14,20,12,16,8,12,10];
  return (
    <section style={{padding:'112px 32px',background:'#1a1d38',color:'#fff',position:'relative',overflow:'hidden'}}>
      <div className="sh-pattern-scan" style={{position:'absolute',inset:0,opacity:.6,pointerEvents:'none'}}/>
      <div style={{position:'relative',maxWidth:1240,margin:'0 auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:80,alignItems:'center',marginBottom:56}}>
          <div>
            <div className="overline" style={{marginBottom:12,color:'#8792e8'}}>By the numbers</div>
            <h2 style={{fontSize:44,lineHeight:1.1,color:'#fff',margin:0}}>The world's busiest roads, made legible in real time.</h2>
          </div>
          <p style={{fontSize:16,color:'#dee2f8',lineHeight:1.6,fontWeight:400}}>Sighthound is deployed by government agencies, fleet operators and Fortune-500 enterprises. The numbers below are not aspirational — they're current as of this quarter.</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:20,marginBottom:32}}>
          {kpis.map(k => (
            <div key={k.l} style={{padding:'24px 22px',background:'rgba(255,255,255,.04)',border:'1px solid rgba(135,146,232,.18)',borderRadius:14}}>
              <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.08em',color:'#8792e8',marginBottom:10}}>{k.l}</div>
              <div style={{fontSize:36,fontWeight:500,color:'#fff',fontVariantNumeric:'tabular-nums',lineHeight:1,marginBottom:6}}>{k.v}</div>
              <div style={{fontSize:13,color:'#dee2f8'}}>{k.s}</div>
            </div>
          ))}
        </div>
        <div style={{padding:'22px 26px',background:'rgba(255,255,255,.04)',border:'1px solid rgba(135,146,232,.18)',borderRadius:14,display:'grid',gridTemplateColumns:'1fr 2fr',gap:32,alignItems:'center'}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.08em',color:'#8792e8',marginBottom:8}}>Detections · last 24 h</div>
            <div style={{fontSize:28,fontWeight:500,color:'#fff',fontVariantNumeric:'tabular-nums'}}>12.4M</div>
            <div style={{fontSize:12,color:'#1f9d55',marginTop:4}}>↑ 4.2% vs yesterday</div>
          </div>
          <svg viewBox="0 0 600 70" width="100%" height="70" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f60dc" stopOpacity=".5"/>
                <stop offset="100%" stopColor="#4f60dc" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <polyline fill="none" stroke="#4f60dc" strokeWidth="2.2" points={spark.map((y,i)=>`${i*(600/(spark.length-1))},${y+8}`).join(' ')}/>
            <polyline fill="url(#sg)" stroke="none" points={spark.map((y,i)=>`${i*(600/(spark.length-1))},${y+8}`).join(' ') + ` 600,70 0,70`}/>
          </svg>
        </div>
      </div>
    </section>
  );
}
window.Stats = Stats;
