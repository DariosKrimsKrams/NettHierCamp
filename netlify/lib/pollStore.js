import { getStore } from "@netlify/blobs";

export const POLL_DURATION_MS = 3 * 60 * 1000; // 3 Minuten Abstimmzeit

export function getPollStore() {
	return getStore("polls");
}

// Umfragen sind an die volle Stunde gebunden, z.B. "2026-08-05T18"
export function currentHourSlot(date = new Date()) {
	return date.toISOString().slice(0, 13);
}

export function jsonResponse(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export function publicView(poll) {
	return {
		phase: poll.status,
		hourSlot: poll.hourSlot,
		names: poll.names,
		votes: poll.votes,
		endsAt: poll.endsAt,
		winner: poll.winner,
	};
}

export function pickWinner(poll) {
	let best = null;
	let bestVotes = -1;
	for (const name of poll.names) {
		const v = poll.votes[name] || 0;
		if (v > bestVotes) {
			bestVotes = v;
			best = name;
		}
	}
	return best;
}
