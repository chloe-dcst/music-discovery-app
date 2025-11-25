import { useEffect, useState } from 'react';
import { buildTitle } from '../../constants/appMeta.js';
import './DashboardPage.css';
import '../PageLayout.css';
import { useRequireToken } from '../../hooks/useRequireToken.js';
import { fetchUserTopArtists } from '../../api/spotify-me.js';

export default function DashboardPage() {
  const { token, checking } = useRequireToken();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [topArtist, setTopArtist] = useState(null);

  useEffect(() => {
    document.title = buildTitle('Dashboard');
  }, []);

  useEffect(() => {
    if (checking) return;
    if (!token) return;

    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchUserTopArtists(token, 5);
        if (!mounted) return;
        if (res?.error) {
          setError(res.error);
          return;
        }
        const first = res?.data?.items?.[0] || null;
        setTopArtist(first);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || 'Failed to fetch top artists');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [token, checking]);

  return (
    <section className="dashboard-page page-container" aria-labelledby="dashboard-title">
      <h1 id="dashboard-title" className="page-title">Dashboard</h1>

      {checking && <div role="status">Checking authentication…</div>}

      {!checking && loading && (
        <div role="status">Loading top artist… <span data-testid="loading-artist" /></div>
      )}

      {!checking && error && (
        <div role="alert" className="dashboard-error">Error: {String(error)}</div>
      )}

      {topArtist && (
        <article className="top-artist" aria-label="Top artist">
          {topArtist.images?.[0]?.url ? (
            <img src={topArtist.images[0].url} alt={`Portrait de ${topArtist.name}`} className="top-artist-img" />
          ) : null}
          <div className="top-artist-info">
            <h2 className="top-artist-name">{topArtist.name}</h2>
            {topArtist.genres && topArtist.genres.length > 0 && (
              <p className="top-artist-genres">{topArtist.genres.join(', ')}</p>
            )}
          </div>
        </article>
      )}
    </section>
  );
}
