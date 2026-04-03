import { SpendSummary }   from './components/SpendSummary';
import { CostBarChart }   from './components/CostBarChart';
import { AnomalySection } from './components/AnomalyCard';
import { useCostData }    from './hooks/useCostData';
import { useAnomalies }   from './hooks/useAnomalies';
import './App.css';

export default function App() {
  const { data, loading, error }         = useCostData();
  const { anomalies, loading: aLoading } = useAnomalies(data);

  if (error) return (
    <p style={{ color:'red', padding:'2rem' }}>Error: {error}</p>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>AWS cost dashboard</h1>
        <span className="ai-badge">AI-powered</span>
      </header>
      <main className="app-main">
        {loading
          ? <p style={{ color:'#999' }}>Loading...</p>
          : <>
              <SpendSummary data={data} />
              <CostBarChart data={data} />
              <AnomalySection anomalies={anomalies} loading={aLoading} />
            </>
        }
      </main>
    </div>
  );
}