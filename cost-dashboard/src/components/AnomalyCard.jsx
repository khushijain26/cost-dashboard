export function AnomalyCard({ anomaly }) {
  const { service, thisWeek, lastWeek, delta, reason } = anomaly;
  return (
    <div style={{ background:'#FAEEDA', border:'0.5px solid #EF9F27',
                  borderRadius:'12px', padding:'16px 20px', marginBottom:'12px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
        <span style={{ fontSize:'14px', fontWeight:500 }}>{service}</span>
        <span style={{ fontSize:'12px', fontWeight:500, background:'#FCEBEB',
                       color:'#A32D2D', padding:'2px 8px', borderRadius:'20px' }}>
          +{delta.toFixed(1)}%
        </span>
      </div>
      <p style={{ fontSize:'13px', color:'#555', margin:'0 0 10px', lineHeight:1.6 }}>
        {reason}
      </p>
      <p style={{ fontSize:'12px', color:'#999', margin:0 }}>
        ${lastWeek.toFixed(2)} last week → ${thisWeek.toFixed(2)} this week
      </p>
    </div>
  );
}

export function AnomalySection({ anomalies, loading }) {
  if (loading) return (
    <p style={{ fontSize:'13px', color:'#999' }}>Analyzing anomalies...</p>
  );
  if (!anomalies?.length) return null;
  return (
    <div>
      <p style={{ fontSize:'14px', fontWeight:500, margin:'0 0 12px' }}>
        Cost anomalies ({anomalies.length})
      </p>
      {anomalies.map(a => <AnomalyCard key={a.service} anomaly={a} />)}
    </div>
  );
}