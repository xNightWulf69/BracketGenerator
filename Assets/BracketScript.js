let tournamentData = null;
let lastModified = null;
document.addEventListener("DOMContentLoaded", () => {
	setInterval(checkForUpdates, 1000);
	loadTournamentData();
});
async function checkForUpdates() {
	try {
		const response = await fetch("/api/tournament");
		const data = await response.json();
		if (data.error) {
			console.log(data.error);
			return;
		}
		const currentModified = new Date(data.timestamp)
			.getTime();
		if (lastModified === null || currentModified > lastModified) {
			lastModified = currentModified;
			tournamentData = data;
			applyTournamentData(data);
			console.log("Tournament data reloaded from server.");
		}
	} catch (err) {
		console.log("Error checking for updates", err);
	}
}
async function loadTournamentData() {
	try {
		const response = await fetch("/api/tournament");
		const data = await response.json();
		if (data.error) {
			console.log(data.error);
			return;
		}
		tournamentData = data;
		applyTournamentData(data);
	} catch (err) {
		console.error("Error loading tournament data:", err);
	}
}

function applyTournamentData(data) {
	if (data.swissMatches) {
		updateSwissBracket(data);
	}
	if (data.doubleMatches) {
		updateDoubleBracket(data);
	}
	if (data.singleMatches) {
		updateSingleBracket(data);
	}
}

function updateSwissBracket(data) {
	for (let i = 100; i <= 800; i += 100) {
		const teamEl = document.getElementById(`Team${i}`);
		if (teamEl) {
			teamEl.style.backgroundImage = "";
		}
	}

	if (!data?.teams || !data?.swissMatches) return;
	document.querySelectorAll('[id^="Team"]')
		.forEach(el => {
			el.style.backgroundImage = "";
		});
	Object.entries(data.swissMatches)
		.forEach(([matchId, match]) => {
			const [wins, losses, matchNumStr] = matchId.split("-");
			const matchNum = parseInt(matchNumStr, 10);
			if (!Number.isFinite(matchNum)) return;
			const roundCode = `${wins}${losses}`;
			["team1", "team2"].forEach((pos, idx) => {
				const teamName = match[pos];
				if (!teamName || teamName === "TBD") return;
				const team = data.teams.find(t => t.name ===
					teamName);
				if (!team?.logo) return;
				const slotIndex = (matchNum - 1) * 2 + (idx + 1);
				const id = `Team${slotIndex}${roundCode}`;
				const el = document.getElementById(id);
				if (el) el.style.backgroundImage =
					`url(${resolveLogoPath(team.logo)})`;
			});
		});
	const qualified = data.teams.filter(t => (t.wins ?? 0) >= 3);
	qualified.slice(0, 8)
		.forEach((team, i) => {
			const el = document.getElementById(`Qualified${i + 1}`);
			if (el && team.logo) el.style.backgroundImage =
				`url(${resolveLogoPath(team.logo)})`;
		});
	const eliminated = data.teams.filter(t => (t.losses ?? 0) >= 3);
	eliminated.slice(0, 8)
		.forEach((team, i) => {
			const el = document.getElementById(`Eliminated${i + 1}`);
			if (el && team.logo) el.style.backgroundImage =
				`url(${resolveLogoPath(team.logo)})`;
		});
}

function updateDoubleBracket(data) {
	console.log("=== UPDATE DOUBLE BRACKET ===");
	document.querySelectorAll('#DoubleBracketStuff .team-logo').forEach(el => {
		el.style.backgroundImage = "";
	});
	document.querySelectorAll('#DoubleBracketStuff .team-name').forEach(el => {
		el.textContent = "";
	});
	document.querySelectorAll('#DoubleBracketStuff .team-score').forEach(el => {
		el.textContent = "";
	});
	console.log("Data received:", data);
	if (!data || !data.doubleMatches) {
		console.log("No double elimination data found");
		return;
	}
	const teams = data.teams || [];
	console.log("Available teams:", teams.map(t => t.name));
	console.log("Double matches:", data.doubleMatches);
	const matchToHtmlMapping = {
		'A-UQ-1': {
			group: 1,
			positions: [1, 2]
		},
		'A-UQ-2': {
			group: 1,
			positions: [3, 4]
		},
		'A-UQ-3': {
			group: 1,
			positions: [5, 6]
		},
		'A-UQ-4': {
			group: 1,
			positions: [7, 8]
		},
		'A-US-1': {
			group: 1,
			positions: [1, 2],
			round: 'US'
		},
		'A-US-2': {
			group: 1,
			positions: [3, 4],
			round: 'US'
		},
		'A-LQ-1': {
			group: 1,
			positions: [1, 2],
			round: 'LQ'
		},
		'A-LQ-2': {
			group: 1,
			positions: [3, 4],
			round: 'LQ'
		},
		'A-LS-1': {
			group: 1,
			positions: [1, 2],
			round: 'LS'
		},
		'A-LS-2': {
			group: 1,
			positions: [3, 4],
			round: 'LS'
		},
		'B-UQ-1': {
			group: 2,
			positions: [1, 2]
		},
		'B-UQ-2': {
			group: 2,
			positions: [3, 4]
		},
		'B-UQ-3': {
			group: 2,
			positions: [5, 6]
		},
		'B-UQ-4': {
			group: 2,
			positions: [7, 8]
		},
		'B-US-1': {
			group: 2,
			positions: [1, 2],
			round: 'US'
		},
		'B-US-2': {
			group: 2,
			positions: [3, 4],
			round: 'US'
		},
		'B-LQ-1': {
			group: 2,
			positions: [1, 2],
			round: 'LQ'
		},
		'B-LQ-2': {
			group: 2,
			positions: [3, 4],
			round: 'LQ'
		},
		'B-LS-1': {
			group: 2,
			positions: [1, 2],
			round: 'LS'
		},
		'B-LS-2': {
			group: 2,
			positions: [3, 4],
			round: 'LS'
		}
	};
	Object.keys(data.doubleMatches)
		.forEach(matchId => {
			const match = data.doubleMatches[matchId];
			console.log(`Processing double match ${matchId}:`, match);
			if (match && matchToHtmlMapping[matchId]) {
				const mapping = matchToHtmlMapping[matchId];
				const round = mapping.round || 'UQ';
				if (match.team1) {
					const team1 = teams.find(t => t.name === match.team1);
					const htmlId =
						`Group${mapping.group}Team${mapping.positions[0]}${round}`;
					const el = document.getElementById(htmlId);
					console.log(
						`Looking for element: ${htmlId}, found: ${!!el}`
					);
					if (el) {
						const logoEl = el.querySelector('.team-logo');
						if (logoEl && team1?.logo) {
							logoEl.style.backgroundImage =
								`url(${resolveLogoPath(team1.logo)})`;
						}
						const nameEl = el.querySelector('.team-name');
						if (nameEl) {
							nameEl.textContent = match.team1;
						}
						const scoreEl = el.querySelector('.team-score');
						if (scoreEl && match.score1 !== undefined) {
							scoreEl.textContent = match.score1;
						}
					}
				}
				if (match.team2) {
					const team2 = teams.find(t => t.name === match.team2);
					const htmlId =
						`Group${mapping.group}Team${mapping.positions[1]}${round}`;
					const el = document.getElementById(htmlId);
					console.log(
						`Looking for element: ${htmlId}, found: ${!!el}`
					);
					if (el) {
						const logoEl = el.querySelector('.team-logo');
						if (logoEl && team2?.logo) {
							logoEl.style.backgroundImage =
								`url(${resolveLogoPath(team2.logo)})`;
						}
						const nameEl = el.querySelector('.team-name');
						if (nameEl) {
							nameEl.textContent = match.team2;
						}
						const scoreEl = el.querySelector('.team-score');
						if (scoreEl && match.score2 !== undefined) {
							scoreEl.textContent = match.score2;
						}
					}
				}
			}
		});
	if (data.DE?.qualified) {
		if (data.DE.qualified.A?.upper) {
			data.DE.qualified.A.upper.forEach((teamName, index) => {
				if (index < 4) {
					const team = teams.find(t => t.name === teamName);
					const el = document.getElementById(
						`Group1Qualified${index + 1}`);
					if (el && team?.logo) {
						el.style.backgroundImage =
							`url(${resolveLogoPath(team.logo)})`;
					}
				}
			});
		}
		if (data.DE.qualified.B?.upper) {
			data.DE.qualified.B.upper.forEach((teamName, index) => {
				if (index < 4) {
					const team = teams.find(t => t.name === teamName);
					const el = document.getElementById(
						`Group2Qualified${index + 1}`);
					if (el && team?.logo) {
						el.style.backgroundImage =
							`url(${resolveLogoPath(team.logo)})`;
					}
				}
			});
		}
	}
	console.log("=== END DOUBLE BRACKET UPDATE ===");
}

function updateSingleBracket(data) {
	console.log("=== UPDATE SINGLE BRACKET ===");
	document.querySelectorAll('#SingleBracketStuff .team-logos').forEach(el => {
		el.style.backgroundImage = "";
	});
	document.querySelectorAll('#SingleBracketStuff .team-names').forEach(el => {
		el.textContent = "";
	});
	document.querySelectorAll('#SingleBracketStuff .team-scores').forEach(el => {
		el.textContent = "";
	});
	console.log("Data received:", data);
	if (!data || !data.singleMatches) {
		console.log("No single elimination data found");
		return;
	}
	const teams = data.teams || [];
	console.log("Available teams:", teams.map(t => t.name));
	console.log("Single matches:", data.singleMatches);
	const possibleIds = [
		'SingleTeam1', 'SingleTeam2', 'SingleTeam3', 'SingleTeam4', 'Quarter1Team1', 'Quarter1Team2', 'Quarter2Team1', 'Quarter2Team2', 'Semi1Team1', 'Semi1Team2', 'Semi2Team1', 'Semi2Team2', 'Final1Team1', 'Final1Team2', 'FinalTeam1', 'FinalTeam2', 'ChampionTeam1', 'Winner'
	];
	console.log("=== CHECKING POSSIBLE SINGLE BRACKET IDS ===");
	possibleIds.forEach(id => {
		const el = document.getElementById(id);
		console.log(`${id}: ${!!el}`);
	});
	const singleMatchMappings = {
		's1-1': ['Team1Q', 'Team2Q'],
		's1-2': ['Team3Q', 'Team4Q'],
		's1-3': ['Team5Q', 'Team6Q'],
		's1-4': ['Team7Q', 'Team8Q'],
		's2-1': ['Team1S', 'Team2S'],
		's2-2': ['Team3S', 'Team4S'],
		's3-1': ['Team1GF', 'Team2GF']
	};
	Object.keys(data.singleMatches)
		.forEach(matchId => {
			const match = data.singleMatches[matchId];
			console.log(`Processing single match ${matchId}:`, match);
			if (match && singleMatchMappings[matchId]) {
				const htmlIds = singleMatchMappings[matchId];
				if (match.team1) {
					const team1 = teams.find(t => t.name === match.team1);
					const el = document.getElementById(htmlIds[0]);
					console.log(
						`Looking for element: ${htmlIds[0]}, found: ${!!el}`
					);
					if (el) {
						const logoEl = el.querySelector('.team-logos');
						if (logoEl && team1?.logo) {
							logoEl.style.backgroundImage =
								`url(${resolveLogoPath(team1.logo)})`;
						}
						const nameEl = el.querySelector('.team-names');
						if (nameEl) {
							nameEl.textContent = match.team1;
						}
						const scoreEl = el.querySelector('.team-scores');
						if (scoreEl && match.score1 !== undefined) {
							scoreEl.textContent = match.score1;
						}
					}
				}
				if (match.team2) {
					const team2 = teams.find(t => t.name === match.team2);
					const el = document.getElementById(htmlIds[1]);
					console.log(
						`Looking for element: ${htmlIds[1]}, found: ${!!el}`
					);
					if (el) {
						const logoEl = el.querySelector('.team-logos');
						if (logoEl && team2?.logo) {
							logoEl.style.backgroundImage =
								`url(${resolveLogoPath(team2.logo)})`;
						}
						const nameEl = el.querySelector('.team-names');
						if (nameEl) {
							nameEl.textContent = match.team2;
						}
						const scoreEl = el.querySelector('.team-scores');
						if (scoreEl && match.score2 !== undefined) {
							scoreEl.textContent = match.score2;
						}
					}
				}
			}
		});
	const finalMatch = data.singleMatches['s3-1'];
	if (finalMatch?.winner) {
		const champion = teams.find(t => t.name === finalMatch.winner);
		const championEl = document.getElementById('Winner') || document
			.getElementById('Champion');
		if (championEl) {
			const logoEl = championEl.querySelector('.team-logos');
			if (logoEl && champion?.logo) {
				logoEl.style.backgroundImage =
					`url(${resolveLogoPath(champion.logo)})`;
			}
			const nameEl = championEl.querySelector('.team-names') ||
				championEl;
			if (nameEl) {
				nameEl.textContent = champion?.name || "";
			}
			const scoreEl = championEl.querySelector('.team-scores');
			if (scoreEl) {
				scoreEl.textContent = "";
			}
		}
	}
}
let currentVisibleBracket = null;

function showBracket(which) {
	console.log(`Showing bracket: ${which}`);
	const swissEl = document.getElementById("SwissBracketStuff");
	const doubleEl = document.getElementById("DoubleBracketStuff");
	const singleEl = document.getElementById("SingleBracketStuff");
	console.log("Bracket elements exist:", {
		swiss: !!swissEl,
		double: !!doubleEl,
		single: !!singleEl
	});
	if (swissEl) swissEl.style.visibility = "hidden";
	if (doubleEl) doubleEl.style.visibility = "hidden";
	if (singleEl) singleEl.style.visibility = "hidden";
	if (which === "swiss" && swissEl) {
		swissEl.style.visibility = "visible";
	} else if (which === "double" && doubleEl) {
		doubleEl.style.visibility = "visible";
	} else if (which === "single" && singleEl) {
		singleEl.style.visibility = "visible";
	}
}
async function fetchViewAndShow() {
	try {
		const res = await fetch("/api/view");
		const {
			visible
		} = await res.json();
		console.log("Fetched visible bracket:", visible);
		if (visible && visible !== currentVisibleBracket) {
			currentVisibleBracket = visible;
			showBracket(visible);
		}
	} catch (e) {
		console.warn("Could not fetch view state", e);
	}
}
async function loadSettings() {
	try {
		const res = await fetch("/api/settings");
		const settings = await res.json();
		const bgEl = document.getElementById("Background");
		if (bgEl) {
			if ("headerImage" in settings) {
				if (settings.headerImage) {
					bgEl.style.backgroundImage =
						`url('Assets/${settings.headerImage}')`;
				} else {
					bgEl.style.backgroundImage = "";
				}
			}
		}
		const titleTopEl = document.getElementById("TitleTop");
		const titleBottomEl = document.getElementById("TitleBottom");
		if (titleTopEl && "titleTop" in settings) {
			titleTopEl.textContent = settings.titleTop ?? "";
		}
		if (titleBottomEl && "titleBottom" in settings) {
			titleBottomEl.textContent = settings.titleBottom ?? "";
		}
		if (titleTopEl && "headerTextColor" in settings && settings
			.headerTextColor) {
			titleTopEl.style.color = settings.headerTextColor;
		}
		if (titleBottomEl && "primaryColor" in settings && settings
			.primaryColor) {
			titleBottomEl.style.color = settings.primaryColor;
		}
	} catch (e) {
		console.warn("Could not load settings", e);
	}
}

function resolveLogoPath(logo) {
	if (!logo) return "";
	const s = String(logo);
	if (s.startsWith("data:") || s.startsWith("http")) return s;
	if (s.startsWith("/")) return s;
	return `/Assets/${s}`;
}
document.addEventListener("DOMContentLoaded", () => {
	console.log("BracketScript.js loaded");
	fetchViewAndShow();
	loadSettings();
	setInterval(fetchViewAndShow, 1000);
	setInterval(loadSettings, 5000);
});