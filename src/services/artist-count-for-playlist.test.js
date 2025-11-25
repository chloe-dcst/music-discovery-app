// src/services/artist-count-for-playlist.test.js
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { artistCountForPlaylist } from "./artist-count-for-playlist.js";

// Mock the API module that artistCountForPlaylist depends on
jest.mock("../api/spotify-playlists.js", () => ({
  fetchPlaylistById: jest.fn(),
}));

import { fetchPlaylistById } from "../api/spotify-playlists.js";

// Helper to build playlist shape
function makePlaylist(trackItems) {
  return {
    tracks: {
      items: trackItems.map((t) => ({
        track: {
          name: t.name,
          artists: (t.artists || []).map((a) => ({ name: a })),
        },
      })),
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("artistCountForPlaylist", () => {
  test("calls fetchPlaylistById with token and playlistId", async () => {
    const token = "token123";
    const playlistId = "playlistABC";
    fetchPlaylistById.mockResolvedValue({
      data: makePlaylist([
        { name: "Song 1", artists: ["Artist A"] },
        { name: "Song 2", artists: ["Artist B"] },
        { name: "Song 3", artists: ["Artist C", "Artist A"] },
      ]),
      error: null,
    });

    const result = await artistCountForPlaylist(token, playlistId);

    expect(fetchPlaylistById).toHaveBeenCalledTimes(1);
    expect(fetchPlaylistById).toHaveBeenCalledWith(token, playlistId);
    expect(result).toEqual({ "Artist A": 2, "Artist B": 1, "Artist C": 1 });
  });

  test("returns undefined and logs error when fetchPlaylistById rejects", async () => {
    const mockError = new Error("Network failure");
    fetchPlaylistById.mockRejectedValue(mockError);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await artistCountForPlaylist("t", "p");
    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    // First arg string, second the error object (implementation logs both)
    const callArgs = consoleSpy.mock.calls[0];
    expect(callArgs[0]).toMatch(/Error fetching playlist/);
    expect(callArgs[1]).toBe(mockError);

    consoleSpy.mockRestore();
  });

  test("returns undefined and logs error when fetchPlaylistById resolves with error field", async () => {
    fetchPlaylistById.mockResolvedValue({ data: null, error: 'Invalid token' });
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await artistCountForPlaylist("t", "p");
    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test("returns empty object when tracks or items are missing or not an array", async () => {
    // case: data is null
    fetchPlaylistById.mockResolvedValueOnce({ data: null, error: null });
    let result = await artistCountForPlaylist("t", "p");
    expect(result).toEqual({});

    // case: tracks missing
    fetchPlaylistById.mockResolvedValueOnce({ data: {}, error: null });
    result = await artistCountForPlaylist("t", "p");
    expect(result).toEqual({});

    // case: items not an array
    fetchPlaylistById.mockResolvedValueOnce({ data: { tracks: { items: null } }, error: null });
    result = await artistCountForPlaylist("t", "p");
    expect(result).toEqual({});
  });

  test("skips playlist items without a track and handles non-array artists", async () => {
    fetchPlaylistById.mockResolvedValue({
      data: {
        tracks: {
          items: [
            {}, // missing track -> should be skipped
            { track: null }, // null track -> skipped
            { track: { artists: null } }, // artists not array -> treated as []
            { track: { artists: [{ name: 'Artist X' }] } },
          ],
        },
      },
      error: null,
    });

    const result = await artistCountForPlaylist("t", "p");
    expect(result).toEqual({ 'Artist X': 1 });
  });

  test("uses 'Unknown Artist' when artist object has no name or id", async () => {
    fetchPlaylistById.mockResolvedValue({
      data: {
        tracks: {
          items: [
            { track: { artists: [ {}, { id: 'artist-id-1' } ] } },
          ],
        },
      },
      error: null,
    });

    const result = await artistCountForPlaylist("t", "p");
    expect(result).toEqual({ 'Unknown Artist': 1, 'artist-id-1': 1 });
  });
});