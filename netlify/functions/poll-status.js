import { getPollStore, currentHourSlot, jsonResponse, publicView, pickWinner } from "../lib/pollStore.js";

export default async () => {
	const store = getPollStore();
	const hourSlot = currentHourSlot();
	const poll = await store.get(hourSlot, { type: "json" });

	if (!poll) {
		return jsonResponse({ phase: "idle", hourSlot });
	}

	// Umfragezeit abgelaufen aber noch nicht ausgewertet -> jetzt auswerten
	if (poll.status === "voting" && Date.now() >= new Date(poll.endsAt).getTime()) {
		poll.status = "result";
		poll.winner = pickWinner(poll);
		await store.setJSON(hourSlot, poll);
	}

	return jsonResponse(publicView(poll));
};

export const config = { path: "/api/poll-status" };
