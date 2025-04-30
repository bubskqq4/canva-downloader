const CLIENT_ID = "b127f21a18e140ae89ecca22c6d8ae70";
const REDIRECT_URI = "https://canva-downloader.vercel.app/"; 
const SCOPES = "playlist-read-private playlist-modify-public playlist-modify-private";

// Elements
const playlistInput = document.getElementById("playlist-link");
const playlistTracksList = document.getElementById("playlist-tracks");
const copyPlaylistBtn = document.getElementById("copy-playlist-btn");
const createNewPlaylistBtn = document.getElementById("create-new-playlist-btn");

copyPlaylistBtn.addEventListener("click", () => {
  const link = playlistInput.value.trim();
  if (!link) return alert("Please enter a Spotify playlist link.");
  const playlistId = extractPlaylistId(link);
  if (!playlistId) return alert("Invalid Spotify playlist URL.");
  ensureAccessToken().then(token => fetchPlaylist(playlistId, token));
});

createNewPlaylistBtn.addEventListener("click", () => {
  const trackUris = [...document.querySelectorAll("#playlist-tracks li")].map(li => li.dataset.uri);
  if (trackUris.length === 0) return alert("No tracks to add.");
  
  ensureAccessToken().then(token => createNewPlaylist(token, trackUris));
});

// Extract playlist ID from Spotify URL
function extractPlaylistId(url) {
  try {
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// PKCE utilities
function generateCodeVerifier() {
  const array = new Uint8Array(64);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 128);
}

async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Get access token or redirect to auth
async function ensureAccessToken() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("code")) {
    const code = params.get("code");
    const storedVerifier = localStorage.getItem("code_verifier");
    const token = await exchangeToken(code, storedVerifier);
    localStorage.setItem("access_token", token.access_token);
    window.history.replaceState({}, document.title, REDIRECT_URI); // Clean URL
    return token.access_token;
  }

  const token = localStorage.getItem("access_token");
  if (token) return token;

  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem("code_verifier", verifier);

  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${CLIENT_ID}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code_challenge_method=S256&code_challenge=${challenge}`;
  window.location.href = authUrl;
}

// Exchange auth code for token
async function exchangeToken(code, verifier) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  if (!res.ok) {
    alert("Failed to get access token.");
    throw new Error("Token exchange failed");
  }

  return res.json();
}

// Fetch playlist tracks
function fetchPlaylist(playlistId, token) {
  fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data.items && data.items.length > 0) {
        const trackItems = data.items.map(item => {
          return `<li data-uri="${item.track.uri}">${item.track.name} by ${item.track.artists.map(artist => artist.name).join(', ')}</li>`;
        });
        playlistTracksList.innerHTML = trackItems.join('');
        playlistTracksList.style.display = 'block';
        createNewPlaylistBtn.style.display = 'inline-block'; // Show the button to create new playlist
      } else {
        alert("No tracks found in the playlist.");
      }
    })
    .catch(err => {
      console.error(err);
      alert("Error fetching playlist.");
    });
}

// Create new playlist
async function createNewPlaylist(token, trackUris) {
  // Create new playlist
  const playlistName = "New Playlist from Catify";
  const userId = await getUserId(token);
  const res = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: playlistName,
      description: "A playlist created using Catify.",
      public: false
    })
  });

  if (!res.ok) {
    alert("Error creating new playlist.");
    return;
  }

  const newPlaylist = await res.json();

  // Add tracks to new playlist
  await addTracksToPlaylist(token, newPlaylist.id, trackUris);
  alert("New playlist created successfully!");
}

// Get user ID
async function getUserId(token) {
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    alert("Failed to fetch user data.");
    throw new Error("Failed to fetch user ID");
  }

  const data = await res.json();
  return data.id;
}

// Add tracks to playlist
async function addTracksToPlaylist(token, playlistId, trackUris) {
  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      uris: trackUris
    })
  });

  if (!res.ok) {
    alert("Failed to add tracks to playlist.");
    throw new Error("Failed to add tracks to playlist");
  }

  const data = await res.json();
  console.log(data);
}
