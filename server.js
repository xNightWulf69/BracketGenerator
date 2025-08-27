const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = 3000;

const SETTINGS_PATH = path.join(__dirname, "Assets", "settings.json");

const DEFAULT_SETTINGS = {
	headerImage: "Background.png",
	titleTop: "",
	titleBottom: "",
	headerTextColor: "#ffffff",
	primaryColor: "#DCC776"
};

const uploadDir = path.join(__dirname, "Assets", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, {
	recursive: true
});

const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, uploadDir),
	filename: (req, file, cb) => {
		const safe = file.originalname.replace(/[^a-z0-9.\-_]/gi, "_");
		const ext = path.extname(safe);
		const base = path.basename(safe, ext);
		cb(null, `${base}-${Date.now()}${ext}`);
	},
});
const upload = multer({
	storage
});

app.get("/api/settings", (req, res) => {
	try {
		if (!fs.existsSync(SETTINGS_PATH)) {
			return res.json(DEFAULT_SETTINGS);
		}
		const txt = fs.readFileSync(SETTINGS_PATH, "utf8");
		const json = JSON.parse(txt || "{}");
		res.json({
			...DEFAULT_SETTINGS,
			...json
		});
	} catch {
		res.json(DEFAULT_SETTINGS);
	}
});
app.post("/api/settings", express.json(), (req, res) => {
	fs.writeFileSync(SETTINGS_PATH, JSON.stringify(req.body ?? {}, null, 2));
	res.json({
		ok: true
	});
});

app.post("/api/settings/upload", upload.single("headerImage"), (req, res) => {
	if (!req.file) return res.status(400).json({
		error: "No file uploaded"
	});
	return res.json({
		path: `uploads/${req.file.filename}`
	});
});

app.post("/api/settings/reset", (_req, res) => {
	fs.writeFileSync(SETTINGS_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2));
	res.json({
		ok: true,
		settings: DEFAULT_SETTINGS
	});
});

const VIEW_STATE_PATH = path.join(__dirname, "Assets", "view_state.json");

app.get("/api/view", (req, res) => {
	try {
		if (!fs.existsSync(VIEW_STATE_PATH)) return res.json({
			visible: "swiss"
		});
		const txt = fs.readFileSync(VIEW_STATE_PATH, "utf8");
		const json = JSON.parse(txt || "{}");
		res.json({
			visible: json.visible || "swiss"
		});
	} catch {
		res.json({
			visible: "swiss"
		});
	}
});

app.post("/api/view", express.json(), (req, res) => {
	const {
		visible
	} = req.body || {};
	const allowed = new Set(["swiss", "double", "single", "none"]);
	const value = allowed.has(visible) ? visible : "swiss";
	fs.writeFileSync(VIEW_STATE_PATH, JSON.stringify({
		visible: value
	}, null, 2));
	res.json({
		ok: true,
		visible: value
	});
});

app.get("/api/tournament", (req, res) => {
	const filePath = path.join(__dirname, "Assets", "tournament_progress.json");
	if (!fs.existsSync(filePath)) return res.json({
		error: "No tournament data file found"
	});
	const fileData = fs.readFileSync(filePath, "utf-8");
	res.json(JSON.parse(fileData));
});

app.post("/api/tournament", express.json(), (req, res) => {
	const filePath = path.join(__dirname, "Assets", "tournament_progress.json");
	fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
	res.json({
		status: "Tournament progress saved successfully!"
	});
});

const teamUploadDir = path.join(__dirname, "Assets", "team_logos");
if (!fs.existsSync(teamUploadDir)) fs.mkdirSync(teamUploadDir, {
	recursive: true
});

const teamLogoStorage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, teamUploadDir),
	filename: (req, file, cb) => {
		const safe = file.originalname.replace(/[^a-z0-9.\-_]/gi, "_");
		const ext = path.extname(safe);
		const base = path.basename(safe, ext);
		cb(null, `${base}-${Date.now()}${ext}`);
	},
});
const teamLogoUpload = multer({
	storage: teamLogoStorage
});

app.post("/api/teamlogo", teamLogoUpload.single("logo"), (req, res) => {
	if (!req.file) return res.status(400).json({
		error: "No file uploaded"
	});
	res.json({
		path: `team_logos/${req.file.filename}`
	});
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});