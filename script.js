// Spotify Canvas Downloader JavaScript

const CLIENT_ID = "b127f21a18e140ae89ecca22c6d8ae70";
const REDIRECT_URI = "https://bubskqq4.github.io/canva-downloader/";
const SCOPES = "user-library-read";
const AUTH_URL = `https://accounts.spotify.com/authorize?response_type=token&client_id=${CLIENT_ID}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

const statusMessage = document.getElementById("status-message");
const canvasImage = document.getElementById("canvas-image");
const downloadButton = document.getElementById("download-btn");

downloadButton.onclick = function () {
    const spotifyLink = document.getElementById("spotify-link").value;
    if (spotifyLink) {
        getSpotifyCanvas(spotifyLink);
    } else {
        alert("Please enter a Spotify song link.");
    }
};

// Extract the track ID from a Spotify URL
function getSpotifyCanvas(link) {
    const trackId = link.split("/track/")[1]?.split("?")[0];
    if (!trackId) return alert("Invalid Spotify song URL!");

    if (!localStorage.getItem("access_token")) {
        window.location.href = AUTH_URL;
    } else {
        fetchCanvas(trackId);
    }
}

// Fetch canvas (album artwork used as fallback)
function fetchCanvas(trackId) {
    const token = localStorage.getItem("access_token");

    fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data?.album?.images?.length) {
            const canvasUrl = data.album.images[0].url;
            canvasImage.src = canvasUrl;
            canvasImage.style.display = "block";
        } else {
            alert("No canvas found for this track.");
        }
    })
    .catch(err => {
        console.error("Canvas fetch error:", err);
        alert("Something went wrong. Try again.");
    });
}

// Handle the redirect after Spotify login
window.onload = () => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    if (params.has("access_token")) {
        localStorage.setItem("access_token", params.get("access_token"));
        window.location.hash = "";
    }
};
