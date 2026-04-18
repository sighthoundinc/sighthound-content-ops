function Hero() {
  return (
    <section style={{position:'relative',overflow:'hidden',background:'#fff'}}>
      {/* wave backdrop */}
      <svg viewBox="0 0 1440 520" preserveAspectRatio="none" style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:.9}}>
        <defs>
          <linearGradient id="hb1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#eef1fc"/>
            <stop offset="100%" stopColor="#ffffff"/>
          </linearGradient>
          <linearGradient id="hb2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4f60dc" stopOpacity=".08"/>
            <stop offset="60%" stopColor="#f99f25" stopOpacity=".07"/>
            <stop offset="100%" stopColor="#f62470" stopOpacity=".10"/>
          </linearGradient>
        </defs>
        <rect width="1440" height="520" fill="url(#hb1)"/>
        <path d="M0,330 C240,240 480,410 760,320 C1000,240 1240,380 1440,310 L1440,520 L0,520 Z" fill="url(#hb2)"/>
      </svg>
      <div style={{position:'relative',maxWidth:1240,margin:'0 auto',padding:'96px 32px 120px',display:'grid',gridTemplateColumns:'1.1fr 1fr',gap:64,alignItems:'center'}}>
        <div>
          <div className="overline" style={{marginBottom:16}}>Vehicle & Pedestrian Insights, Made Easy</div>
          <h1 style={{fontSize:56,lineHeight:1.1,margin:'0 0 20px'}}>We solve complex edge & visual AI problems at scale.</h1>
          <p style={{fontSize:18,color:'#4b4f73',maxWidth:560,marginBottom:28}}>Sighthound's AI-powered video solutions unlock the power of your data — resulting in valuable user insights, reduced operational cost, and increased revenue.</p>
          <div style={{display:'flex',gap:12}}>
            <button className="btn btn-primary">Talk to our team</button>
            <button className="btn btn-tertiary">Watch demo →</button>
          </div>
        </div>
        <div style={{position:'relative',borderRadius:20,overflow:'hidden',boxShadow:'0 20px 40px rgba(26,29,56,.14)',aspectRatio:'4/3'}}>
          <img src="../../assets/white-tesla-alpr.jpg" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          <div style={{position:'absolute',left:20,bottom:20,padding:'10px 14px',background:'rgba(26,29,56,.85)',color:'#fff',borderRadius:10,fontSize:12,fontFamily:'Lexend'}}>
            <div style={{fontWeight:600,fontSize:11,letterSpacing:'.08em',textTransform:'uppercase',color:'#8792e8',marginBottom:4}}>ALPR+</div>
            Tesla Model 3 · White · CA 7ABC123
          </div>
        </div>
      </div>
    </section>
  );
}
window.Hero = Hero;
