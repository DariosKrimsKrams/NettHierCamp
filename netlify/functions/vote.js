import { getPollStore, currentHourSlot, jsonResponse, publicView } from "../lib/pollStore.js";

export default async (req) => {
	if (req.method !== "POST") {
		return jsonResponse({ error: "Method not allowed" }, 405);
	}

	let body;
	try {
		body = await req.json();
	} catch {
		return jsonResponse({ error: "Ungültige Anfrage." }, 400);
	}

	const name = typeof body.name === "string" ? body.name.trim() : "";
	const clientId = typeof body.clientId === "string" ? body.clientId.trim().slice(0, 64) : "";

	if (!name || !clientId) {
		return jsonResponse({ error: "Name und Client-ID erforderlich." }, 400);
	}

	const store = getPollStore();
	const hourSlot = currentHourSlot();
	const poll = await store.get(hourSlot, { type: "json" });

	if (!poll || poll.status !== "voting") {
		return jsonResponse({ error: "Aktuell läuft keine Umfrage." }, 400);
	}

	if (Date.now() >= new Date(poll.endsAt).getTime()) {
		return jsonResponse({ error: "Die Umfrage ist bereits beendet." }, 400);
	}

	if (!poll.names.includes(name)) {
		return jsonResponse({ error: "Unbekannter Name." }, 400);
	}

	poll.votedClientIds = poll.votedClientIds || [];
	if (poll.votedClientIds.includes(clientId)) {
		return jsonResponse({ error: "Du hast schon abgestimmt." }, 409);
	}

	poll.votedClientIds.push(clientId);
	poll.votes[name] = (poll.votes[name] || 0) + 1;

	await store.setJSON(hourSlot, poll);

	return jsonResponse(publicView(poll));
};

export const config = { path: "/api/vote" };
