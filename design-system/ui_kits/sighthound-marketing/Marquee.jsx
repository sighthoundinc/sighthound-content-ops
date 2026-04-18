function Marquee() {
  const items = ['Industry-Leading Accuracy','Comprehensive Vehicle Analytics','Flexible Deployment Options','Seamless Integration','Real-Time Processing','Scalable and Customizable','Secure and Compliant','Proven Track Record','Innovative AI-Driven Technology','Global Support and Expertise'];
  const row = [...items, ...items];
  return (
    <section style={{background:'#1a1d38',color:'#fff',padding:'28px 0',overflow:'hidden',borderTop:'1px solid #2a2e56',borderBottom:'1px solid #2a2e56'}}>
      <style>{`@keyframes mq { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
      <div style={{display:'flex',gap:56,animation:'mq 60s linear infinite',whiteSpace:'nowrap',width:'max-content'}}>
        {row.map((t,i)=>(
          <span key={i} style={{fontFamily:'Lexend',fontWeight:300,fontSize:22,display:'inline-flex',alignItems:'center',gap:56}}>
            {t} <span style={{color:'#f99f25'}}>•</span>
          </span>
        ))}
      </div>
    </section>
  );
}
window.Marquee = Marquee;
