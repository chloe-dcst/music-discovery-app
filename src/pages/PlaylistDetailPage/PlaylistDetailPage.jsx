import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useRequireToken } from '../../hooks/useRequireToken.js';
import { fetchPlaylistById } from '../../api/spotify-playlists.js';
import { KEY_ACCESS_TOKEN } from '../../constants/storageKeys.js';
import './PlaylistDetailPage.css'
import TrackItem from '../../components/TrackItem/TrackItem.jsx';
import { buildTitle } from '../../constants/appMeta.js';

export default function PlaylistDetailPage() {
  const { id } = useParams();
  const { token } = useRequireToken();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!token || !id) return;
    let mounted = true;

    const extractPlaylistId = (raw) => {
      if (!raw) return raw;
      // spotify URI: spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
      const uriMatch = raw.match(/^spotify:playlist:([A-Za-z0-9]+)$/);
      if (uriMatch) return uriMatch[1];
      // URL: https://open.spotify.com/playlist/{id}?si=...
      const urlMatch = raw.match(/playlist[/:]([A-Za-z0-9]+)(?:\?|$)/);
      if (urlMatch) return urlMatch[1];
      // fallback: strip query params
      return raw.split('?')[0];
    };

    (async () => {
      try {
        const cleanId = extractPlaylistId(id);
        if (cleanId !== id) console.log('Normalized playlist id:', id, '->', cleanId);

        const res = await fetchPlaylistById(token, cleanId);
        console.log('fetchPlaylistById result for', cleanId, res);

        if (!mounted) return;

        // Handle expired token returned by the API
        if (res && res.error && /expired/i.test(String(res.error))) {
          // remove stored token and redirect to login preserving the current target
          try {
            if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
              globalThis.localStorage.removeItem(KEY_ACCESS_TOKEN);
            }
          } catch {
            // log but don't throw
          }
          const { origin, pathname, search, hash } = globalThis.location;
          const fullTarget = `${origin}${pathname}${search}${hash}`;
          navigate(`/login?next=${encodeURIComponent(fullTarget)}`, { replace: true });
          return;
        }

        setResult(res);
      } catch (err) {
        console.error('Error fetching playlist:', err);
        if (mounted) setResult({ error: err.message });
      }
    })();

    return () => { mounted = false; };
  }, [token, id, navigate]);

  // update document title when playlist data is available
  useEffect(() => {
    if (result?.data?.name) {
      document.title = buildTitle('Playlist');
    }
  }, [result]);

  // ensure page title is set as early as possible for tests
  useEffect(() => {
    document.title = buildTitle('Playlist');
  }, []);

  return (
    <div className="playlist-container page-container" role="region" aria-label={result?.data?.name || 'Playlist'}>

      {result === null && (
        <div role="status">Loading playlist... <span data-testid="loading-indicator" /></div>
      )}

      {result?.data && (
        <header className="playlist-header">
          <div className="playlist-header-image">
            <img
              src={result.data.images?.[0]?.url}
              alt={`Cover of ${result.data.name}`}
              className="playlist-cover"
            />
          </div>

          <div className="playlist-header-text-with-link">
            <div className="playlist-header-text">
              <h1 className="playlist-title page-title">{result.data.name}</h1>
              {result.data.description ? (
                <h2 className="playlist-subtitle page-subtitle" dangerouslySetInnerHTML={{ __html: result.data.description }} />
              ) : null}
            </div>

            <a className="playlist-spotify-link" href={result.data.external_urls?.spotify} target="_blank" rel="noopener noreferrer">Open in Spotify</a>
          </div>
        </header>
      )}

      {result && (
        <section>
          {result.error && (
            <div role="alert" className="playlist-error">Error: {String(result.error)}</div>
          )}

          {result.data?.tracks?.items && result.data.tracks.items.length > 0 ? (
            <ul className="playlist-list" aria-label="Playlist tracks">
              {result.data.tracks.items.map((item, idx) => {
                // Support both shapes: { track: {...} } or direct track object.
                // If item.track is null/undefined, skip the entry.
                const track = item && item.track ? item.track : item;
                if (!track || !track.id) return null;
                return <TrackItem key={track.id || `${idx}`} track={track} />;
              })}
            </ul>
          ) : (
            !result.error && <div className="playlist-loading">No tracks found in this playlist.</div>
          )}
        </section>
      )}
    </div>
  );
}
