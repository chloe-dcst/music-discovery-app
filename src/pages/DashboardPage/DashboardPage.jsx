import { useEffect } from 'react';
import { buildTitle } from '../../constants/appMeta.js';
import './DashboardPage.css';
import '../PageLayout.css';

export default function DashboardPage() {
  useEffect(() => {
    document.title = buildTitle('Dashboard');
  }, []);

  return (
    <section className="dashboard-page page-container" aria-labelledby="dashboard-title">
      <h1 id="dashboard-title" className="page-title">Dashboard</h1>
    </section>
  );
}
