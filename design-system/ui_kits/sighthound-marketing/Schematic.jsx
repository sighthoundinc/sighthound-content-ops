function Schematic() {
  return (
    <section style={{padding:'112px 32px',background:'#fff',position:'relative',overflow:'hidden'}}>
      <div className="sh-pattern-topo" style={{position:'absolute',inset:0,opacity:.6,pointerEvents:'none'}}/>
      <div style={{position:'relative',maxWidth:1240,margin:'0 auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1.4fr',gap:64,alignItems:'center'}}>
          <div>
            <div className="overline" style={{marginBottom:12}}>How it deploys</div>
            <h2 style={{fontSize:40,lineHeight:1.1,marginBottom:18}}>Edge-first. Cloud-optional. Your environment, your data.</h2>
            <p style={{fontSize:16,color:'#4b4f73',lineHeight:1.6,marginBottom:24,fontWeight:400}}>Run detection on a Sighthound device at the source, or stream RTSP from existing cameras into a Sighthound Node. Results land in your VMS, ITS, parking system or data warehouse — no Sighthound cloud required.</p>
            <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:10}}>
              <li style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:14,color:'#1a1d38'}}><span style={{color:'#1f9d55',fontWeight:600,marginTop:2}}>✓</span> Runs on-prem, in your VPC, or air-gapped</li>
              <li style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:14,color:'#1a1d38'}}><span style={{color:'#1f9d55',fontWeight:600,marginTop:2}}>✓</span> REST, MQTT, Webhook and direct DB integrations</li>
              <li style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:14,color:'#1a1d38'}}><span style={{color:'#1f9d55',fontWeight:600,marginTop:2}}>✓</span> Hardware optional — bring your own GPU if you prefer</li>
              <li style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:14,color:'#1a1d38'}}><span style={{color:'#1f9d55',fontWeight:600,marginTop:2}}>✓</span> Software-defined — same model, any deployment shape</li>
            </ul>
          </div>
          <div style={{background:'#fff',border:'1px solid #e4e8ef',borderRadius:18,padding:'32px 28px',boxShadow:'0 8px 20px rgba(26,29,56,.06)'}}>
            <svg viewBox="0 0 600 360" width="100%" preserveAspectRatio="xMidYMid meet">
              <defs>
                <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#4f60dc"/></marker>
              </defs>
              {/* Layer band labels */}
              <g fontFamily="Lexend" fontSize="10" fill="#9aa3b2" fontWeight="600" letterSpacing="1">
                <text x="20" y="22" textTransform="uppercase">EDGE</text>
                <text x="245" y="22" textTransform="uppercase">SIGHTHOUND</text>
                <text x="470" y="22" textTransform="uppercase">YOUR SYSTEMS</text>
              </g>
              <g stroke="#e4e8ef" strokeDasharray="2 4">
                <line x1="220" y1="40" x2="220" y2="340"/>
                <line x1="455" y1="40" x2="455" y2="340"/>
              </g>
              {/* Connectors */}
              <g stroke="#4f60dc" strokeWidth="1.7" fill="none" markerEnd="url(#ah)">
                <line x1="150" y1="80"  x2="270" y2="155"/>
                <line x1="150" y1="180" x2="270" y2="170"/>
                <line x1="150" y1="280" x2="270" y2="195"/>
                <line x1="400" y1="180" x2="490" y2="100"/>
                <line x1="400" y1="180" x2="490" y2="180"/>
                <line x1="400" y1="180" x2="490" y2="260"/>
              </g>
              {/* Edge devices */}
              <g fontFamily="Lexend" fontSize="12">
                <g><rect x="20" y="55" width="130" height="50" rx="10" fill="#fff" stroke="#1a1d38" strokeWidth="1.5"/><text x="32" y="78" fill="#1a1d38" fontWeight="500">Edge camera</text><text x="32" y="95" fill="#64708a" fontSize="10.5">Sighthound Compute</text></g>
                <g><rect x="20" y="155" width="130" height="50" rx="10" fill="#fff" stroke="#1a1d38" strokeWidth="1.5"/><text x="32" y="178" fill="#1a1d38" fontWeight="500">IP camera</text><text x="32" y="195" fill="#64708a" fontSize="10.5">via RTSP</text></g>
                <g><rect x="20" y="255" width="130" height="50" rx="10" fill="#fff" stroke="#1a1d38" strokeWidth="1.5"/><text x="32" y="278" fill="#1a1d38" fontWeight="500">Body / dash cam</text><text x="32" y="295" fill="#64708a" fontSize="10.5">mobile capture</text></g>
                {/* Node */}
                <g>
                  <rect x="270" y="135" width="135" height="90" rx="12" fill="#eef1fc" stroke="#4f60dc" strokeWidth="1.7"/>
                  <text x="285" y="160" fill="#1a1d38" fontWeight="500">Sighthound Node</text>
                  <text x="285" y="178" fill="#4b4f73" fontSize="10.5">Detection</text>
                  <text x="285" y="194" fill="#4b4f73" fontSize="10.5">MMCG · OCR</text>
                  <text x="285" y="210" fill="#4b4f73" fontSize="10.5">Redaction</text>
                </g>
                {/* Outputs */}
                <g><rect x="490" y="75" width="100" height="50" rx="10" fill="#fff" stroke="#1a1d38" strokeWidth="1.5"/><text x="502" y="98" fill="#1a1d38" fontWeight="500">VMS</text><text x="502" y="115" fill="#64708a" fontSize="10.5">Existing video</text></g>
                <g><rect x="490" y="155" width="100" height="50" rx="10" fill="#fff" stroke="#1a1d38" strokeWidth="1.5"/><text x="502" y="178" fill="#1a1d38" fontWeight="500">ITS / parking</text><text x="502" y="195" fill="#64708a" fontSize="10.5">Webhook · MQTT</text></g>
                <g><rect x="490" y="235" width="100" height="50" rx="10" fill="#fff" stroke="#1a1d38" strokeWidth="1.5"/><text x="502" y="258" fill="#1a1d38" fontWeight="500">Data lake</text><text x="502" y="275" fill="#64708a" fontSize="10.5">REST / S3</text></g>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
window.Schematic = Schematic;
