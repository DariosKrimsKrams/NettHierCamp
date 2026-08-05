// --- Bilder-Galerie: ein Bild, wechselt automatisch ---
const galleryImages = ["images/MemberMap.png", "images/Rob_out.jpg"];
const GALLERY_INTERVAL_MS = 15000;
const GALLERY_SWIPE_THRESHOLD = 40;
let galleryIndex = 0;
const galleryImg = document.getElementById("gallery-img");
const galleryEl = document.querySelector(".gallery");
let touchStartX = null;
let touchCurrentX = null;
let galleryInterval = null;

function updateGalleryImage() {
	galleryImg.src = galleryImages[galleryIndex];
}

function nextGalleryImage() {
	galleryIndex = (galleryIndex + 1) % galleryImages.length;
	updateGalleryImage();
}

function prevGalleryImage() {
	galleryIndex = (galleryIndex - 1 + galleryImages.length) % galleryImages.length;
	updateGalleryImage();
}

function resetGalleryInterval() {
	if (galleryInterval !== null) {
		clearInterval(galleryInterval);
	}
	galleryInterval = setInterval(nextGalleryImage, GALLERY_INTERVAL_MS);
}

resetGalleryInterval();

if (galleryEl) {
	galleryEl.addEventListener("touchstart", (event) => {
		if (event.touches.length !== 1) return;
		touchStartX = event.touches[0].clientX;
		touchCurrentX = touchStartX;
	});

	galleryEl.addEventListener("touchmove", (event) => {
		if (touchStartX === null || event.touches.length !== 1) return;
		touchCurrentX = event.touches[0].clientX;
	});

	galleryEl.addEventListener("touchend", () => {
		if (touchStartX === null || touchCurrentX === null) {
			touchStartX = null;
			touchCurrentX = null;
			return;
		}

		const deltaX = touchCurrentX - touchStartX;
		if (Math.abs(deltaX) >= GALLERY_SWIPE_THRESHOLD) {
			if (deltaX > 0) {
				prevGalleryImage();
			} else {
				nextGalleryImage();
			}
			resetGalleryInterval();
		}

		touchStartX = null;
		touchCurrentX = null;
	});
}

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
const nextUnlockCountdownEl = document.getElementById("next-unlock-countdown");
const firstPollModal = document.getElementById("first-poll-modal");
const firstPollOkBtn = document.getElementById("first-poll-ok");
const newPollBtn = document.getElementById("new-poll-button");
const ahojImage = document.getElementById("ahoj-image");
let idleModalShown = false;
const FIRST_POLL_SHOWN_PREFIX = "ahoj-first-poll-shown-";

let currentPoll = null;
let statusConfirmed = false;
let statusIntervalId = null;
let statusTimeoutId = null;

function getClientId() {
	let id = localStorage.getItem("ahoj-client-id");
	if (!id) {
		id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
		localStorage.setItem("ahoj-client-id", id);
	}
	return id;
}

function clearStatusPolling() {
	if (statusIntervalId !== null) {
		clearInterval(statusIntervalId);
		statusIntervalId = null;
	}
	if (statusTimeoutId !== null) {
		clearTimeout(statusTimeoutId);
		statusTimeoutId = null;
	}
}

function scheduleStatusPolling(delay = 10000) {
	clearStatusPolling();
	statusTimeoutId = setTimeout(() => {
		fetchStatus();
		statusIntervalId = setInterval(fetchStatus, POLL_INTERVAL_MS);
		statusTimeoutId = null;
	}, delay);
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

function updateShareLink(poll) {
	const shareContainer = document.getElementById("share-container");
	const shareLink = document.getElementById("share-link");
	if (!shareContainer || !shareLink || poll.phase !== "voting") {
		if (shareContainer) shareContainer.hidden = true;
		return;
	}

	const question = "Wer bekommt gleich 'n Ahoj?\n - ";
	const options = poll.names
		.map((name) => `${name}: ${formatVotes(poll.votes[name] || 0)}`)
		.join("\n - ");
	const url = window.location.href;
	const text = `${question}${options}\nHier mitmachen: ${url}`;
	const encoded = encodeURIComponent(text);
	shareLink.href = `https://wa.me/?text=${encoded}`;
	shareContainer.hidden = false;
}

function formatVotes(count) {
	return count === 1 ? "1 Vote" : `${count} Votes`;
}

function clearVotedMark(hourSlot) {
	localStorage.removeItem("ahoj-voted-" + hourSlot);
}

function showNewPollForm() {
	clearStatusPolling();
	loadingEl.hidden = true;
	votingEl.hidden = true;
	resultEl.hidden = true;
	idleEl.hidden = false;
	document.getElementById("name1")?.focus();
}

function getModalHourKey(hourSlot) {
	return FIRST_POLL_SHOWN_PREFIX + hourSlot;
}

function hasSeenFirstPollModal(hourSlot) {
	return localStorage.getItem(getModalHourKey(hourSlot)) === "1";
}

function markSeenFirstPollModal(hourSlot) {
	localStorage.setItem(getModalHourKey(hourSlot), "1");
}

function isWithinModalWindow() {
	const now = new Date();
	const start = new Date(2026, 7, 6, 10, 0, 0);
	const end = new Date(2026, 7, 6, 20, 0, 0);
	return now >= start && now <= end;
}

function showFirstPollModal(hourSlot) {
	if (!firstPollModal || idleModalShown || !isWithinModalWindow() || hasSeenFirstPollModal(hourSlot)) return;
	firstPollModal.hidden = false;
	firstPollModal.style.display = "grid";
	idleModalShown = true;
}

function animateAhojImage() {
	if (!ahojImage) return;
	ahojImage.classList.remove("animate");
	void ahojImage.offsetWidth;
	ahojImage.classList.add("animate");
}

function hideFirstPollModal(hourSlot) {
	if (!firstPollModal) return;
	firstPollModal.hidden = true;
	firstPollModal.style.display = "none";
	idleModalShown = false;
	if (hourSlot) {
		markSeenFirstPollModal(hourSlot);
	}
}

function render(poll) {
	currentPoll = poll;
	statusConfirmed = true;
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
			btn.textContent = name;
			btn.disabled = voted;
			btn.addEventListener("click", () => castVote(name));
			votingNamesEl.appendChild(btn);
		});
		updateShareLink(poll);
	}

	if (poll.phase === "result") {
		resultTextEl.textContent = poll.winner
			? poll.winner + " muss 'n Ahoj trinken! Prost!"
			: "Keine Votes abgegeben.";
		resultVotesEl.textContent = poll.names
			.map((n) => `${n}: ${formatVotes(poll.votes[n] || 0)}`)
			.join(" | ");
	}

	if (poll.phase === "idle") {
		if (statusConfirmed) {
			showFirstPollModal(poll.hourSlot);
		}
	} else {
		hideFirstPollModal();
	}
}

async function fetchStatus() {
	const shouldShowLoading = !currentPoll;
	if (shouldShowLoading) {
		loadingEl.hidden = false;
		idleEl.hidden = true;
		votingEl.hidden = true;
		resultEl.hidden = true;
	}
	try {
		const res = await fetch("/api/poll-status");
		const data = await res.json();
		render(data);
	} catch (e) {
		if (shouldShowLoading) {
			loadingEl.hidden = true;
		}
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
			showError(data.error || "Fehler beim Voten.");
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
		clearVotedMark(data.hourSlot);
		render(data);
		clearStatusPolling();
		scheduleStatusPolling(10000);
	} catch (e) {
		showError("Netzwerkfehler.");
	}
});

if (firstPollOkBtn) {
	firstPollOkBtn.addEventListener("click", () => {
		hideFirstPollModal(currentPoll?.hourSlot);
	});
}

if (ahojImage) {
	ahojImage.addEventListener("click", animateAhojImage);
}

if (newPollBtn) {
	newPollBtn.addEventListener("click", showNewPollForm);
}

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
		const remainingMs = next.getTime() - Date.now();
		const minutes = Math.floor(remainingMs / 60000);
		const seconds = Math.floor((remainingMs % 60000) / 1000);
		nextUnlockEl.textContent = next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
		nextUnlockCountdownEl.textContent = remainingMs > 0
			? ` (in ${minutes}:${String(seconds).padStart(2, "0")})`
			: "";
	}
}

fetchStatus();
scheduleStatusPolling(10000);
setInterval(tickCountdown, 1000);
