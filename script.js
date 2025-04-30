// Spotify Canvas Downloader - PKCE Flow

const CLIENT_ID = "b127f21a18e140ae89ecca22c6d8ae70";
const REDIRECT_URI = "https://bubskqq4.github.io/canva-downloader/";
const SCOPES = "user-library-read";

// Elements
const spotifyInput = document.getElementById("spotify-link");
const canvasImage = document.getElementById("canvas-image");
const downloadBtn = document.getElementById("download-btn");

downloadBtn.addEventListener("click", () => {
  const link = spotifyInput.value.trim();
  if (!link) return alert("Please enter a Spotify song link.");
  const trackId = extractTrackId(link);
  if (!trackId) return alert("Invalid Spotify track URL.");
  ensureAccessToken().then(token => fetchCanvas(trackId, token));
});

// Extract track ID from Spotify URL
function extractTrackId(url) {
  try {
    const match = url.match(/track\/([a-zA-Z0-9]+)/);
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

// Fetch canvas (album image fallback)
function fetchCanvas(trackId, token) {
  fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data.album && data.album.images.length > 0) {
        canvasImage.src = data.album.images[0].url;
        canvasImage.style.display = "block";
      } else {
        alert("No canvas/album image found.");
      }
    })
    .catch(err => {
      console.error(err);
      alert("Error fetching canvas.");
    });
}
