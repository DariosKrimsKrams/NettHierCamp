import { getPollStore, currentHourSlot, jsonResponse, POLL_DURATION_MS, publicView } from "../lib/pollStore.js";

function sanitizeName(raw) {
	if (typeof raw !== "string") return "";
	return raw.trim().slice(0, 30);
}

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

	const names = Array.isArray(body.names) ? body.names.map(sanitizeName).filter(Boolean) : [];
	const uniqueNames = [...new Set(names)];

	if (uniqueNames.length !== 3) {
		return jsonResponse({ error: "Bitte genau 3 unterschiedliche Namen eingeben." }, 400);
	}

	const store = getPollStore();
	const hourSlot = currentHourSlot();
	const now = new Date();

	const poll = {
		hourSlot,
		status: "voting",
		names: uniqueNames,
		votes: Object.fromEntries(uniqueNames.map((n) => [n, 0])),
		votedClientIds: [],
		startedAt: now.toISOString(),
		endsAt: new Date(now.getTime() + POLL_DURATION_MS).toISOString(),
		winner: null,
	};

	const existingPoll = await store.get(hourSlot, { type: "json" });
	if (existingPoll && existingPoll.status === "voting") {
		const endsAt = new Date(existingPoll.endsAt).getTime();
		if (Date.now() < endsAt) {
			return jsonResponse({ error: "Für diese Stunde läuft schon eine Umfrage." }, 409);
		}
	}

	await store.setJSON(hourSlot, poll);
	return jsonResponse(publicView(poll));
};

export const config = { path: "/api/start-poll" };
