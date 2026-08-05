// --- Bilder-Galerie: ein Bild, wechselt automatisch ---
const galleryImages = ["images/MemberMap.png", "images/Ahoj.jpg"];
const GALLERY_INTERVAL_MS = 15000;
let galleryIndex = 0;
const galleryImg = document.getElementById("gallery-img");

setInterval(() => {
	galleryIndex = (galleryIndex + 1) % galleryImages.length;
	galleryImg.src = galleryImages[galleryIndex];
}, GALLERY_INTERVAL_MS);

// --- Ahoj-Umfrage ---
const POLL_INTERVAL_MS = 3000;
const clientId = getClientId();

const idleEl = document.getElementById("poll-idle");
const votingEl = document.getElementById("poll-voting");
const resultEl = document.getElementById("poll-result");
const loadingEl = document.getElementById("poll-loading");
const errorEl = document.getElementById("poll-error");
const startForm = document.getElementById("start-form");
const votingNamesEl = document.getElementById("voting-names");
const countdownEl = document.getElementById("countdown");
const resultTextEl = document.getElementById("result-text");
const resultVotesEl = document.getElementById("result-votes");
const nextUnlockEl = document.getElementById("next-unlock");

let currentPoll = null;

function getClientId() {
	let id = localStorage.getItem("ahoj-client-id");
	if (!id) {
		id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
		localStorage.setItem("ahoj-client-id", id);
	}
	return id;
}

function hasVotedThisHour(hourSlot) {
	return localStorage.getItem("ahoj-voted-" + hourSlot) === "1";
}

function markVoted(hourSlot) {
	localStorage.setItem("ahoj-voted-" + hourSlot, "1");
}

function showError(msg) {
	errorEl.textContent = msg;
	errorEl.hidden = false;
	setTimeout(() => { errorEl.hidden = true; }, 4000);
}

function render(poll) {
	currentPoll = poll;
	loadingEl.hidden = true;
	idleEl.hidden = poll.phase !== "idle";
	votingEl.hidden = poll.phase !== "voting";
	resultEl.hidden = poll.phase !== "result";

	if (poll.phase === "voting") {
		votingNamesEl.innerHTML = "";
		const voted = hasVotedThisHour(poll.hourSlot);
		poll.names.forEach((name) => {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.textContent = name + " (" + (poll.votes[name] || 0) + ")";
			btn.disabled = voted;
			btn.addEventListener("click", () => castVote(name));
			votingNamesEl.appendChild(btn);
		});
	}

	if (poll.phase === "result") {
		resultTextEl.textContent = poll.winner
			? poll.winner + " muss 'n Ahoj trinken! Prost!"
			: "Keine Stimmen abgegeben.";
		resultVotesEl.textContent = poll.names
			.map((n) => n + ": " + (poll.votes[n] || 0))
			.join(" | ");
	}
}

async function fetchStatus() {
	loadingEl.hidden = false;
	idleEl.hidden = true;
	votingEl.hidden = true;
	resultEl.hidden = true;
	try {
		const res = await fetch("/api/poll-status");
		const data = await res.json();
		render(data);
	} catch (e) {
		loadingEl.hidden = true;
		// Netzwerkfehler, beim naechsten Intervall erneut versuchen
	}
}

async function castVote(name) {
	if (!currentPoll || currentPoll.phase !== "voting") return;
	try {
		const res = await fetch("/api/vote", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name, clientId }),
		});
		const data = await res.json();
		if (!res.ok) {
			showError(data.error || "Fehler beim Abstimmen.");
			return;
		}
		markVoted(currentPoll.hourSlot);
		render(data);
	} catch (e) {
		showError("Netzwerkfehler.");
	}
}

startForm.addEventListener("submit", async (e) => {
	e.preventDefault();
	const names = [
		document.getElementById("name1").value,
		document.getElementById("name2").value,
		document.getElementById("name3").value,
	];
	try {
		const res = await fetch("/api/start-poll", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ names }),
		});
		const data = await res.json();
		if (!res.ok) {
			showError(data.error || "Umfrage konnte nicht gestartet werden.");
			return;
		}
		startForm.reset();
		render(data);
	} catch (e) {
		showError("Netzwerkfehler.");
	}
});

function tickCountdown() {
	if (currentPoll && currentPoll.phase === "voting") {
		const remainingMs = new Date(currentPoll.endsAt).getTime() - Date.now();
		if (remainingMs <= 0) {
			countdownEl.textContent = "0:00";
			fetchStatus();
		} else {
			const s = Math.ceil(remainingMs / 1000);
			countdownEl.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
		}
	}
	if (currentPoll && currentPoll.phase !== "voting") {
		const next = new Date();
		next.setMinutes(0, 0, 0);
		next.setHours(next.getHours() + 1);
		nextUnlockEl.textContent = next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}
}

fetchStatus();
setInterval(fetchStatus, POLL_INTERVAL_MS);
setInterval(tickCountdown, 1000);
