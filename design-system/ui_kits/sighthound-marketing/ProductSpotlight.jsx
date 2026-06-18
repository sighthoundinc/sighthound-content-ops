function ProductSpotlight() {
  const products = [
    {
      tag:'Software · ALPR+',
      title:'Sighthound ALPR+',
      body:'License-plate recognition plus full vehicle make / model / color / generation. Read most plates worldwide.',
      img:'../../assets/white-tesla-alpr.jpg',
      cta:'Explore ALPR+',
    },
    {
      tag:'Software · Redactor',
      title:'Sighthound Redactor',
      body:'AI redaction for video, image and audio. Faces, plates and PII — gone in one pass. FOIA-ready.',
      img:'../../assets/redactor-courtroom-redacted.avif',
      cta:'Explore Redactor',
    },
    {
      tag:'Hardware · Edge Compute',
      title:'Sighthound Edge Compute',
      body:'Rugged IP67 deep-learning cameras and nodes. American IP and manufacturing. Software-defined.',
      img:'../../assets/edge-ai-hardware.png',
      cta:'Explore Edge Compute',
      contain:true,
    },
    {
      tag:'Software · Video',
      title:'Sighthound Video',
      body:'Flexible video management system — the original Sighthound product. Camera-agnostic, scriptable.',
      img:'../../assets/hero-object-tracking.jpg',
      cta:'Explore Video',
    },
  ];
  return (
    <section style={{padding:'112px 32px',background:'#eff3f7'}}>
      <div style={{maxWidth:1240,margin:'0 auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:48,flexWrap:'wrap',gap:24}}>
          <div style={{maxWidth:640}}>
            <div className="overline" style={{marginBottom:12}}>The product family</div>
            <h2 style={{fontSize:44,lineHeight:1.1,marginBottom:0}}>One brand. Four products. Software and hardware that fit together.</h2>
          </div>
          <a href="#" style={{fontSize:14,fontWeight:500,color:'#4f60dc',textDecoration:'none',whiteSpace:'nowrap'}}>Compare all →</a>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          {products.map(p => (
            <article key={p.title} style={{background:'#fff',borderRadius:18,overflow:'hidden',border:'1px solid #e4e8ef',display:'flex',flexDirection:'column'}}>
              <div style={{aspectRatio:'16/9',background: p.contain ? 'linear-gradient(180deg,#eff3f7,#fff)' : '#1a1d38',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <img src={p.img} style={{width:'100%',height:'100%',objectFit: p.contain ? 'contain' : 'cover', padding: p.contain ? '24px' : 0}}/>
              </div>
              <div style={{padding:'26px 28px 28px',display:'flex',flexDirection:'column',flex:1}}>
                <div className="overline" style={{marginBottom:10,color:'#4f60dc'}}>{p.tag}</div>
                <h3 style={{fontSize:24,fontWeight:500,color:'#1a1d38',marginBottom:10,lineHeight:1.2}}>{p.title}</h3>
                <p style={{fontSize:15,color:'#4b4f73',lineHeight:1.55,marginBottom:18,flex:1}}>{p.body}</p>
                <a href="#" style={{fontSize:14,fontWeight:500,color:'#4f60dc',textDecoration:'none'}}>{p.cta} →</a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
window.ProductSpotlight = ProductSpotlight;
