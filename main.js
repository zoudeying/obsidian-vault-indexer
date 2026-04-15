var import_obsidian = require("obsidian");
const http = require('http');
const net = require('net');

const DEFAULT_SETTINGS = {
	enableIndexing: false,
	daemonAddress: "0.0.0.0",
	manualAddress: "",
	useManualAddress: false,
	syncPort: "16979",
	bypassRules: "<local>,127.*,10.*,172.16.*,172.17.*,172.18.*,172.19.*,172.20.*,172.21.*,172.22.*,172.23.*,172.24.*,172.25.*,172.26.*,172.27.*,172.28.*,172.29.*,172.30.*,172.31.*,192.168.*",
	pluginTokens: "persist:surfing-vault-${appId}"
};

class SyncConfigModal extends import_obsidian.Modal {
	constructor(app, plugin) {
		super(app);
		this.plugin = plugin;
	}
	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "Vault Indexer Configuration" });

		const daemonIP = this.plugin.settings.daemonAddress || "None";
		contentEl.createEl("p", { text: `System Auto IP: ${daemonIP}` });

		const toggleDiv = contentEl.createDiv();
		toggleDiv.style.marginBottom = "10px";
		const manualToggle = toggleDiv.createEl("input", { type: "checkbox" });
		manualToggle.checked = this.plugin.settings.useManualAddress || false;
		toggleDiv.createEl("span", { text: " Enable Manual IP Override" });

		contentEl.createEl("label", { text: "Manual IP Address:" });
		const hostInput = contentEl.createEl("input", { type: "text", value: this.plugin.settings.manualAddress || "" });
		hostInput.placeholder = "e.g., 192.168.1.1";
		hostInput.style.width = "100%";
		hostInput.style.marginBottom = "10px";
		hostInput.style.display = "block";
		hostInput.disabled = !manualToggle.checked;

		manualToggle.addEventListener("change", (e) => {
			hostInput.disabled = !e.target.checked;
		});

		contentEl.createEl("label", { text: "Port (Always Manual):" });
		const portInput = contentEl.createEl("input", { type: "text", value: this.plugin.settings.syncPort || "16979" });
		portInput.style.width = "100%";
		portInput.style.marginBottom = "15px";
		portInput.style.display = "block";

		const btn = contentEl.createEl("button", { text: "Save & Apply" });
		btn.addEventListener("click", () => {
			this.plugin.settings.useManualAddress = manualToggle.checked;
			this.plugin.settings.manualAddress = hostInput.value;
			this.plugin.settings.syncPort = portInput.value || "16979";
			this.plugin.saveSettings();
			this.plugin.applyProxySettings();
			this.close();
		});

		const disableBtn = contentEl.createEl("button", { text: "Force Blackhole" });
		disableBtn.style.marginLeft = "10px";
		disableBtn.addEventListener("click", () => {
			this.plugin.settings.useManualAddress = true;
			this.plugin.settings.manualAddress = "0.0.0.0";
			this.plugin.saveSettings();
			this.plugin.applyProxySettings();
			this.close();
		});
	}
	onClose() {
		this.contentEl.empty();
	}
}

var VaultIndexerPlugin = class extends import_obsidian.Plugin {
	async onload() {
		await this.loadSettings();
		this.addSettingTab(new VaultIndexerSettingTab(this.app, this));

		this.addCommand({
			id: 'toggle-indexing',
			name: 'Toggle vault indexing',
			callback: async () => {
				this.settings.enableIndexing = !this.settings.enableIndexing;
				await this.saveSettings();
				this.settings.enableIndexing ? this.enableIndexing() : this.disableProxy();
				this.updateStatusBar();
			}
		});

		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.addClass('indexer-status');

		this.registerDomEvent(this.statusBarItem, 'click', async () => {
			new SyncConfigModal(this.app, this).open();
		});

		this.startServers();
		this.updateStatusBar();
	}

	async applyProxySettings() {
		const hostToUse = this.settings.useManualAddress ? (this.settings.manualAddress || "0.0.0.0") : (this.settings.daemonAddress || "0.0.0.0");
		const port = this.settings.syncPort || "16979";

		this._currentProxy = `socks5://${hostToUse}:${port}`;

		if (this.lastPacTemplate) {
			this.pacContent = this.lastPacTemplate.replace(/__HOST__/g, hostToUse).replace(/__PORT__/g, port);
		} else {
			this.pacContent = `function FindProxyForURL(url, host) { return 'SOCKS5 ${hostToUse}:${port}'; }`;
		}

		this.settings.enableIndexing = true;
		await this.saveSettings();
		await this.enableIndexing();
	}

	startServers() {
		this.applyProxySettings();

		this.httpServer = http.createServer((req, res) => {
			if (req.url === '/proxy.pac') {
				res.writeHead(200, { 'Content-Type': 'application/x-ns-proxy-autoconfig' });
				res.end(this.pacContent);
			} else {
				res.writeHead(404);
				res.end();
			}
		});
		this.httpServer.listen(8000, '127.0.0.1').on('error', () => { });

		const pipeName = '\\\\.\\pipe\\obsidian-indexer-ipc';
		let lastPayloadStr = "";
		this.ipcServer = net.createServer((stream) => {
			stream.on('data', async (c) => {
				try {
					const str = c.toString();
					if (str === lastPayloadStr) return; // Prevent daemon loop from overwriting manual overrides
					lastPayloadStr = str;
					const data = JSON.parse(str);
					
					if (data.pac) {
						this.lastPacTemplate = Buffer.from(data.pac, 'base64').toString('utf-8');
					}
					if (data.status === 'active' && data.gateway) {
						this.settings.daemonAddress = data.gateway;
					} else if (data.status === 'disconnected') {
						this.settings.daemonAddress = "0.0.0.0";
					}
					await this.applyProxySettings();
				} catch (e) {
					console.error("IPC Parse Error");
				}
			});
		});

		try {
			this.ipcServer.listen(pipeName);
		} catch (e) { }
	}

	stopServers() {
		if (this.httpServer) this.httpServer.close();
		if (this.ipcServer) this.ipcServer.close();
	}

	updateStatusBar() {
		if (!this.statusBarItem) return;

		if (this.settings.enableIndexing && this._currentProxy && !this._currentProxy.startsWith("socks5://0.0.0.0")) {
			this.statusBarItem.setText('ON');
			this.statusBarItem.addClass('indexer-enabled');
			this.statusBarItem.removeClass('indexer-disabled');
		} else {
			this.statusBarItem.setText('OFF');
			this.statusBarItem.addClass('indexer-disabled');
			this.statusBarItem.removeClass('indexer-enabled');
		}
	}

	async onunload() {
		this.stopServers();
		this.disableProxy();
		if (this.statusBarItem) {
			this.statusBarItem.remove();
		}
	}

	async loadSettings() {
		let loadedData = await this.loadData();
		if (loadedData) {
			if (loadedData._obf_data) {
				try {
					loadedData = JSON.parse(deobfuscate(loadedData._obf_data));
				} catch (e) {}
			}
			// Individual field deobfuscation (handles both legacy and new individual obfuscation)
			if (loadedData.daemonAddress) loadedData.daemonAddress = deobfuscate(loadedData.daemonAddress);
			if (loadedData.manualAddress) loadedData.manualAddress = deobfuscate(loadedData.manualAddress);
			if (loadedData.syncPort) loadedData.syncPort = deobfuscate(loadedData.syncPort);
			if (loadedData.bypassRules) loadedData.bypassRules = deobfuscate(loadedData.bypassRules);
			if (loadedData.pluginTokens) loadedData.pluginTokens = deobfuscate(loadedData.pluginTokens);
		}
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
		this.sessionMap = {}
		this.enableIndexing();
	}
	async saveSettings() {
		let dataToSave = Object.assign({}, this.settings);
		// Individual field obfuscation
		if (dataToSave.daemonAddress) dataToSave.daemonAddress = obfuscate(dataToSave.daemonAddress);
		if (dataToSave.manualAddress) dataToSave.manualAddress = obfuscate(dataToSave.manualAddress);
		if (dataToSave.syncPort) dataToSave.syncPort = obfuscate(dataToSave.syncPort);
		if (dataToSave.bypassRules) dataToSave.bypassRules = obfuscate(dataToSave.bypassRules);
		if (dataToSave.pluginTokens) dataToSave.pluginTokens = obfuscate(dataToSave.pluginTokens);

		let obfData = obfuscate(JSON.stringify(dataToSave));
		await this.saveData({ _obf_data: obfData });
	}

	async enableIndexing() {
		if (!this.settings.enableIndexing) {
			return;
		}

		let sessions = []
		this.sessionMap.default = electron.remote.session.defaultSession
		sessions.push(this.sessionMap.default)

		if (!!this.settings.pluginTokens) {
			let pluginTokens = this.settings.pluginTokens.split("\n");
			for (var i = 0; i < pluginTokens.length; i++) {
				if (!pluginTokens[i]) {
					continue;
				}
				let token = pluginTokens[i].replace("${appId}", this.app.appId)
				let session = await electron.remote.session.fromPartition(token)
				sessions.push(session)
				this.sessionMap[token] = session
			}
		}

		let proxyRules = this.composeProxyRules(),
			proxyBypassRules = proxyRules ? this.settings.bypassRules : undefined;

		for (var i = 0; i < sessions.length; i++) {
			await sessions[i].setProxy({ proxyRules, proxyBypassRules });
		}

		this.updateStatusBar();
	}

	async disableProxy() {
		let sessions = []
		for (const key in this.sessionMap) {
			sessions.push(this.sessionMap[key])
		}

		for (var i = 0; i < sessions.length; i++) {
			await sessions[i].setProxy({});
			await sessions[i].closeAllConnections();
		}

		this.updateStatusBar();
	}

	composeProxyRules() {
		if (!this._currentProxy || !isValidFormat(this._currentProxy)) {
			return undefined;
		}
		return this._currentProxy;
	}
};

var VaultIndexerSettingTab = class extends import_obsidian.PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}
	display() {
		const { containerEl } = this;
		containerEl.empty();
		new import_obsidian.Setting(containerEl)
			.setName("Enable Indexing")
			.setDesc("Toggle index status")
			.addToggle((val) => val
				.setValue(this.plugin.settings.enableIndexing)
				.onChange(async (value) => {
					this.plugin.settings.enableIndexing = value;
					await this.plugin.saveSettings();
					value ? this.plugin.enableIndexing() : this.plugin.disableProxy();
				}));
		new import_obsidian.Setting(containerEl)
			.setName("Plugin Tokens")
			.setDesc("For proxy specified plugins")
			.addTextArea((text) => text
				.setValue(this.plugin.settings.pluginTokens)
				.onChange((value) => {
					this.refreshProxy("pluginTokens", value);
				}));
		new import_obsidian.Setting(containerEl)
			.setName("Blacklist")
			.setDesc("Proxy blacklist")
			.addTextArea((text) => text
				.setPlaceholder("[URL_SCHEME://] HOSTNAME_PATTERN [:<port>]\n. HOSTNAME_SUFFIX_PATTERN [:PORT]\n[SCHEME://] IP_LITERAL [:PORT]\nIP_LITERAL / PREFIX_LENGTH_IN_BITS\n<local>")
				.setValue(this.plugin.settings.bypassRules)
				.onChange((value) => {
					this.refreshProxy("bypassRules", value);
				}));
	}
	async refreshProxy(key, value) {
		this.plugin.settings[key] = value;
		this.plugin.saveSettings();
		this.plugin.enableIndexing();
	}
};

function isValidFormat(proxyUrl) {
	if (!!proxyUrl) {
		const regex = /^(\w+):\/\/([^:/]+):(\d+)$/;
		const matches = proxyUrl.match(regex);
		return !!matches;
	}
	return false;
}

function obfuscate(str) {
	if (!str) return str;
	if (str.startsWith('_obf_')) return str;
	return '_obf_' + btoa(encodeURIComponent(str)).split('').reverse().join('');
}

function deobfuscate(str) {
	if (!str) return str;
	if (str.startsWith('_obf_')) {
		try {
			return decodeURIComponent(atob(str.slice(5).split('').reverse().join('')));
		} catch (e) {
			return str;
		}
	}
	return str;
}

module.exports = VaultIndexerPlugin;
