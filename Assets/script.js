let teams = [];
let swissMatches = {};
let doubleMatches = {};
let singleMatches = {};
let teamRecords = {};
let currentLogoPreview = null;
let currentTab = 'swiss';
let currentMatchForScore = null;

const roundStructure = {
	'0-0': 8,
	'1-0': 4,
	'0-1': 4,
	'2-0': 2,
	'1-1': 4,
	'0-2': 2,
	'2-1': 3,
	'1-2': 3,
	'2-2': 3
};

const SE = {
	selected: new Set(),

	getEligibleTeams() {
		try {
			return teams.filter(t => t && t.name);
		} catch (e) {
			return [];
		}
	},

	clearMatches() {
		if (typeof singleMatches !== 'object') return;
		Object.keys(singleMatches).forEach(k => {
			if (/^s[123]-\d+$/.test(k)) delete singleMatches[k];
		});
	}
};

const DE = {
	selected: new Set(),
	qualified: {
		A: {
			upper: [],
			lower: []
		},
		B: {
			upper: [],
			lower: []
		}
	},

	getEligibleTeams() {
		try {
			return teams.filter(t => (t.wins >= 3) || (t.wins === 0 && t.losses === 0));
		} catch (e) {
			return [];
		}
	},

	clearMatches() {
		if (typeof doubleMatches !== 'object') return;
		Object.keys(doubleMatches).forEach(k => {
			if (/^([AB])-(UQ|US|LQ|LS)-\d+$/.test(k)) delete doubleMatches[k];
		});
	}
};

function switchTab(tab) {
	document.querySelectorAll('.tab-content').forEach(content => {
		content.classList.remove('active');
	});

	document.querySelectorAll('.tab-button').forEach(button => {
		button.classList.remove('active');
	});

	document.getElementById(`${tab}-tab`).classList.add('active');

	event.target.classList.add('active');

	currentTab = tab;

	if (tab === 'swiss') {
		generateSwissMatches();
		updateSwissStatus();
	} else if (tab === 'double') {
		generateDoubleBracket();
		updateQualifiedCount();
	} else if (tab === 'single') {
		generateSingleBracket();
	} else if (tab === 'settings') {}
}

function initializeTournament() {
	const sampleTeams = [
		'Exiled Kingz', 'Dahlia Blossoms', 'Torrent Zero', 'AbyssRL', 'Placeholder', 'Team Echelon',
		'Iconic', 'Bonne Nuit', 'A.D.A', 'Red 3!', 'Mizzou Club Gold',
		'Master Ready', 'Low Taper Team', 'Torrent Surge', 'Los Diablo', 'Chills'
	];

	sampleTeams.forEach(name => {
		teams.push({
			name: name,
			logo: generateDefaultLogo(name),
			wins: 0,
			losses: 0
		});
		teamRecords[name] = {
			wins: 0,
			losses: 0
		};
	});

	updateTeamList();
	generateSwissMatches();
	generateDoubleBracket();
	generateSingleBracket();
	updateSwissStatus();
}

function generateDefaultLogo(teamName) {
	const canvas = document.createElement('canvas');
	canvas.width = 80;
	canvas.height = 80;
	const ctx = canvas.getContext('2d');

	const colors = ['#667eea', '#48bb78', '#ed8936', '#38b2ac', '#805ad5', '#e53e3e'];
	const color = colors[teamName.charCodeAt(0) % colors.length];

	ctx.fillStyle = color;
	ctx.fillRect(0, 0, 80, 80);
	ctx.fillStyle = 'white';
	ctx.font = 'bold 32px Arial';
	ctx.textAlign = 'center';
	ctx.fillText(teamName.charAt(0), 40, 52);

	return canvas.toDataURL();
}

async function previewLogo(input) {
	if (input.files && input.files[0]) {
		const formData = new FormData();
		formData.append("logo", input.files[0]);

		const res = await fetch("/api/upload-logo", {
			method: "POST",
			body: formData
		});

		if (res.ok) {
			const data = await res.json();
			currentLogoPreview = data.url;
			const button = document.getElementById("logoUploadButton");
			button.innerHTML = `<img src="${data.url}" class="logo-preview" alt="Logo preview">`;
		} else {
			showToast("Failed to upload logo.");
		}
	}
}

function addTeam() {
	const input = document.getElementById('newTeamName');
	const teamName = input.value.trim();

	if (teamName && !teams.find(team => team.name === teamName)) {
		const newTeam = {
			name: teamName,
			logo: currentLogoPreview || generateDefaultLogo(teamName),
			wins: 0,
			losses: 0
		};

		teams.push(newTeam);
		teamRecords[teamName] = {
			wins: 0,
			losses: 0
		};
		ensureTeamLogos();

		input.value = '';
		currentLogoPreview = null;
		document.getElementById('logoUploadButton').innerHTML = '<span>📷</span>';
		document.getElementById('logoUpload').value = '';

		updateTeamList();

		if (currentTab === 'swiss') {
			generateSwissMatches();
			updateSwissStatus();
		} else if (currentTab === 'double') {
			generateDoubleBracket();
			updateQualifiedCount();
		} else if (currentTab === 'single') {
			generateSingleBracket();
		}
	} else if (teams.find(team => team.name === teamName)) {
		showToast("Team already exists.");
	}
}

function removeTeam(index) {
	const teamName = teams[index].name;
	delete teamRecords[teamName];
	teams.splice(index, 1);
	updateTeamList();

	if (currentTab === 'swiss') {
		generateSwissMatches();
		updateSwissStatus();
	} else if (currentTab === 'double') {
		generateDoubleBracket();
		updateQualifiedCount();
	} else if (currentTab === 'single') {
		generateSingleBracket();
	}
}

function updateTeamList() {
	ensureTeamLogos();
	const teamList = document.getElementById('teamList');
	teamList.innerHTML = '';

	teams.forEach((team, index) => {
		const teamItem = document.createElement('div');
		teamItem.className = 'team-item';

		if (team.losses >= 3) {
			teamItem.classList.add('eliminated');
		} else if (team.wins >= 3) {
			teamItem.classList.add('qualified');
		}

		teamItem.innerHTML = `
            <img src="${resolveLogoPath(team.logo)}" class="team-logo-list" alt="${team.name} logo" onclick="editTeamLogo(${index})" style="cursor: pointer;" title="Click to change logo">
            <div class="team-info">
                <input type="text" value="${team.name}" class="team-name-edit" id="team-name-${index}" 
                       onchange="updateTeamName(${index}, this.value)" 
                       onblur="this.style.background = 'transparent'; this.style.border = 'none'"
                       onfocus="this.style.background = 'white'; this.style.border = '1px solid #667eea'"
                       title="Click to edit team name">
                <div class="team-status" style="font-size: 0.85rem; color: #718096;">
                    W: ${team.wins} | L: ${team.losses} 
                    ${team.losses >= 3 ? '(Eliminated)' : team.wins >= 3 ? '(Qualified)' : ''}
                </div>
            </div>
            <div class="team-actions">
                <button onclick="editTeamLogo(${index})" class="btn-small btn-edit">Edit Logo</button>
                <button onclick="removeTeam(${index})" class="btn-small btn-remove">Remove</button>
            </div>
        `;
		teamList.appendChild(teamItem);
	});
}

function updateSwissStatus() {
	const statusElement = document.getElementById('swiss-status');
	const qualifiedTeams = teams.filter(team => team.wins >= 3).length;
	const eliminatedTeams = teams.filter(team => team.losses >= 3).length;

	if (qualifiedTeams >= 8 && eliminatedTeams >= 8) {
		statusElement.textContent = 'Tournament Complete - Ready for Double Elimination';
	} else if (qualifiedTeams > 0 || eliminatedTeams > 0) {
		statusElement.textContent = `In Progress - ${qualifiedTeams} qualified, ${eliminatedTeams} eliminated`;
	} else {
		statusElement.textContent = 'Ready to start';
	}
}

function updateQualifiedCount() {
	const total =
		(DE.qualified.A.upper.length + DE.qualified.A.lower.length) +
		(DE.qualified.B.upper.length + DE.qualified.B.lower.length);
	const el = document.getElementById('qualified-count');
	if (el) el.textContent = String(total);
}

function generateSwissMatches() {
	Object.keys(roundStructure).forEach(round => {
		const container = document.getElementById(`round-${round}-matches`);
		if (container) container.innerHTML = '';
	});

	Object.keys(roundStructure).forEach(round => {
		const expectedMatches = roundStructure[round];
		generateMatchesForRound(round, expectedMatches);
	});
}

function getUsedTeamsInRound(round) {
	const usedTeams = new Set();
	const matchesToCheck = roundStructure[round] || 0;

	for (let i = 0; i < matchesToCheck; i++) {
		const matchId = `${round}-${i + 1}`;
		const existingMatch = swissMatches[matchId];

		if (existingMatch) {
			if (existingMatch.team1) usedTeams.add(existingMatch.team1);
			if (existingMatch.team2) usedTeams.add(existingMatch.team2);
		} else {
			const team1Select = document.getElementById(`team1-${matchId}`);
			const team2Select = document.getElementById(`team2-${matchId}`);

			if (team1Select && team1Select.value) {
				usedTeams.add(team1Select.value);
			}
			if (team2Select && team2Select.value) {
				usedTeams.add(team2Select.value);
			}
		}
	}

	return usedTeams;
}

function generateMatchesForRound(round, matchCount) {
	const container = document.getElementById(`round-${round}-matches`);
	if (!container) return;

	container.innerHTML = "";

	const matchesToGenerate = roundStructure[round] || matchCount;

	for (let i = 0; i < matchesToGenerate; i++) {
		const matchId = `${round}-${i + 1}`;
		const existingMatch = swissMatches[matchId];

		const matchDiv = document.createElement("div");
		matchDiv.className = "match";
		matchDiv.id = `match-${matchId}`;

		if (existingMatch) {
			const team1 = teams.find(t => t.name === existingMatch.team1);
			const team2 = teams.find(t => t.name === existingMatch.team2);

			matchDiv.innerHTML = `
        <div class="match-header">
          <span class="match-number">Match ${i + 1}</span>
          <div class="match-status ${existingMatch.winner ? "completed" : "pending"}"
               id="status-${matchId}">
            ${existingMatch.winner ? "Complete" : "Pending"}
          </div>
        </div>
        <div class="team-vs-container">
          ${renderTeamCard(matchId, team1, "team1", existingMatch)}
          <div class="vs-label">VS</div>
          ${renderTeamCard(matchId, team2, "team2", existingMatch)}
        </div>
      `;
		} else {
			const usedTeams = getUsedTeamsInRound(round);
			const availableTeams = teams.filter(team => !usedTeams.has(team.name));

			matchDiv.innerHTML = `
        <div class="match-header">
          <span class="match-number">Match ${i + 1}</span>
          <div class="match-status pending" id="status-${matchId}">Pending</div>
        </div>
        <div class="team-vs-container">
          <div class="team-card">
            <select class="team-select" id="team1-${matchId}" onchange="updateSwissMatch('${matchId}'); updateRoundDropdowns('${round}')">
              <option value="">Select Team 1</option>
              ${availableTeams.map(t => `<option value="${t.name}">${t.name}</option>`).join("")}
            </select>
          </div>
          <div class="vs-label">VS</div>
          <div class="team-card">
            <select class="team-select" id="team2-${matchId}" onchange="updateSwissMatch('${matchId}'); updateRoundDropdowns('${round}')">
              <option value="">Select Team 2</option>
              ${availableTeams.map(t => `<option value="${t.name}">${t.name}</option>`).join("")}
            </select>
          </div>
        </div>
      `;
		}

		container.appendChild(matchDiv);
	}
}

function updateRoundDropdowns(round) {
	const usedTeams = getUsedTeamsInRound(round);
	const matchesToUpdate = roundStructure[round] || 0;

	for (let i = 0; i < matchesToUpdate; i++) {
		const matchId = `${round}-${i + 1}`;

		if (swissMatches[matchId]) continue;

		const team1Select = document.getElementById(`team1-${matchId}`);
		const team2Select = document.getElementById(`team2-${matchId}`);

		if (team1Select) {
			const currentValue = team1Select.value;
			const availableTeams = teams.filter(team =>
				!usedTeams.has(team.name) || team.name === currentValue
			);

			team1Select.innerHTML = `
                <option value="">Select Team 1</option>
                ${availableTeams.map(t => 
                    `<option value="${t.name}" ${t.name === currentValue ? 'selected' : ''}>${t.name}</option>`
                ).join("")}
            `;
		}

		if (team2Select) {
			const currentValue = team2Select.value;
			const availableTeams = teams.filter(team =>
				!usedTeams.has(team.name) || team.name === currentValue
			);

			team2Select.innerHTML = `
                <option value="">Select Team 2</option>
                ${availableTeams.map(t => 
                    `<option value="${t.name}" ${t.name === currentValue ? 'selected' : ''}>${t.name}</option>`
                ).join("")}
            `;
		}
	}
}

function renderTeamCard(matchId, team, pos, match) {
	if (!team) return `<div class="team-card">TBD</div>`;
	return `
    <div class="team-card ${match.winner === team.name ? "winner" : match.loser === team.name ? "loser" : ""}"
         onclick="selectSwissWinner('${matchId}', '${team.name}')">
      <img src="${resolveLogoPath(team.logo)}" class="team-logo" alt="${team.name} logo" style="width:40px; height:40px;">
      <span>${team.name}</span>
    </div>
  `;
}

function createSwissMatchElement(matchId, round, matchNumber) {
	const matchDiv = document.createElement('div');
	matchDiv.className = 'match';
	matchDiv.id = `match-${matchId}`;

	const existingMatch = swissMatches[matchId];

	matchDiv.innerHTML = `
        <div class="match-header">
            <span class="match-number">Match ${matchNumber}</span>
            <div class="match-status ${existingMatch?.winner ? 'completed' : 'pending'}" id="status-${matchId}">
                ${existingMatch?.winner ? 'Complete' : 'Pending'}
            </div>
        </div>
        <div class="team-vs-container">
            <div class="team-card">
                <select class="team-select" id="team1-${matchId}" onchange="updateSwissMatch('${matchId}')">
                    <option value="">Select Team 1</option>
                    ${teams.map(team => `<option value="${team.name}" ${existingMatch?.team1 === team.name ? 'selected' : ''}>${team.name}</option>`).join('')}
                </select>
            </div>
            <div class="vs-label">VS</div>
            <div class="team-card">
                <select class="team-select" id="team2-${matchId}" onchange="updateSwissMatch('${matchId}')">
                    <option value="">Select Team 2</option>
                    ${teams.map(team => `<option value="${team.name}" ${existingMatch?.team2 === team.name ? 'selected' : ''}>${team.name}</option>`).join('')}
                </select>
            </div>
        </div>
    `;

	return matchDiv;
}

function updateSwissMatch(matchId) {
	const team1Select = document.getElementById(`team1-${matchId}`);
	const team2Select = document.getElementById(`team2-${matchId}`);

	if (team1Select.value && team2Select.value && team1Select.value !== team2Select.value) {
		swissMatches[matchId] = {
			team1: team1Select.value,
			team2: team2Select.value,
			winner: null,
			loser: null
		};

		const matchElement = document.getElementById(`match-${matchId}`);
		const team1 = teams.find(t => t.name === team1Select.value);
		const team2 = teams.find(t => t.name === team2Select.value);

		matchElement.innerHTML = `
            <div class="match-header">
                <span class="match-number">${matchElement.querySelector('.match-number').textContent}</span>
                <div class="match-status pending" id="status-${matchId}">Pending</div>
            </div>
            <div class="team-vs-container">
                <div class="team-card" onclick="selectSwissWinner('${matchId}', '${team1.name}')" style="cursor: pointer;">
                    <img src="${resolveLogoPath(team1.logo)}" class="team-logo" alt="${team1.name} logo" style="width: 40px; height: 40px;">
                    <span>${team1.name}</span>
                </div>
                <div class="vs-label">VS</div>
                <div class="team-card" onclick="selectSwissWinner('${matchId}', '${team2.name}')" style="cursor: pointer;">
                    <img src="${resolveLogoPath(team2.logo)}" class="team-logo" alt="${team2.name} logo" style="width: 40px; height: 40px;">
                    <span>${team2.name}</span>
                </div>
            </div>
        `;
	}
}

function selectSwissWinner(matchId, winnerName) {
	const match = swissMatches[matchId];
	if (!match || match.winner || !winnerName) return;

	const loserName = match.team1 === winnerName ? match.team2 : match.team1;

	swissMatches[matchId].winner = winnerName;
	swissMatches[matchId].loser = loserName;

	if (teamRecords[winnerName]) {
		teamRecords[winnerName].wins++;
	}
	if (teamRecords[loserName]) {
		teamRecords[loserName].losses++;
	}

	const winnerTeam = teams.find(t => t.name === winnerName);
	const loserTeam = teams.find(t => t.name === loserName);
	if (winnerTeam) winnerTeam.wins++;
	if (loserTeam) loserTeam.losses++;

	updateSwissMatchDisplay(matchId);
	updateTeamList();
	updateSwissStatus();
}

function updateSwissMatchDisplay(matchId) {
	const matchElement = document.getElementById(`match-${matchId}`);
	const statusElement = document.getElementById(`status-${matchId}`);
	const match = swissMatches[matchId];

	if (matchElement && match && match.winner) {
		matchElement.classList.add('completed');
		statusElement.textContent = 'Complete';
		statusElement.classList.add('completed');

		const teamCards = matchElement.querySelectorAll('.team-card');
		teamCards.forEach(card => {
			const teamSpan = card.querySelector('span');
			const teamName = teamSpan ? teamSpan.textContent.trim() : '';

			card.classList.remove('winner', 'loser');

			if (teamName === match.winner) {
				card.classList.add('winner');
			} else if (teamName === match.loser) {
				card.classList.add('loser');
			}
		});
	}
}

function generateDoubleBracket() {
	const eligible = DE.getEligibleTeams();
	const totalQ =
		(DE.qualified.A.upper.length + DE.qualified.A.lower.length) +
		(DE.qualified.B.upper.length + DE.qualified.B.lower.length);
	const totalSpan = document.getElementById('qualified-count');
	if (totalSpan) totalSpan.textContent = String(totalQ);

	['A', 'B'].forEach(group => {
		['UQ', 'US', 'LQ', 'LS'].forEach(round => {
			const cont = document.getElementById(`${group}-${round}`);
			if (!cont) return;
			cont.innerHTML = '';
			const count = (round === 'UQ') ? 4 : 2;

			for (let i = 1; i <= count; i++) {
				const id = `${group}-${round}-${i}`;
				const match = doubleMatches[id] || {
					team1: null,
					team2: null,
					winner: null,
					loser: null,
					score1: null,
					score2: null
				};
				doubleMatches[id] = match;

				const matchDiv = document.createElement('div');
				matchDiv.className = `bracket-match ${match.winner ? 'completed' : ''}`;
				matchDiv.id = `double-match-${id}`;

				if (round === 'UQ') {
					['team1', 'team2'].forEach(pos => {
						const cell = document.createElement('div');
						cell.className = 'bracket-team';

						if (!match[pos]) {
							const sel = document.createElement('select');
							sel.className = 'team-select';
							sel.style.width = '100%';
							sel.style.padding = '4px';

							const blank = document.createElement('option');
							blank.value = '';
							blank.textContent = 'Select team...';
							sel.appendChild(blank);

							eligible.map(t => t.name).filter(n => !DE.selected.has(n)).forEach(n => {
								const o = document.createElement('option');
								o.value = n;
								o.textContent = n;
								sel.appendChild(o);
							});

							sel.addEventListener('change', (e) => {
								const name = e.target.value;
								if (!name) return;
								match[pos] = name;
								DE.selected.add(name);
								generateDoubleBracket();
							});

							cell.appendChild(sel);
						} else {
							const team = teams.find(t => t.name === match[pos]);
							if (team) {
								cell.innerHTML = `
                                    <div class="team-info">
                                        <img src="${resolveLogoPath(team.logo)}" class="team-logo" alt="${team.name}">
                                        <span class="team-name">${team.name}</span>
                                    </div>
                                    <span class="score">${pos === 'team1' ? (match.score1 ?? '') : (match.score2 ?? '')}</span>
                                `;
							} else {
								cell.innerHTML = `<span class="team-name">${match[pos]}</span>`;
							}
							if (match.winner === match[pos]) cell.classList.add('winner');
							else if (match.loser === match[pos]) cell.classList.add('loser');
						}

						matchDiv.appendChild(cell);
					});

					if (match.team1 && match.team2) {
						matchDiv.style.cursor = 'pointer';
						matchDiv.setAttribute('onclick', `openScoreModal('double', '${id}')`);
					}
				} else {
					['team1', 'team2'].forEach(pos => {
						const cell = document.createElement('div');
						cell.className = 'bracket-team';
						const teamName = match[pos] || 'TBD';
						const team = teams.find(t => t.name === teamName);
						const score = pos === 'team1' ? match.score1 : match.score2;

						if (team) {
							cell.innerHTML = `
                                <div class="team-info">
                                    <img src="${resolveLogoPath(team.logo)}" class="team-logo" alt="${team.name}">
                                    <span class="team-name">${team.name}</span>
                                </div>
                                <span class="score">${score ?? ''}</span>
                            `;
						} else {
							cell.innerHTML = `
                                <div class="team-info">
                                    <span class="team-name">${teamName}</span>
                                </div>
                                <span class="score">${score ?? ''}</span>
                            `;
						}

						if (match.winner === teamName) cell.classList.add('winner');
						else if (match.loser === teamName) cell.classList.add('loser');

						matchDiv.appendChild(cell);
					});

					if (match.team1 && match.team2 && match.team1 !== 'TBD' && match.team2 !== 'TBD') {
						matchDiv.style.cursor = 'pointer';
						matchDiv.setAttribute('onclick', `openScoreModal('double', '${id}')`);
					}
				}

				cont.appendChild(matchDiv);
			}
		});

		const qContainer = document.getElementById(`${group}-Q`);
		if (qContainer) {
			qContainer.innerHTML = '';
			DE.qualified[group].upper.forEach(teamName => {
				const team = teams.find(t => t.name === teamName);
				const qualDiv = document.createElement('div');
				qualDiv.className = 'bracket-match completed';
				qualDiv.innerHTML = `
                    <div class="bracket-team winner">
                        <div class="team-info">
                            ${team ? `<img src="${resolveLogoPath(team.logo)}" class="team-logo" alt="${team.name}">` : ''}
                            <span class="team-name">${teamName}</span>
                        </div>
                        <span class="score">✓</span>
                    </div>
                `;
				qContainer.appendChild(qualDiv);
			});
		}

		const lqfContainer = document.getElementById(`${group}-LQF`);
		if (lqfContainer) {
			lqfContainer.innerHTML = '';
			DE.qualified[group].lower.forEach(teamName => {
				const team = teams.find(t => t.name === teamName);
				const qualDiv = document.createElement('div');
				qualDiv.className = 'bracket-match completed';
				qualDiv.innerHTML = `
                    <div class="bracket-team winner">
                        <div class="team-info">
                            ${team ? `<img src="${resolveLogoPath(team.logo)}" class="team-logo" alt="${team.name}">` : ''}
                            <span class="team-name">${teamName}</span>
                        </div>
                        <span class="score">✓</span>
                    </div>
                `;
				lqfContainer.appendChild(qualDiv);
			});
		}
	});
}

function advanceDoubleTeams(matchId, winnerName, loserName) {
	const parts = matchId.split('-');
	const group = parts[0],
		round = parts[1],
		idx = parseInt(parts[2]);

	const putInto = (targetId, teamName) => {
		const m = doubleMatches[targetId] || (doubleMatches[targetId] = {
			team1: null,
			team2: null,
			winner: null,
			loser: null,
			score1: null,
			score2: null
		});
		if (!m.team1) m.team1 = teamName;
		else if (!m.team2) m.team2 = teamName;
	};

	if (round === 'UQ') {
		const usIdx = Math.ceil(idx / 2);
		putInto(`${group}-US-${usIdx}`, winnerName);
		const lqIdx = Math.ceil(idx / 2);
		putInto(`${group}-LQ-${lqIdx}`, loserName);
	} else if (round === 'US') {
		if (!DE.qualified[group].upper.includes(winnerName)) {
			DE.qualified[group].upper.push(winnerName);
		}
		const lsIdx = idx;
		putInto(`${group}-LS-${lsIdx}`, loserName);
	} else if (round === 'LQ') {
		const lsIdx = idx;
		putInto(`${group}-LS-${lsIdx}`, winnerName);
	} else if (round === 'LS') {
		if (!DE.qualified[group].lower.includes(winnerName)) {
			DE.qualified[group].lower.push(winnerName);
		}
	}

	updateQualifiedCount();
	generateDoubleBracket();

	const total =
		(DE.qualified.A.upper.length + DE.qualified.A.lower.length) +
		(DE.qualified.B.upper.length + DE.qualified.B.lower.length);
	if (total >= 8) {
		const all = [...DE.qualified.A.upper, ...DE.qualified.A.lower, ...DE.qualified.B.upper, ...DE.qualified.B.lower];
		seedSingleElimFromDouble(all);
	}
}

function generateSingleBracket() {
	const eligible = SE.getEligibleTeams();

	['single-quarterfinals', 'single-semifinals', 'single-final', 'single-champion'].forEach(id => {
		const container = document.getElementById(id);
		if (container) container.innerHTML = '';
	});

	const quarterContainer = document.getElementById('single-quarterfinals');
	if (quarterContainer) {
		for (let i = 1; i <= 4; i++) {
			const id = `s1-${i}`;
			const match = singleMatches[id] || {
				team1: null,
				team2: null,
				winner: null,
				loser: null,
				score1: null,
				score2: null
			};
			singleMatches[id] = match;

			const matchDiv = document.createElement('div');
			matchDiv.className = `bracket-match ${match.winner ? 'completed' : ''}`;
			matchDiv.id = `single-match-${id}`;

			['team1', 'team2'].forEach(pos => {
				const cell = document.createElement('div');
				cell.className = 'bracket-team';

				if (!match[pos]) {
					const sel = document.createElement('select');
					sel.className = 'team-select';
					sel.style.width = '100%';
					sel.style.padding = '4px';

					const blank = document.createElement('option');
					blank.value = '';
					blank.textContent = 'Select team...';
					sel.appendChild(blank);

					eligible.map(t => t.name).filter(n => !SE.selected.has(n)).forEach(n => {
						const o = document.createElement('option');
						o.value = n;
						o.textContent = n;
						sel.appendChild(o);
					});

					sel.addEventListener('change', (e) => {
						const name = e.target.value;
						if (!name) return;
						match[pos] = name;
						SE.selected.add(name);
						generateSingleBracket();
					});

					cell.appendChild(sel);
				} else {
					const team = teams.find(t => t.name === match[pos]);
					if (team) {
						cell.innerHTML = `
                            <div class="team-info">
                                <img src="${resolveLogoPath(team.logo)}" class="team-logo" alt="${team.name}">
                                <span class="team-name">${team.name}</span>
                            </div>
                            <span class="score">${pos === 'team1' ? (match.score1 ?? '') : (match.score2 ?? '')}</span>
                        `;
					} else {
						cell.innerHTML = `<span class="team-name">${match[pos]}</span>`;
					}
					if (match.winner === match[pos]) cell.classList.add('winner');
					else if (match.loser === match[pos]) cell.classList.add('loser');
				}

				matchDiv.appendChild(cell);
			});

			if (match.team1 && match.team2) {
				matchDiv.style.cursor = 'pointer';
				matchDiv.setAttribute('onclick', `openScoreModal('single', '${id}')`);
			}

			quarterContainer.appendChild(matchDiv);
		}
	}

	const semiContainer = document.getElementById('single-semifinals');
	if (semiContainer) {
		for (let i = 1; i <= 2; i++) {
			const id = `s2-${i}`;
			const match = singleMatches[id] || {
				team1: null,
				team2: null,
				winner: null,
				loser: null,
				score1: null,
				score2: null
			};
			singleMatches[id] = match;

			const matchDiv = document.createElement('div');
			matchDiv.className = `bracket-match ${match.winner ? 'completed' : ''}`;
			matchDiv.id = `single-match-${id}`;

			['team1', 'team2'].forEach(pos => {
				const cell = document.createElement('div');
				cell.className = 'bracket-team';
				const teamName = match[pos] || 'TBD';
				const team = teams.find(t => t.name === teamName);
				const score = pos === 'team1' ? match.score1 : match.score2;

				if (team) {
					cell.innerHTML = `
                        <div class="team-info">
                            <img src="${resolveLogoPath(team.logo)}" class="team-logo" alt="${team.name}">
                            <span class="team-name">${team.name}</span>
                        </div>
                        <span class="score">${score ?? ''}</span>
                    `;
				} else {
					cell.innerHTML = `
                        <div class="team-info">
                            <span class="team-name">${teamName}</span>
                        </div>
                        <span class="score">${score ?? ''}</span>
                    `;
				}

				if (match.winner === teamName) cell.classList.add('winner');
				else if (match.loser === teamName) cell.classList.add('loser');

				matchDiv.appendChild(cell);
			});

			if (match.team1 && match.team2 && match.team1 !== 'TBD' && match.team2 !== 'TBD') {
				matchDiv.style.cursor = 'pointer';
				matchDiv.setAttribute('onclick', `openScoreModal('single', '${id}')`);
			}

			semiContainer.appendChild(matchDiv);
		}
	}

	const finalContainer = document.getElementById('single-final');
	if (finalContainer) {
		const id = `s3-1`;
		const match = singleMatches[id] || {
			team1: null,
			team2: null,
			winner: null,
			loser: null,
			score1: null,
			score2: null
		};
		singleMatches[id] = match;

		const matchDiv = document.createElement('div');
		matchDiv.className = `bracket-match ${match.winner ? 'completed' : ''}`;
		matchDiv.id = `single-match-${id}`;

		['team1', 'team2'].forEach(pos => {
			const cell = document.createElement('div');
			cell.className = 'bracket-team';
			const teamName = match[pos] || 'TBD';
			const team = teams.find(t => t.name === teamName);
			const score = pos === 'team1' ? match.score1 : match.score2;

			if (team) {
				cell.innerHTML = `
                    <div class="team-info">
                        <img src="${resolveLogoPath(team.logo)}" class="team-logo" alt="${team.name}">
                        <span class="team-name">${team.name}</span>
                    </div>
                    <span class="score">${score ?? ''}</span>
                `;
			} else {
				cell.innerHTML = `
                    <div class="team-info">
                        <span class="team-name">${teamName}</span>
                    </div>
                    <span class="score">${score ?? ''}</span>
                `;
			}

			if (match.winner === teamName) cell.classList.add('winner');
			else if (match.loser === teamName) cell.classList.add('loser');

			matchDiv.appendChild(cell);
		});

		if (match.team1 && match.team2 && match.team1 !== 'TBD' && match.team2 !== 'TBD') {
			matchDiv.style.cursor = 'pointer';
			matchDiv.setAttribute('onclick', `openScoreModal('single', '${id}')`);
		}

		finalContainer.appendChild(matchDiv);
	}

	const championContainer = document.getElementById('single-champion');
	if (championContainer) {
		const finalMatch = singleMatches['s3-1'];
		const champion = finalMatch ? finalMatch.winner : null;

		const championDiv = document.createElement('div');
		championDiv.className = `bracket-match ${champion ? 'completed' : ''}`;
		championDiv.id = 'champion-display';

		if (champion) {
			const team = teams.find(t => t.name === champion);
			championDiv.innerHTML = `
                <div class="bracket-team winner" style="justify-content: center; font-size: 1.2rem;">
                    <div class="team-info">
                        ${team ? `<img src="${resolveLogoPath(team.logo)}" class="team-logo" alt="${team.name}" style="width: 40px; height: 40px;">` : ''}
                        <span class="team-name">🏆 ${champion}</span>
                    </div>
                </div>
            `;
		} else {
			championDiv.innerHTML = `
                <div class="bracket-team" style="justify-content: center; font-size: 1.2rem; color: #667eea;">
                    <span class="team-name">🏆 Winner TBD</span>
                </div>
            `;
		}

		championContainer.appendChild(championDiv);
	}
}

function advanceSingleTeam(matchId, winnerName) {
	const round = parseInt(matchId.split('-')[0].substring(1));
	const matchNum = parseInt(matchId.split('-')[1]);

	if (round === 1) {
		const semifinalMatch = Math.ceil(matchNum / 2);
		const semifinalMatchId = `s2-${semifinalMatch}`;
		const position = matchNum % 2 === 1 ? 'team1' : 'team2';

		if (!singleMatches[semifinalMatchId]) {
			singleMatches[semifinalMatchId] = {
				team1: null,
				team2: null,
				winner: null,
				loser: null,
				score1: null,
				score2: null
			};
		}
		singleMatches[semifinalMatchId][position] = winnerName;

	} else if (round === 2) {
		const finalMatchId = 's3-1';
		const position = matchNum === 1 ? 'team1' : 'team2';

		if (!singleMatches[finalMatchId]) {
			singleMatches[finalMatchId] = {
				team1: null,
				team2: null,
				winner: null,
				loser: null,
				score1: null,
				score2: null
			};
		}
		singleMatches[finalMatchId][position] = winnerName;
	}

	generateSingleBracket();
}

function seedSingleElimFromDouble(qualifiedTeams) {
	if (qualifiedTeams.length < 8) return;

	SE.selected.clear();
	SE.clearMatches();

	for (let i = 0; i < 4 && i * 2 + 1 < qualifiedTeams.length; i++) {
		const matchId = `s1-${i + 1}`;
		singleMatches[matchId] = {
			team1: qualifiedTeams[i * 2],
			team2: qualifiedTeams[i * 2 + 1],
			winner: null,
			loser: null,
			score1: null,
			score2: null
		};
		SE.selected.add(qualifiedTeams[i * 2]);
		SE.selected.add(qualifiedTeams[i * 2 + 1]);
	}

	generateSingleBracket();
	showToast('Single Elimination seeded with qualified teams from Double Elimination!');
}

function openScoreModal(tournament, matchId) {
	currentMatchForScore = {
		tournament,
		matchId
	};
	const modal = document.getElementById('scoreModal');
	const modalTeams = document.getElementById('modal-teams');

	let match;
	if (tournament === 'double') {
		match = doubleMatches[matchId];
	} else {
		match = singleMatches[matchId];
	}

	if (!match || !match.team1 || !match.team2) return;

	const team1 = teams.find(t => t.name === match.team1);
	const team2 = teams.find(t => t.name === match.team2);

	modalTeams.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div style="text-align: center;">
                <img src="${resolveLogoPath(team1.logo)}" style="width: 50px; height: 50px; border-radius: 50%; margin-bottom: 5px;">
                <div>${team1.name}</div>
            </div>
            <div style="font-size: 1.5rem; font-weight: bold;">VS</div>
            <div style="text-align: center;">
                <img src="${resolveLogoPath(team2.logo)}" style="width: 50px; height: 50px; border-radius: 50%; margin-bottom: 5px;">
                <div>${team2.name}</div>
            </div>
        </div>
    `;

	document.getElementById('score1').value = match.score1 || '';
	document.getElementById('score2').value = match.score2 || '';

	modal.style.display = 'block';
}

function closeModal() {
	document.getElementById('scoreModal').style.display = 'none';
	currentMatchForScore = null;
}

function submitScore() {
	if (!currentMatchForScore) return;

	const score1 = parseInt(document.getElementById('score1').value) || 0;
	const score2 = parseInt(document.getElementById('score2').value) || 0;

	if (score1 === score2) {
		showToast('Scores cannot be tied. Please enter different scores.');
		return;
	}

	const {
		tournament,
		matchId
	} = currentMatchForScore;
	let match;

	if (tournament === 'double') {
		match = doubleMatches[matchId];
	} else {
		match = singleMatches[matchId];
	}

	if (!match) return;

	match.score1 = score1;
	match.score2 = score2;
	match.winner = score1 > score2 ? match.team1 : match.team2;
	match.loser = score1 > score2 ? match.team2 : match.team1;

	if (tournament === 'double') {
		updateDoubleMatchDisplay(matchId);
		advanceDoubleTeams(matchId, match.winner, match.loser);
	} else {
		updateSingleMatchDisplay(matchId);
		advanceSingleTeam(matchId, match.winner);
	}

	closeModal();
}

function updateDoubleMatchDisplay(matchId) {
	const matchElement = document.getElementById(`double-match-${matchId}`);
	const match = doubleMatches[matchId];

	if (matchElement && match.winner) {
		matchElement.classList.add('completed');

		const teamElements = matchElement.querySelectorAll('.bracket-team');
		teamElements.forEach((el, index) => {
			const teamName = index === 0 ? match.team1 : match.team2;
			const score = index === 0 ? match.score1 : match.score2;

			el.classList.remove('winner', 'loser');

			if (teamName === match.winner) {
				el.classList.add('winner');
			} else if (teamName === match.loser) {
				el.classList.add('loser');
			}

			const scoreElement = el.querySelector('.score');
			if (scoreElement) {
				scoreElement.textContent = score;
			}
		});
	}
}

function updateSingleMatchDisplay(matchId) {
	const matchElement = document.getElementById(`single-match-${matchId}`);
	const match = singleMatches[matchId];

	if (matchElement && match.winner) {
		matchElement.classList.add('completed');

		const teamElements = matchElement.querySelectorAll('.bracket-team');
		teamElements.forEach((el, index) => {
			const teamName = index === 0 ? match.team1 : match.team2;
			const score = index === 0 ? match.score1 : match.score2;

			el.classList.remove('winner', 'loser');

			if (teamName === match.winner) {
				el.classList.add('winner');
			} else if (teamName === match.loser) {
				el.classList.add('loser');
			}

			const scoreElement = el.querySelector('.score');
			if (scoreElement) {
				scoreElement.textContent = score;
			}
		});
	}
}

function updateTeamName(index, newName) {
	const trimmedName = newName.trim();
	if (trimmedName && !teams.find((team, i) => team.name === trimmedName && i !== index)) {
		const oldName = teams[index].name;
		teams[index].name = trimmedName;

		if (teamRecords[oldName]) {
			teamRecords[trimmedName] = teamRecords[oldName];
			delete teamRecords[oldName];
		}

		Object.values(swissMatches).forEach(match => {
			if (match.team1 === oldName) match.team1 = trimmedName;
			if (match.team2 === oldName) match.team2 = trimmedName;
			if (match.winner === oldName) match.winner = trimmedName;
			if (match.loser === oldName) match.loser = trimmedName;
		});

		Object.values(doubleMatches).forEach(match => {
			if (match.team1 === oldName) match.team1 = trimmedName;
			if (match.team2 === oldName) match.team2 = trimmedName;
			if (match.winner === oldName) match.winner = trimmedName;
			if (match.loser === oldName) match.loser = trimmedName;
		});

		Object.values(singleMatches).forEach(match => {
			if (match.team1 === oldName) match.team1 = trimmedName;
			if (match.team2 === oldName) match.team2 = trimmedName;
			if (match.winner === oldName) match.winner = trimmedName;
			if (match.loser === oldName) match.loser = trimmedName;
		});

		if (DE.selected.has(oldName)) {
			DE.selected.delete(oldName);
			DE.selected.add(trimmedName);
		}
		if (SE.selected.has(oldName)) {
			SE.selected.delete(oldName);
			SE.selected.add(trimmedName);
		}

		['A', 'B'].forEach(group => {
			['upper', 'lower'].forEach(bracket => {
				const idx = DE.qualified[group][bracket].indexOf(oldName);
				if (idx !== -1) {
					DE.qualified[group][bracket][idx] = trimmedName;
				}
			});
		});
		updateTeamList();

		if (currentTab === 'swiss') {
			generateSwissMatches();
			updateSwissStatus();
		} else if (currentTab === 'double') {
			generateDoubleBracket();
			updateQualifiedCount();
		} else if (currentTab === 'single') {
			generateSingleBracket();
		}

		updateTeamList();
	} else {
		document.getElementById(`team-name-${index}`).value = teams[index].name;
		if (trimmedName && teams.find((team, i) => team.name === trimmedName && i !== index)) {
			showToast('Team name already exists!');
		}
	}
}

function editTeamLogo(index) {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = 'image/*';
	input.onchange = async function(e) {
		if (e.target.files && e.target.files[0]) {
			const formData = new FormData();
			formData.append("logo", e.target.files[0]);

			try {
				const res = await fetch("/api/teamlogo", {
					method: "POST",
					body: formData
				});
				const data = await res.json();
				if (data.path) {
					teams[index].logo = data.path;
					updateTeamList();

					if (currentTab === 'swiss') {
						generateSwissMatches();
						updateSwissStatus();
					} else if (currentTab === 'double') {
						generateDoubleBracket();
						updateQualifiedCount();
					} else if (currentTab === 'single') {
						generateSingleBracket();
					}
				}
			} catch (err) {
				console.error("Error uploading logo:", err);
				showToast("Error uploading logo");
			}
		}
	};
	input.click();
}

function applySettings() {
	showToast('Settings applied! (Note: This is a demo - actual styling changes would be implemented here)');
}

function resetSettings() {
	document.getElementById('tournamentTitle').value = 'Tournament Control Panel';
	document.getElementById('headerTextColor').value = '#2d3748';
	document.getElementById('primaryColor').value = '#667eea';
	document.getElementById('secondaryColor').value = '#764ba2';
	document.getElementById('showLogos').checked = true;
	document.getElementById('showScores').checked = true;
	showToast('Settings reset to default values!');
}

function resetCurrentTournament() {
	resetSwissData();
	generateSwissMatches();
	updateSwissStatus();
	resetDoubleData();
	generateDoubleBracket();
	resetSingleData();
	generateSingleBracket();
	showToast("Tournament data reset!");
}


async function resetSwissData() {
	teams.forEach(team => {
		team.wins = 0;
		team.losses = 0;
		teamRecords[team.name] = {
			wins: 0,
			losses: 0
		};
	});
	swissMatches = {};
	updateTeamList();
	updateSwissStatus();
	saveProgress({
		silent: true
	});
}

async function resetDoubleData() {
	doubleMatches = {};
	DE.selected.clear();
	DE.qualified = {
		A: {
			upper: [],
			lower: []
		},
		B: {
			upper: [],
			lower: []
		}
	};
	saveProgress({
		silent: true
	});
}

async function resetSingleData() {
	singleMatches = {};
	SE.selected.clear();
	saveProgress({
		silent: true
	});
}

async function saveProgress(options = {}) {
	cleanUpMatches();

	const data = {
		teams,
		swissMatches,
		doubleMatches,
		singleMatches,
		teamRecords,
		currentTab,
		DE: {
			selected: Array.from(DE.selected),
			qualified: DE.qualified
		},
		SE: {
			selected: Array.from(SE.selected)
		},
		timestamp: new Date().toISOString()
	};

	await fetch("/api/tournament", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify(data)
	});

	if (!options.silent) {
		showToast("Tournament progress updated successfully!");
	}
}

function cleanUpMatches() {
	Object.keys(swissMatches).forEach(key => {
		if (!document.getElementById(`match-${key}`)) {
			delete swissMatches[key];
		}
	});

	Object.keys(doubleMatches).forEach(key => {
		if (!document.getElementById(`double-match-${key}`)) {
			delete doubleMatches[key];
		}
	});

	Object.keys(singleMatches).forEach(key => {
		if (!document.getElementById(`single-match-${key}`)) {
			delete singleMatches[key];
		}
	});
}

function loadProgress(event) {
	const file = event.target.files[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = function(e) {
		try {
			const data = JSON.parse(e.target.result);
			teams = data.teams || [];
			swissMatches = data.swissMatches || {};
			doubleMatches = data.doubleMatches || {};
			singleMatches = data.singleMatches || {};
			teamRecords = data.teamRecords || {};

			ensureTeamLogos();

			if (data.DE) {
				DE.selected = new Set(data.DE.selected || []);
				DE.qualified = data.DE.qualified || {
					A: {
						upper: [],
						lower: []
					},
					B: {
						upper: [],
						lower: []
					}
				};
			}

			if (data.SE) {
				SE.selected = new Set(data.SE.selected || []);
			}

			updateTeamList();

			if (data.currentTab) {
				currentTab = data.currentTab;

				document.querySelectorAll('.tab-button').forEach(button => {
					button.classList.remove('active');
				});
				document.querySelectorAll('.tab-content').forEach(content => {
					content.classList.remove('active');
				});

				document.querySelector(`[onclick="switchTab('${currentTab}')"]`).classList.add('active');
				document.getElementById(`${currentTab}-tab`).classList.add('active');

				if (currentTab === 'swiss') {
					generateSwissMatches();
					updateSwissStatus();
				} else if (currentTab === 'double') {
					generateDoubleBracket();
					updateQualifiedCount();
				} else if (currentTab === 'single') {
					generateSingleBracket();
				}
			}

			showToast("Tournament progress loaded successfully!");
		} catch (error) {
			showToast("Error loading file. Please check the file format.");
			console.error('Load error:', error);
		}
	};
	reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', function() {
	const newTeamNameInput = document.getElementById('newTeamName');
	if (newTeamNameInput) {
		newTeamNameInput.addEventListener('keypress', function(e) {
			if (e.key === 'Enter') {
				addTeam();
			}
		});
	}

	window.addEventListener('click', function(event) {
		const modal = document.getElementById('scoreModal');
		if (event.target === modal) {
			closeModal();
		}
	});

	initializeTournament();
});

async function initBracketSelector() {
	try {
		const res = await fetch("/api/view");
		const {
			visible
		} = await res.json();
		setPanelCheckbox(visible);
	} catch (e) {
		setPanelCheckbox("swiss");
	}

	document.querySelectorAll('#bracket-selector input[type="checkbox"]').forEach(cb => {
		cb.addEventListener("change", () => setBracketView(cb.value, cb));
	});
}

function setPanelCheckbox(value) {
	document.querySelectorAll('#bracket-selector input[type="checkbox"]').forEach(cb => {
		cb.checked = (cb.value === value);
	});
}

async function setBracketView(value, sourceCb) {
	document.querySelectorAll('#bracket-selector input[type="checkbox"]').forEach(cb => {
		cb.checked = (cb === sourceCb);
	});

	await fetch("/api/view", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			visible: value
		})
	});
}

async function applySettings() {
	const fileInput = document.getElementById("headerImageUpload");
	let headerImagePath = null;

	if (fileInput && fileInput.files && fileInput.files[0]) {
		const fd = new FormData();
		fd.append("headerImage", fileInput.files[0]);
		const up = await fetch("/api/settings/upload", {
			method: "POST",
			body: fd
		});
		if (!up.ok) {
			showToast("Background image upload failed.");
			return;
		}
		const upJson = await up.json();
		headerImagePath = upJson.path;
	} else {
		try {
			const cur = await fetch("/api/settings").then(r => r.json());
			headerImagePath = cur.headerImage ?? null;
		} catch {
			headerImagePath = null;
		}
	}

	const settings = {
		headerImage: headerImagePath,
		titleTop: document.getElementById("tournamentTitleTop")?.value ?? "",
		titleBottom: document.getElementById("tournamentTitleBottom")?.value ?? "",
		headerTextColor: document.getElementById("headerTextColor")?.value ?? "",
		primaryColor: document.getElementById("primaryColor")?.value ?? "",
	};

	const res = await fetch("/api/settings", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify(settings),
	});

	if (!res.ok) {
		showToast("Failed to save settings.");
		return;
	}

	showToast("Settings saved.");
}

async function resetSettings() {
	if (!confirm("Reset all settings to default?")) return;

	try {
		const res = await fetch("/api/settings/reset", {
			method: "POST"
		});
		const {
			settings
		} = await res.json();

		document.getElementById("tournamentTitleTop").value = settings.titleTop || "";
		document.getElementById("tournamentTitleBottom").value = settings.titleBottom || "";
		document.getElementById("headerTextColor").value = settings.headerTextColor || "#ffffff";
		document.getElementById("primaryColor").value = settings.primaryColor || "#DCC776";

		const fileInput = document.getElementById("headerImageUpload");
		if (fileInput) fileInput.value = "";

		showToast("Settings reset to defaults!");
	} catch (err) {
		console.error("Reset failed", err);
		showToast("Could not reset settings.");
	}
}

function showToast(message, duration = 3000) {
	const container = document.getElementById("toast-container");
	const toast = document.createElement("div");
	toast.className = "toast";
	toast.textContent = message;

	container.appendChild(toast);

	setTimeout(() => toast.classList.add("show"), 100);

	setTimeout(() => {
		toast.classList.remove("show");
		setTimeout(() => toast.remove(), 300);
	}, duration);
}

function ensureTeamLogos() {
	teams.forEach(team => {
		if (!"${resolveLogoPath(team.logo)}") {
			team.logo = generateDefaultLogo(team.name);
		}
	});
}

function resolveLogoPath(logo) {
	if (!logo) return "";
	if (logo.startsWith("data:")) return logo;
	return "/Assets/" + logo;
}

async function loadSavedProgressFromServer() {
	try {
		const res = await fetch("/api/tournament");
		const data = await res.json();

		if (data.error) {
			console.log("No saved progress found.");
			return;
		}

		teams = data.teams || [];
		swissMatches = data.swissMatches || {};
		doubleMatches = data.doubleMatches || {};
		singleMatches = data.singleMatches || {};
		teamRecords = data.teamRecords || {};

		if (data.DE) {
			DE.selected = new Set(data.DE.selected || []);
			DE.qualified = data.DE.qualified || {
				A: {
					upper: [],
					lower: []
				},
				B: {
					upper: [],
					lower: []
				}
			};
		}
		if (data.SE) {
			SE.selected = new Set(data.SE.selected || []);
		}

		updateTeamList();

		if (currentTab === 'swiss') {
			generateSwissMatches();
			updateSwissStatus();
		} else if (currentTab === 'double') {
			generateDoubleBracket();
			updateQualifiedCount();
		} else if (currentTab === 'single') {
			generateSingleBracket();
		}

		showToast("Loaded saved tournament progress.");
	} catch (err) {
		console.error("Failed to load saved progress:", err);
	}
}

async function loadSavedSettingsFromServer() {
	try {
		const res = await fetch("/api/settings");
		const settings = await res.json();

		if (settings.headerImage) {
			const fileInput = document.getElementById("headerImageUpload");
			if (fileInput) {
				fileInput.dataset.current = settings.headerImage;
			}
		}

		const top = document.getElementById("tournamentTitleTop");
		if (top) top.value = settings.titleTop || "";

		const bottom = document.getElementById("tournamentTitleBottom");
		if (bottom) bottom.value = settings.titleBottom || "";

		const headerColor = document.getElementById("headerTextColor");
		if (headerColor) headerColor.value = settings.headerTextColor || "#ffffff";

		const primaryColor = document.getElementById("primaryColor");
		if (primaryColor) primaryColor.value = settings.primaryColor || "#DCC776";

	} catch (err) {
		console.error("Failed to load saved settings:", err);
	}
}

document.addEventListener("DOMContentLoaded", () => {
	loadSavedProgressFromServer();
	loadSavedSettingsFromServer();
	initBracketSelector();
});