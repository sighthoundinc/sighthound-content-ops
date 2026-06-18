function Capabilities() {
  const cards = [
    { i:'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z M12 9a3 3 0 100 6 3 3 0 000-6z', title:'Real-time detection', body:'Vehicles, plates, people and objects in under 40 ms — at the edge, on the device, where the data is born.' },
    { i:'M3 4h18M3 9h18M3 14h12M3 19h8', title:'Structured events', body:'Every detection emits make, model, color, generation, region, lane and confidence. Ready for your stack.' },
    { i:'M12 2L3 7v6c0 5 4 9 9 10 5-1 9-5 9-10V7l-9-5z M9 12l2 2 4-4', title:'Privacy by design', body:'Data stays in your environment. CJIS, FOIA, GDPR-aligned. Faces and plates can be redacted on capture.' },
    { i:'M3 12h6m6 0h6 M12 3v6m0 6v6 M5 5l3 3m8 8l3 3 M19 5l-3 3m-8 8l-3 3', title:'Open & integrated', body:'REST, MQTT, webhooks, RTSP. Drop into existing VMS, ITS, parking and access systems.' },
  ];
  return (
    <section style={{padding:'112px 32px',background:'#fff'}}>
      <div style={{maxWidth:1240,margin:'0 auto'}}>
        <div style={{maxWidth:780,marginBottom:56}}>
          <div className="overline" style={{marginBottom:12}}>Capabilities</div>
          <h2 style={{fontSize:44,lineHeight:1.1,marginBottom:18}}>State-of-the-art computer vision, shaped for production.</h2>
          <p style={{fontSize:17,color:'#4b4f73',maxWidth:620,fontWeight:400}}>Built in our own research lab. Tuned on a billion images a year. Deployed at the edge so latency, cost and privacy stay where they should.</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))',gap:20}}>
          {cards.map(c => (
            <article key={c.title} style={{background:'#fff',borderRadius:16,padding:'26px 26px 28px',border:'1px solid #e4e8ef',boxShadow:'0 2px 6px rgba(26,29,56,.06)',display:'flex',flexDirection:'column'}}>
              <div style={{width:44,height:44,borderRadius:12,background:'#eef1fc',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:18}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f60dc" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={c.i}/></svg>
              </div>
              <h3 style={{fontSize:18,fontWeight:500,marginBottom:8,color:'#1a1d38',lineHeight:1.3}}>{c.title}</h3>
              <p style={{fontSize:14,color:'#4b4f73',lineHeight:1.55,margin:0}}>{c.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
window.Capabilities = Capabilities;
