import { useEffect } from 'react';
import { buildTitle } from '../../constants/appMeta.js';
import './DashboardPage.css';
import '../PageLayout.css';
import { useRequireToken } from '../../hooks/useRequireToken.js';
import { fetchUserTopArtists } from '../../api/spotify-me.js';

export default function DashboardPage() {
  const { token, checking } = useRequireToken();

  useEffect(() => {
    document.title = buildTitle('Dashboard');
  }, []);

  useEffect(() => {
    if (checking) return;
    if (!token) return;

    (async () => {
      try {
        const res = await fetchUserTopArtists(token, 10);
        console.log('fetchUserTopArtists result', res);
        // If the response contains items, log the first artist for quick inspection
        if (res?.data?.items && res.data.items.length > 0) {
          console.log('topArtists.items[0]', res.data.items[0]);
        }
      } catch (err) {
        console.error('Error fetching top artists:', err);
      }
    })();
  }, [token, checking]);

  return (
    <section className="dashboard-page page-container" aria-labelledby="dashboard-title">
      <h1 id="dashboard-title" className="page-title">Dashboard</h1>
    </section>
  );
}
