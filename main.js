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
	pluginTokens: "persist:surfing-vault-${appId}",
	enableLocalSocks: false,
	localSocksPort: "17899"
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
		this.startLocalSocksProxy();
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
		this.stopLocalSocksProxy();
	}

	startLocalSocksProxy() {
		this.stopLocalSocksProxy();
		
		if (!this.settings.enableLocalSocks) return;
		
		const localPort = parseInt(this.settings.localSocksPort || "17899");
		const hostToUse = this.settings.useManualAddress ? (this.settings.manualAddress || "0.0.0.0") : (this.settings.daemonAddress || "0.0.0.0");
		const upstreamPort = parseInt(this.settings.syncPort || "16979");

		if (hostToUse === "0.0.0.0" || !hostToUse) return;

		const shouldBypass = (host) => {
			if (!this.settings.bypassRules || !host) return false;
			const rules = this.settings.bypassRules.split(',').map(r => r.trim()).filter(r => r.length > 0);
			for (const rule of rules) {
				const r = rule.replace(/^\*\./, '');
				if (host.includes(r)) return true;
			}
			return false;
		};

		this.localSocksServer = net.createServer((clientSocket) => {
			let buffer = Buffer.alloc(0);
			let protocolDetected = false;
			let socksState = 0; 

			const onData = (data) => {
				buffer = Buffer.concat([buffer, data]);

				if (!protocolDetected) {
					if (buffer[0] === 0x05) protocolDetected = 'SOCKS5';
					else protocolDetected = 'HTTP';
				}

				if (protocolDetected === 'HTTP') {
					const str = buffer.toString('utf8');
					const headerEnd = str.indexOf('\r\n\r\n');
					if (headerEnd !== -1) {
						clientSocket.removeListener('data', onData);
						let host = '';
						let port = 80;
						let isConnect = false;
						const lines = str.slice(0, headerEnd).split('\r\n');
						const reqLine = lines[0].split(' ');
						
						if (reqLine[0] === 'CONNECT') {
							isConnect = true;
							const hostParts = reqLine[1].split(':');
							host = hostParts[0];
							port = parseInt(hostParts[1] || '443');
						} else {
							for (let i = 1; i < lines.length; i++) {
								if (lines[i].toLowerCase().startsWith('host:')) {
									const hostParts = lines[i].substring(5).trim().split(':');
									host = hostParts[0];
									port = parseInt(hostParts[1] || '80');
									break;
								}
							}
						}

						if (host && shouldBypass(host)) {
							if (isConnect) {
								const direct = net.createConnection({ host, port }, () => {
									clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
									const remaining = buffer.slice(headerEnd + 4);
									if (remaining.length > 0) direct.write(remaining);
									clientSocket.pipe(direct);
									direct.pipe(clientSocket);
								});
								direct.on('error', () => clientSocket.end());
								clientSocket.on('error', () => direct.end());
							} else {
								let newBuffer = buffer;
								if (reqLine[1].startsWith('http://')) {
									try {
										const url = new URL(reqLine[1]);
										const newReqLine = `${reqLine[0]} ${url.pathname}${url.search} ${reqLine[2]}`;
										const newHeader = str.slice(0, headerEnd).replace(lines[0], newReqLine);
										newBuffer = Buffer.concat([Buffer.from(newHeader + '\r\n\r\n', 'utf8'), buffer.slice(headerEnd + 4)]);
									} catch(e) {}
								}
								const direct = net.createConnection({ host, port }, () => {
									direct.write(newBuffer);
									clientSocket.pipe(direct);
									direct.pipe(clientSocket);
								});
								direct.on('error', () => clientSocket.end());
								clientSocket.on('error', () => direct.end());
							}
						} else {
							const upstream = net.createConnection({ host: hostToUse, port: upstreamPort }, () => {
								upstream.write(buffer);
								clientSocket.pipe(upstream);
								upstream.pipe(clientSocket);
							});
							upstream.on('error', () => clientSocket.end());
							clientSocket.on('error', () => upstream.end());
						}
					}
				} else if (protocolDetected === 'SOCKS5') {
					if (socksState === 0) {
						if (buffer.length >= 2) {
							const nmethods = buffer[1];
							if (buffer.length >= 2 + nmethods) {
								clientSocket.write(Buffer.from([0x05, 0x00]));
								buffer = buffer.slice(2 + nmethods);
								socksState = 1;
							}
						}
					}
					
					if (socksState === 1 && buffer.length >= 4) {
						const cmd = buffer[1]; 
						const atyp = buffer[3];
						let host = '';
						let port = 0;
						let addrLen = 0;
						let headerLen = 0;

						if (atyp === 0x01) { 
							addrLen = 4;
							headerLen = 4 + addrLen + 2;
							if (buffer.length >= headerLen) {
								host = `${buffer[4]}.${buffer[5]}.${buffer[6]}.${buffer[7]}`;
								port = buffer.readUInt16BE(4 + addrLen);
							}
						} else if (atyp === 0x03) { 
							addrLen = buffer[4];
							headerLen = 5 + addrLen + 2;
							if (buffer.length >= headerLen) {
								host = buffer.slice(5, 5 + addrLen).toString('utf8');
								port = buffer.readUInt16BE(5 + addrLen);
							}
						} else if (atyp === 0x04) { 
							addrLen = 16;
							headerLen = 4 + addrLen + 2;
							if (buffer.length >= headerLen) {
								host = 'ipv6';
								port = buffer.readUInt16BE(4 + addrLen);
							}
						}

						if (port !== 0) {
							clientSocket.removeListener('data', onData);
							const connectReqBuffer = buffer.slice(0, headerLen);
							const remainingBuffer = buffer.slice(headerLen);

							if (cmd === 0x01 && host && shouldBypass(host)) {
								const direct = net.createConnection({ host, port }, () => {
									clientSocket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0,0,0,0, 0,0]));
									if (remainingBuffer.length > 0) direct.write(remainingBuffer);
									clientSocket.pipe(direct);
									direct.pipe(clientSocket);
								});
								direct.on('error', () => {
									clientSocket.write(Buffer.from([0x05, 0x03, 0x00, 0x01, 0,0,0,0, 0,0]));
									clientSocket.end();
								});
								clientSocket.on('error', () => direct.end());
							} else {
								const upstream = net.createConnection({ host: hostToUse, port: upstreamPort }, () => {
									upstream.write(Buffer.from([0x05, 0x01, 0x00]));
									let upstreamState = 0;
									const onUpstreamData = (udata) => {
										if (upstreamState === 0 && udata.length >= 2 && udata[0] === 0x05) {
											upstreamState = 1;
											upstream.write(connectReqBuffer);
											if (remainingBuffer.length > 0) {
												upstream.write(remainingBuffer);
											}
											upstream.removeListener('data', onUpstreamData);
											clientSocket.pipe(upstream);
											if (udata.length > 2) {
												clientSocket.write(udata.slice(2));
											}
											upstream.pipe(clientSocket);
										}
									};
									upstream.on('data', onUpstreamData);
								});
								upstream.on('error', () => clientSocket.end());
								clientSocket.on('error', () => upstream.end());
							}
						}
					}
				}
			};

			clientSocket.on('data', onData);
			clientSocket.on('error', () => {});
		});

		this.localSocksServer.listen(localPort, '127.0.0.1').on('error', (e) => {
			console.error("Local SOCKS proxy server error", e);
		});
	}
	
	stopLocalSocksProxy() {
		if (this.localSocksServer) {
			this.localSocksServer.close();
			this.localSocksServer = null;
		}
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
			if (loadedData.localSocksPort) loadedData.localSocksPort = deobfuscate(loadedData.localSocksPort);
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
		if (dataToSave.localSocksPort) dataToSave.localSocksPort = obfuscate(dataToSave.localSocksPort);

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
			.setName("Enable Local Routing")
			.setDesc("Forward a local port to the upstream node")
			.addToggle((val) => val
				.setValue(this.plugin.settings.enableLocalSocks)
				.onChange(async (value) => {
					this.plugin.settings.enableLocalSocks = value;
					await this.plugin.saveSettings();
					this.plugin.startLocalSocksProxy();
				}));
		new import_obsidian.Setting(containerEl)
			.setName("Local Port")
			.setDesc("The local port to listen on (default: 17899)")
			.addText((text) => text
				.setValue(this.plugin.settings.localSocksPort)
				.onChange(async (value) => {
					this.plugin.settings.localSocksPort = value;
					await this.plugin.saveSettings();
					if (this.plugin.settings.enableLocalSocks) {
						this.plugin.startLocalSocksProxy();
					}
				}));
		new import_obsidian.Setting(containerEl)
			.setName("Bypass Rules")
			.setDesc("Addresses to exclude from routing")
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
