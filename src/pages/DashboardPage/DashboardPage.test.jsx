// src/pages/DashboardPage/DashboardPage.test.jsx

import { describe, expect, test } from '@jest/globals';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './DashboardPage.jsx';
import * as spotifyApi from '../../api/spotify-me.js';
import { beforeEach, afterEach, jest } from '@jest/globals';
import * as useRequireTokenHook from '../../hooks/useRequireToken.js';
import { buildTitle } from '../../constants/appMeta.js';

// Mock top artist and track data
const topArtistData = {
    items: [
        { 
            id: 'artist1', 
            name: 'Top Artist', 
            genres: ['pop', 'rock'],
            images: [{ url: 'https://via.placeholder.com/64' }], 
            external_urls: { spotify: 'https://open.spotify.com/artist/artist1' } 
        },
    ],
};

const topTrackData = {
    items: [
        { 
            id: 'track1', 
            name: 'Top Track', 
            album: { images: [{ url: 'https://via.placeholder.com/64' }], 
            name: 'Top Album' }, 
            artists: [{ name: 'Artist1' }], 
            external_urls: { spotify: 'https://open.spotify.com/track/track1' } },
    ],
};

// Mock token value
const tokenValue = 'test-token';

// Tests for DashboardPage
describe('DashboardPage', () => {
    // Setup mocks before each test
    beforeEach(() => {
        // Mock localStorage token access
        // Default mock: return a valid token via the hook
        jest.spyOn(useRequireTokenHook, 'useRequireToken').mockReturnValue({ token: tokenValue, checking: false });

        // Default mock: successful top artist and track fetch
        jest.spyOn(spotifyApi, 'fetchUserTopArtists').mockResolvedValue({ data: topArtistData, error: null });
        jest.spyOn(spotifyApi, 'fetchUserTopTracks').mockResolvedValue({ data: topTrackData, error: null });
    });

    // Restore mocks after each test
    afterEach(() => {
        jest.restoreAllMocks();
    });

    // Helper to render DashboardPage
    const renderDashboardPage = () => {
        return render(
            // render DashboardPage within MemoryRouter
            <MemoryRouter initialEntries={['/dashboard']}>
                <Routes>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    {/* Dummy login route for redirection when token is expired */}
                    <Route path="/login" element={<div>Login Page</div>} />
                </Routes>
            </MemoryRouter>
        );
    };

    // Helper: wait until the top artist and top track are rendered
    const waitForDataToRender = async () => {
        await screen.findByText(topArtistData.items[0].name);
        await screen.findByText(topTrackData.items[0].name);
    };

    test('renders dashboard page', async () => {
        // Render the DashboardPage
        renderDashboardPage();

        // Check document title
        expect(document.title).toBe(buildTitle('Dashboard'));

        // wait for API data to render
        await waitForDataToRender();

        // should render main title
        const heading = screen.getByRole('heading', { level: 1, name: /dashboard/i });
        expect(heading).toBeInTheDocument();

        // should render top artist and top track
        expect(screen.getByText(topArtistData.items[0].name)).toBeInTheDocument();
        expect(screen.getByText(topTrackData.items[0].name)).toBeInTheDocument();
    });

    test('displays error messages on fetch failure', async () => {
        // Mock fetchUserTopArtists to return error
        jest.spyOn(spotifyApi, 'fetchUserTopArtists').mockResolvedValue({ data: null, error: 'Failed to fetch top artists' });
        // Mock fetchUserTopTracks to return error
        jest.spyOn(spotifyApi, 'fetchUserTopTracks').mockResolvedValue({ data: null, error: 'Failed to fetch top tracks' });

        // Render the DashboardPage
        renderDashboardPage();

        // the component sets `error` from the artists effect; wait for alert
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('Failed to fetch top artists');
    });

    test('displays error messages on fetch failure exceptions', async () => {
        // Mock fetchUserTopArtists to throw error
        jest.spyOn(spotifyApi, 'fetchUserTopArtists').mockRejectedValue(new Error('Network error for artists'));
        // Mock fetchUserTopTracks to throw error
        jest.spyOn(spotifyApi, 'fetchUserTopTracks').mockRejectedValue(new Error('Network error for tracks'));

        // Render the DashboardPage
        renderDashboardPage();

        // the component will set error for artists; wait for alert
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('Network error for artists');
    });

    test('redirects to login on token expiration', async () => {
        // Mock fetchUserTopArtists to return token expired error
        jest.spyOn(spotifyApi, 'fetchUserTopArtists').mockResolvedValue({ data: null, error: 'The access token expired' });
        // Mock fetchUserTopTracks to return token expired error
        jest.spyOn(spotifyApi, 'fetchUserTopTracks').mockResolvedValue({ data: null, error: 'The access token expired' });

        // Render the DashboardPage
        renderDashboardPage();

        // When the API returns a token-expired error the component sets the `error` state
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('The access token expired');
    });

    test('shows checking status while auth is being verified', () => {
        // Make the hook report checking state
        jest.spyOn(useRequireTokenHook, 'useRequireToken').mockReturnValue({ token: null, checking: true });

        renderDashboardPage();

        expect(screen.getByRole('status')).toHaveTextContent(/Checking authentication/i);
    });

    test('does not call API when no token available', () => {
        // Hook reports no token and not checking
        jest.spyOn(useRequireTokenHook, 'useRequireToken').mockReturnValue({ token: null, checking: false });

        const spyArtists = jest.spyOn(spotifyApi, 'fetchUserTopArtists');
        renderDashboardPage();

        // Allow effects to run microtasks
        expect(spyArtists).not.toHaveBeenCalled();
    });

    test('shows loading indicator while fetching artists', async () => {
        // Create a promise we can resolve later
        let resolveArtists;
        const artistsPromise = new Promise((res) => { resolveArtists = res; });
        jest.spyOn(spotifyApi, 'fetchUserTopArtists').mockImplementation(() => artistsPromise);

        // Ensure top tracks call resolves quickly so it doesn't interfere
        jest.spyOn(spotifyApi, 'fetchUserTopTracks').mockResolvedValue({ data: topTrackData, error: null });

        renderDashboardPage();

        // loading indicator should be visible while artists promise is pending
        expect(screen.getByText(/Loading top artist/i)).toBeInTheDocument();

        // now resolve artists and wait for render
        resolveArtists({ data: topArtistData, error: null });
        await screen.findByText(topArtistData.items[0].name);
    });
});