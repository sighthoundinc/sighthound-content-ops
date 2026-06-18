function Hero() {
  const events = [
    { t:'09:42:18', plate:'7ABC123', make:'Tesla',   model:'Model 3', color:'White',  region:'CA' },
    { t:'09:42:15', plate:'4XKD891', make:'Ford',    model:'F-150',   color:'Silver', region:'NV' },
    { t:'09:42:11', plate:'8RTL204', make:'Toyota',  model:'Camry',   color:'Black',  region:'CA' },
    { t:'09:42:07', plate:'2GHM559', make:'Honda',   model:'CR-V',    color:'Blue',   region:'AZ' },
    { t:'09:42:03', plate:'9PLN710', make:'BMW',     model:'X5',      color:'Gray',   region:'CA' },
  ];
  return (
    <section className="sh-soft-mist" style={{position:'relative',overflow:'hidden',background:'#fff'}}>
      <div className="sh-pattern-detect" style={{position:'absolute',inset:0,opacity:.5,pointerEvents:'none'}}/>
      <div style={{position:'relative',maxWidth:1240,margin:'0 auto',padding:'96px 32px 120px',display:'grid',gridTemplateColumns:'1.15fr 1fr',gap:64,alignItems:'center'}}>
        <div>
          <div className="overline" style={{marginBottom:16,color:'#4f60dc'}}>Vehicle & Pedestrian Insights, Made Easy</div>
          <h1 style={{fontSize:60,lineHeight:1.05,margin:'0 0 20px',letterSpacing:'-0.015em'}}>Turning sight into <span style={{background:'linear-gradient(120deg,#4f60dc 20%,#f62470)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent'}}>insight</span>.</h1>
          <p style={{fontSize:19,color:'#4b4f73',maxWidth:560,marginBottom:32,fontWeight:400}}>Edge AI cameras and computer-vision software that turn every camera into a real-time data source — for traffic, smart cities, and enterprise.</p>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <button className="btn btn-primary">Talk to our team</button>
            <button className="btn btn-tertiary">See how it works →</button>
          </div>
          <div style={{display:'flex',gap:28,marginTop:36,paddingTop:24,borderTop:'1px solid #e4e8ef'}}>
            <div><div style={{fontSize:11,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:600}}>Accuracy</div><div style={{fontSize:22,fontWeight:500,color:'#1a1d38',fontVariantNumeric:'tabular-nums'}}>99.4%</div></div>
            <div><div style={{fontSize:11,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:600}}>Edge latency</div><div style={{fontSize:22,fontWeight:500,color:'#1a1d38',fontVariantNumeric:'tabular-nums'}}>&lt; 40 ms</div></div>
            <div><div style={{fontSize:11,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:600}}>Made in USA</div><div style={{fontSize:22,fontWeight:500,color:'#1a1d38'}}>Always</div></div>
          </div>
        </div>
        {/* Type-led "live detections" panel — composition motif, not stock imagery */}
        <div style={{position:'relative'}}>
          <div style={{background:'#fff',borderRadius:18,border:'1px solid #e4e8ef',boxShadow:'0 20px 40px rgba(26,29,56,.14)',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:'1px solid #eef1fc'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{width:8,height:8,borderRadius:999,background:'#1f9d55',boxShadow:'0 0 0 4px rgba(31,157,85,.18)'}}/>
                <div style={{fontSize:13,fontWeight:500,color:'#1a1d38'}}>Live · ALPR+ stream</div>
              </div>
              <div style={{fontSize:11,color:'#64708a',fontVariantNumeric:'tabular-nums'}}>Site 02 · Lane 3</div>
            </div>
            <div style={{padding:'10px 4px 14px'}}>
              {events.map((e,i)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'70px 1fr auto',gap:12,alignItems:'center',padding:'10px 18px',borderTop:i?'1px solid #f4f6fa':0,opacity:1 - i*0.13}}>
                  <div style={{fontSize:11,color:'#64708a',fontFamily:'SF Mono, Menlo, monospace'}}>{e.t}</div>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{display:'inline-block',padding:'2px 8px',borderRadius:6,background:'#1a1d38',color:'#fff',fontSize:11,fontWeight:600,letterSpacing:'.04em',fontFamily:'SF Mono, Menlo, monospace'}}>{e.region} · {e.plate}</span>
                    </div>
                    <div style={{fontSize:12,color:'#4b4f73',marginTop:3}}>{e.color} {e.make} {e.model}</div>
                  </div>
                  <div style={{width:8,height:8,borderRadius:999,background: i===0 ? '#4f60dc' : '#dee2f8'}}/>
                </div>
              ))}
            </div>
            <div style={{padding:'10px 18px',borderTop:'1px solid #eef1fc',display:'flex',justifyContent:'space-between',fontSize:11,color:'#64708a'}}>
              <span>Detection rate · <b style={{color:'#1a1d38',fontWeight:500}}>14.3 / min</b></span>
              <span>Confidence · <b style={{color:'#1a1d38',fontWeight:500}}>0.97 avg</b></span>
            </div>
          </div>
          {/* Floating insight tag */}
          <div style={{position:'absolute',top:-14,right:-14,padding:'8px 14px',background:'linear-gradient(135deg,#4f60dc,#f62470)',color:'#fff',borderRadius:999,fontSize:12,fontWeight:500,boxShadow:'0 10px 24px rgba(79,96,220,.35)'}}>↗ 4.2% vs yesterday</div>
        </div>
      </div>
    </section>
  );
}
window.Hero = Hero;
