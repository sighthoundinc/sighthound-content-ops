function Capabilities() {
  const cards = [
    { img:'../../assets/hero-vehicle-detection.jpg', title:'Vehicle Detection & Recognition', tag:'Sighthound ALPR+', body:'Detect vehicles from static or moving cameras and return make, model, color and generation for vehicles sold from 1991 onwards.' },
    { img:'../../assets/hero-object-tracking.jpg', title:'Object Detection & Tracking', tag:'Sighthound ALPR+', body:'Distinguish between vehicles, trucks, buses, motorbikes, people, bicycles and license plates — then track them across frames.' },
    { img:'../../assets/hero-redaction.png', title:'Redaction', tag:'Sighthound Redactor', body:'Remove personally identifiable information automatically from video feeds or files. Finds faces and plates; allows other data to be edited manually.' },
    { img:'../../assets/hero-lpr.jpg', title:'License Plate Recognition', tag:'Sighthound ALPR+', body:'Read plates from most countries in the world, reporting the alphanumeric characters and region for US, Canada, and major EU countries.' },
    { img:'../../assets/edge-ai-hardware.png', title:'Powerful Edge AI Hardware', tag:'Sighthound Hardware', body:'Deep neural network devices deliver the highest accuracy and lowest latency at the edge. No need for clunky servers in data cabinets.' },
  ];
  return (
    <section style={{padding:'96px 32px',background:'#eff3f7'}}>
      <div style={{maxWidth:1240,margin:'0 auto'}}>
        <div className="overline" style={{marginBottom:8}}>Capabilities</div>
        <h2 style={{fontSize:40,maxWidth:760,marginBottom:48}}>State-of-the-art deep learning from Sighthound's own computer vision research lab.</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:20}}>
          {cards.map(c => (
            <article key={c.title} style={{background:'#fff',borderRadius:16,overflow:'hidden',border:'1px solid #e4e8ef',boxShadow:'0 2px 6px rgba(26,29,56,.06)',display:'flex',flexDirection:'column'}}>
              <div style={{height:160,background:'#1a1d38'}}>
                <img src={c.img} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              </div>
              <div style={{padding:'22px 24px',flex:1,display:'flex',flexDirection:'column'}}>
                <h3 style={{fontSize:20,fontWeight:500,marginBottom:10,lineHeight:1.25}}>{c.title}</h3>
                <p style={{fontSize:14,color:'#4b4f73',flex:1,marginBottom:16}}>{c.body}</p>
                <a href="#" style={{fontSize:13,fontWeight:500,color:'#4f60dc',textDecoration:'none'}}>{c.tag} →</a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
window.Capabilities = Capabilities;
