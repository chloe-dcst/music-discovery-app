import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useRequireToken } from '../../hooks/useRequireToken.js';
import { fetchPlaylistById } from '../../api/spotify-playlists.js';
import { KEY_ACCESS_TOKEN } from '../../constants/storageKeys.js';

export default function PlaylistPage() {
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

  return (
    <div>
      <div>Playlist Page — id: {id}</div>
      {result && (
        <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
