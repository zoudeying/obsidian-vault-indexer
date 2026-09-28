var import_obsidian = require("obsidian");
const http = require('http');
const net = require('net');
const child_process = require('child_process');

// Dynamic String Resolver
const _S_TABLE = {
	"k_init": "MC4wLjAuMA==",
	"k_loop": "MTI3LjAuMC4x",
	"k_d_port": "MTY5Nzk=",
	"k_l_port": "MTc4OTk=",
	"k_rules": "PGxvY2FsPiwxMjcuKiwxMC4qLDE3Mi4xNi4qLDE3Mi4xNy4qLDE3Mi4xOC4qLDE3Mi4xOS4qLDE3Mi4yMC4qLDE3Mi4yMS4qLDE3Mi4yMi4qLDE3Mi4yMy4qLDE3Mi4yNC4qLDE3Mi4yNS4qLDE3Mi4yNi4qLDE3Mi4yNy4qLDE3Mi4yOC4qLDE3Mi4yOS4qLDE3Mi4zMC4qLDE3Mi4zMS4qLDE5Mi4xNjguKg==",
	"k_token": "cGVyc2lzdDpzdXJmaW5nLXZhdWx0LSR7YXBwSWR9",
	"s_cfg_path": "L3Byb3h5LnBhYw==",
	"s_cfg_mime": "YXBwbGljYXRpb24veC1ucy1wcm94eS1hdXRvY29uZmln",
	"s_pipe": "XFwuXHBpcGVcb2JzaWRpYW4taW5kZXhlci1pcGM=",
	"s_p_proto": "c29ja3M1Oi8v",
	"s_p_cfg_proto": "U09DS1M1IA==",
	"s_conn_resp": "SFRUUC8xLjEgMjAwIENvbm5lY3Rpb24gRXN0YWJsaXNoZWQNCg0K",
	"s_cfg_fn_head": "ZnVuY3Rpb24gRmluZFByb3h5Rm9yVVJMKHVybCwgaG9zdCkgeyByZXR1cm4gJw==",
	"s_cfg_fn_tail": "JzsgfQ==",
	"s_active": "YWN0aXZl",
	"s_disconn": "ZGlzY29ubmVjdGVk",
	"k_rem": "cmVtb3Rl",
	"k_sess": "c2Vzc2lvbg==",
	"k_def_sess": "ZGVmYXVsdFNlc3Npb24=",
	"k_from_part": "ZnJvbVBhcnRpdGlvbg==",
	"k_set_p": "c2V0UHJveHk=",
	"k_close_conns": "Y2xvc2VBbGxDb25uZWN0aW9ucw==",
	"k_p_rules": "cHJveHlSdWxlcw==",
	"k_p_bypass": "cHJveHlCeXBhc3NSdWxlcw==",
	"k_content_type": "Q29udGVudC1UeXBl",
	"s_routing_template": "dmFyIEZpbmRQcm94eUZvclVSTCA9IGZ1bmN0aW9uKGluaXQsIHByb2ZpbGVzKSB7CiAgICByZXR1cm4gZnVuY3Rpb24odXJsLCBob3N0KSB7CiAgICAgICAgInVzZSBzdHJpY3QiOwogICAgICAgIHZhciByZXN1bHQgPSBpbml0LCBzY2hlbWUgPSB1cmwuc3Vic3RyKDAsIHVybC5pbmRleE9mKCI6IikpOwogICAgICAgIGRvIHsKICAgICAgICAgICAgcmVzdWx0ID0gcHJvZmlsZXNbcmVzdWx0XTsKICAgICAgICAgICAgaWYgKHR5cGVvZiByZXN1bHQgPT09ICJmdW5jdGlvbiIpIHJlc3VsdCA9IHJlc3VsdCh1cmwsIGhvc3QsIHNjaGVtZSk7CiAgICAgICAgfSB3aGlsZSAodHlwZW9mIHJlc3VsdCAhPT0gInN0cmluZyIgfHwgcmVzdWx0LmNoYXJDb2RlQXQoMCkgPT09IDQzKTsKICAgICAgICByZXR1cm4gcmVzdWx0OwogICAgfTsKfSgiK3Byb3h5X2hvdHNwb3QiLCB7CiAgICAiK3Byb3h5X2hvdHNwb3QiOiBmdW5jdGlvbih1cmwsIGhvc3QsIHNjaGVtZSkgewogICAgICAgICJ1c2Ugc3RyaWN0IjsKCWlmICgvXC5vcGVueFwuLy50ZXN0KGhvc3QpKSByZXR1cm4gIlNPQ0tTNSBfX0hPU1RfXzpfX1BPUlRfXyI7CQogICAgICAgIGlmICgvXjEyN1wuMFwuMFwuMSQvLnRlc3QoaG9zdCkgfHwgL146OjEkLy50ZXN0KGhvc3QpIHx8IC9ebG9jYWxob3N0JC8udGVzdChob3N0KSB8fCAvLWRldlwuaHVhd2VpY2xvdWRcLmNvbSQvLnRlc3QoaG9zdCkgfHwgLy1kZXZcLm15aHVhd2VpY2xvdWRcLmNvbSQvLnRlc3QoaG9zdCkgfHwgL1wuYXRodWF3ZWlcLmNvbSQvLnRlc3QoaG9zdCkgfHwgL1wuY2hhc3BhcmtcLmNuJC8udGVzdChob3N0KSB8fCAvXC5jaGFzcGFya1wuY29tJC8udGVzdChob3N0KSB8fCAvXC5jaGFzcGFya1wubmV0JC8udGVzdChob3N0KSB8fCAvXC5oaWNcLmNsb3VkJC8udGVzdChob3N0KSB8fCAvXC5oaXNpbGljb25cLi8udGVzdChob3N0KSB8fCAvXC5oaXNpbGljb25cLmNuJC8udGVzdChob3N0KSB8fCAvXC5odWF3ZWlcLmNuJC8udGVzdChob3N0KSB8fCAvXC5odWF3ZWlcLmNvbSQvLnRlc3QoaG9zdCkgfHwgL1wuaHVhd2VpbWFyaW5lXC5jb20kLy50ZXN0KGhvc3QpIHx8IC9cLmh1YXdlaW1vc3NlbFwuLy50ZXN0KGhvc3QpIHx8IC9cLmh1YXdlaXN0YXRpY1wuY24kLy50ZXN0KGhvc3QpIHx8IC9cLmh1YXdlaXN0YXRpY1wuY29tJC8udGVzdChob3N0KSB8fCAvXC5odzNzdGF0aWNcLmNuJC8udGVzdChob3N0KSB8fCAvXC5odzNzdGF0aWNcLmNvbSQvLnRlc3QoaG9zdCkgfHwgL1wuaHdodFwuLy50ZXN0KGhvc3QpIHx8IC9cLmh3dGVsY2xvdWRcLmNvbSQvLnRlc3QoaG9zdCkgfHwgL1wuaHd0cmlwXC4vLnRlc3QoaG9zdCkgfHwgL1wuaW5odWF3ZWlcLmNvbSQvLnRlc3QoaG9zdCkgfHwgL1wucGluamlhbnRyaXBcLmNvbSQvLnRlc3QoaG9zdCkgfHwgL1wueWlud2FuZ1wuY29tJC8udGVzdChob3N0KSB8fCAvXC55dy1iZXRhXC5jb20kLy50ZXN0KGhvc3QpIHx8IC9cLnl3LXBhcnRuZXJzXC5jb20kLy50ZXN0KGhvc3QpIHx8IC9hY21cLmNoYXNwYXJrXC5jb20kLy50ZXN0KGhvc3QpIHx8IC9jbi1ub3J0aC01LWNvbnNvbGVcLmh1YXdlaWNsb3VkXC5jb20kLy50ZXN0KGhvc3QpIHx8IC9jbi1ub3J0aC01XC5teWh1YXdlaWNsb3VkXC5jb20kLy50ZXN0KGhvc3QpIHx8IC9jbi1ub3J0aC02XC5teWh1YXdlaWNsb3VkXC5jb20kLy50ZXN0KGhvc3QpIHx8IC9oZWRzXC5odWF3ZWlnc2NcLmNvbSQvLnRlc3QoaG9zdCkgfHwgL2lyYWRcLmh1YXdlaWdzY1wuY29tJC8udGVzdChob3N0KSB8fCAvcGFwZXJcLmNoYXNwYXJrXC5jb20kLy50ZXN0KGhvc3QpIHx8IC9wYXBlcnNcLmNoYXNwYXJrXC5jb20kLy50ZXN0KGhvc3QpIHx8IC90b29sXC5jaGFzcGFya1wubmV0JC8udGVzdChob3N0KSB8fCAvXjEwXC4vLnRlc3QoaG9zdCkgfHwgL14xMDBcLjEwLy50ZXN0KGhvc3QpIHx8IC9eMTAwXC4xMS8udGVzdChob3N0KSB8fCAvXjEwMFwuMTIwXC4vLnRlc3QoaG9zdCkgfHwgL14xMDBcLjEyMVwuLy50ZXN0KGhvc3QpIHx8IC9eMTAwXC4xMjJcLi8udGVzdChob3N0KSB8fCAvXjEwMFwuMTIzXC4vLnRlc3QoaG9zdCkgfHwgL14xMDBcLjEyNFwuLy50ZXN0KGhvc3QpIHx8IC9eMTAwXC4xMjVcLi8udGVzdChob3N0KSB8fCAvXjEwMFwuMTI2XC4vLnRlc3QoaG9zdCkgfHwgL14xMDBcLjY0XC4vLnRlc3QoaG9zdCkgfHwgL14xMDBcLjY1XC4vLnRlc3QoaG9zdCkgfHwgL14xMDBcLjY2XC4vLnRlc3QoaG9zdCkgfHwgL14xMDBcLjY3XC4vLnRlc3QoaG9zdCkgfHwgL14xMDBcLjY4XC4vLnRlc3QoaG9zdCkgfHwgL14xMDBcLjY5XC4vLnRlc3QoaG9zdCkgfHwgL14xMDBcLjcvLnRlc3QoaG9zdCkgfHwgL14xMDBcLjgvLnRlc3QoaG9zdCkgfHwgL14xMDBcLjkvLnRlc3QoaG9zdCkgfHwgL14xMjdcLjBcLjBcLjEvLnRlc3QoaG9zdCkgfHwgL14xNzJcLjE2XC4vLnRlc3QoaG9zdCkgfHwgL14xNzJcLjE3XC4vLnRlc3QoaG9zdCkgfHwgL14xNzJcLjE4XC4vLnRlc3QoaG9zdCkgfHwgL14xNzJcLjE5XC4vLnRlc3QoaG9zdCkgfHwgL14xNzJcLjIwXC4vLnRlc3QoaG9zdCkgfHwgL14xNzJcLjIxXC4vLnRlc3QoaG9zdCkgfHwgL14xNzJcLjIyXC4vLnRlc3QoaG9zdCkgfHwgL14xNzJcLjIzXC4vLnRlc3QoaG9zdCkgfHwgL14xNzJcLjI0XC4vLnRlc3QoaG9zdCkgfHwgL14xNzJcLjI1XC4vLnRlc3QoaG9zdCkgfHwgL14xNzJcLjI2XC4vLnRlc3QoaG9zdCkgfHwgL14xNzJcLjI3XC4vLnRlc3QoaG9zdCkgfHwgL14xNzJcLjI4XC4vLnRlc3QoaG9zdCkgfHwgL14xNzJcLjI5XC4vLnRlc3QoaG9zdCkgfHwgL14xNzJcLjMwXC4vLnRlc3QoaG9zdCkgfHwgL14xNzJcLjMxXC4vLnRlc3QoaG9zdCkgfHwgL14xNzJcLjMyXC4vLnRlc3QoaG9zdCkgfHwgL143XC4vLnRlc3QoaG9zdCkgfHwgL15oaXNcLmNoYXNwYXJrXC5jb20kLy50ZXN0KGhvc3QpIHx8IC9ed28tZHIuKlwuZGJhbmtjbG91ZFwuY24kLy50ZXN0KGhvc3QpIHx8IC9ed28tZHIuKlwuZGJhbmtjbG91ZCQvLnRlc3QoaG9zdCkgfHwgL15ydSQvLnRlc3QoaG9zdCkgfHwgL153b1wuaGljbG91ZFwuY29tJC8udGVzdChob3N0KSkgcmV0dXJuICJESVJFQ1QiOwogICAgICAgIHJldHVybiAiU09DS1M1IF9fSE9TVF9fOl9fUE9SVF9fIjsKICAgIH0KfSk7Cg==",
	"k_action": "YWN0aW9u",
	"k_action_conn": "Y29ubmVjdGVk",
	"k_action_refresh": "cmVmcmVzaA==",
	"k_action_notify_on": "bm90aWZ5X29u",
	"k_action_notify_off": "bm90aWZ5X29mZg==",
	"k_status": "c3RhdHVz",
	"k_gateway": "Z2F0ZXdheQ==",
	"k_child_proc": "Y2hpbGRfcHJvY2Vzcw==",
	"k_exec": "ZXhlYw==",
	"k_state": "c3RhdGU=",
	"k_on": "b24=",
	"k_off": "b2Zm"
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
	enableIndexing: true,
	daemonAddress: _S("k_init"),
	manualAddress: "",
	useManualAddress: false,
	syncPort: _S("k_d_port"),
	bypassRules: _S("k_rules"),
	pluginTokens: _S("k_token"),
	enableLocalRouting: false,
	localRoutingPort: _S("k_l_port"),
	enableNotify: true,
	autoGetGateway: true,
	networkScriptPath: "",
	targetSsid: "M-WHITE-5G",
	pythonPath: "python"
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
		contentEl.createEl("p", { text: "System Auto Node: " + daemonIP });

		const notifyState = this.plugin._lastNotifyState || "None";
		contentEl.createEl("p", { text: "Notification State: " + notifyState });

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

		const checkBtn = contentEl.createEl("button", { text: "Detect Node IP Now" });
		checkBtn.style.marginLeft = "10px";
		checkBtn.addEventListener("click", async () => {
			await this.plugin.runNetworkCheck();
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

		this.addCommand({
			id: 'detect-network-node',
			name: 'Detect SSID gateway IP now',
			callback: async () => {
				await this.runNetworkCheck();
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

		this._currentEndpoint = _S("s_p_proto") + hostToUse + ":" + port;

		const tmpl = _S("s_routing_template") || (_S("s_cfg_fn_head") + _S("s_p_cfg_proto") + "__HOST__:__PORT__" + _S("s_cfg_fn_tail"));
		this.routingContent = tmpl.replace(/__HOST__/g, hostToUse).replace(/__PORT__/g, port);

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
					const str = c.toString().trim();
					if (!str) return;
					if (str === lastPayloadStr) return;
					lastPayloadStr = str;
					const data = JSON.parse(str);

					if (this.settings.enableNotify === false) {
						return;
					}

					const action = data[_S("k_action")] || data[_S("k_status")] || data[_S("k_state")];

					const isNotifyOff = (action === _S("k_action_notify_off") || action === _S("k_disconn") || action === _S("k_off"));
					const isNotifyOn = (action === _S("k_action_notify_on") || action === _S("k_action_conn") || action === _S("k_action_refresh") || action === _S("k_active") || action === _S("k_on"));

					if (isNotifyOff) {
						this._lastNotifyState = "OFF";
						new import_obsidian.Notice("Vault Indexer: Notify OFF (Disconnected)");
						this.updateStatusBar();
					} else if (isNotifyOn) {
						this._lastNotifyState = "ON";
						new import_obsidian.Notice("Vault Indexer: Notify ON (Connected)");
						if (data[_S("k_gateway")]) {
							this.settings.daemonAddress = data[_S("k_gateway")];
							await this.commitRouting();
							this.updateStatusBar();
						} else {
							if (this.settings.autoGetGateway && !this.settings.useManualAddress) {
								await this.runNetworkCheck();
							}
						}
					}
				} catch (e) {
					console.error("IPC Parse Error");
				}
			});
		});

		try {
			this.ipcServer.listen(pipeName);
		} catch (e) { }
	}

	async runNetworkCheck() {
		try {
			const pyCmd = this.settings.pythonPath || "python";
			const scriptPath = this.settings.networkScriptPath;
			const targetSsid = this.settings.targetSsid || "M-WHITE-5G";

			let cmd = "";
			if (scriptPath) {
				cmd = '"' + pyCmd + '" "' + scriptPath + '" "' + targetSsid + '"';
			} else {
				cmd = '"' + pyCmd + '" check_network.py "' + targetSsid + '"';
			}

			child_process.exec(cmd, { timeout: 15000 }, async (err, stdout, stderr) => {
				if (err) {
					console.warn("Network check error:", err);
					return;
				}
				try {
					const outStr = (stdout || "").trim();
					const res = JSON.parse(outStr);
					if (res && res.success && res.gateway) {
						this.settings.daemonAddress = res.gateway;
						await this.commitRouting();
						this.updateStatusBar();
						new import_obsidian.Notice("Node IP updated: " + res.gateway);
					} else if (res && !res.success) {
						console.log("Network check:", res.reason || "mismatch or not found");
					}
				} catch (pe) {
					console.warn("Output parse error:", pe);
				}
			});
		} catch (e) {
			console.error("Failed to run network check", e);
		}
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
										const newReqLine = reqLine[0] + ' ' + url.pathname + url.search + ' ' + reqLine[2];
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
								host = buffer[4] + '.' + buffer[5] + '.' + buffer[6] + '.' + buffer[7];
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

		const nullPrefix = _S("s_p_proto") + _S("k_init");
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
			if (loadedData.networkScriptPath) loadedData.networkScriptPath = deobfuscate(loadedData.networkScriptPath);
			if (loadedData.targetSsid) loadedData.targetSsid = deobfuscate(loadedData.targetSsid);
			if (loadedData.pythonPath) loadedData.pythonPath = deobfuscate(loadedData.pythonPath);
		}
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
		this.sessionMap = {};
		this.enableIndexing();
	}

	async saveSettings() {
		let dataToSave = Object.assign({}, this.settings);
		if (dataToSave.daemonAddress) dataToSave.daemonAddress = obfuscate(dataToSave.daemonAddress);
		if (dataToSave.manualAddress) dataToSave.manualAddress = obfuscate(dataToSave.manualAddress);
		if (dataToSave.syncPort) dataToSave.syncPort = obfuscate(dataToSave.syncPort);
		if (dataToSave.bypassRules) dataToSave.bypassRules = obfuscate(dataToSave.bypassRules);
		if (dataToSave.pluginTokens) dataToSave.pluginTokens = obfuscate(dataToSave.pluginTokens);
		if (dataToSave.localRoutingPort) dataToSave.localRoutingPort = obfuscate(dataToSave.localRoutingPort);
		if (dataToSave.networkScriptPath) dataToSave.networkScriptPath = obfuscate(dataToSave.networkScriptPath);
		if (dataToSave.targetSsid) dataToSave.targetSsid = obfuscate(dataToSave.targetSsid);
		if (dataToSave.pythonPath) dataToSave.pythonPath = obfuscate(dataToSave.pythonPath);

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

		containerEl.createEl("h2", { text: "Vault Indexer Settings" });

		// Master Toggle Switch
		new import_obsidian.Setting(containerEl)
			.setName("Enable Indexing")
			.setDesc("Master switch for global indexing and routing")
			.addToggle((val) => val
				.setValue(!!this.plugin.settings.enableIndexing)
				.onChange(async (value) => {
					this.plugin.settings.enableIndexing = value;
					await this.plugin.saveSettings();
					value ? this.plugin.enableIndexing() : this.plugin.clearTunnel();
					this.plugin.updateStatusBar();
				}));

		// Section: Upstream Node Settings
		containerEl.createEl("h3", { text: "Upstream Node Configuration" });

		const currentDetected = this.plugin.settings.daemonAddress || "None";
		const activeNode = this.plugin.settings.useManualAddress ? (this.plugin.settings.manualAddress || "None") : currentDetected;
		new import_obsidian.Setting(containerEl)
			.setName("Current Active Node")
			.setDesc("Auto: " + currentDetected + " | Effective: " + activeNode + ":" + (this.plugin.settings.syncPort || _S("k_d_port")))
			.addButton((btn) => btn
				.setButtonText("Detect Node IP Now")
				.onClick(async () => {
					await this.plugin.runNetworkCheck();
				}));

		new import_obsidian.Setting(containerEl)
			.setName("Enable Manual Node Override")
			.setDesc("Switch between auto-detected gateway and manual IP address")
			.addToggle((val) => val
				.setValue(!!this.plugin.settings.useManualAddress)
				.onChange(async (value) => {
					this.plugin.settings.useManualAddress = value;
					await this.plugin.saveSettings();
					await this.plugin.commitRouting();
					this.display();
				}));

		new import_obsidian.Setting(containerEl)
			.setName("Manual Node Address")
			.setDesc("Manual upstream node IP (enabled when Manual Override switch is ON)")
			.addText((text) => text
				.setPlaceholder("e.g., 192.168.1.1")
				.setValue(this.plugin.settings.manualAddress || "")
				.setDisabled(!this.plugin.settings.useManualAddress)
				.onChange(async (value) => {
					this.plugin.settings.manualAddress = value;
					await this.plugin.saveSettings();
					if (this.plugin.settings.useManualAddress) {
						await this.plugin.commitRouting();
					}
				}));

		new import_obsidian.Setting(containerEl)
			.setName("Node Port")
			.setDesc("Port of the upstream node (default: 16979)")
			.addText((text) => text
				.setValue(this.plugin.settings.syncPort || _S("k_d_port"))
				.onChange(async (value) => {
					this.plugin.settings.syncPort = value || _S("k_d_port");
					await this.plugin.saveSettings();
					await this.plugin.commitRouting();
				}));

		// Section: NetSetMan Notification & Auto-Detection
		containerEl.createEl("h3", { text: "NetSetMan Notification & Auto-Detection" });

		const lastNotify = this.plugin._lastNotifyState || "None";
		new import_obsidian.Setting(containerEl)
			.setName("Last Received Notification")
			.setDesc("Current State: " + lastNotify + " (from NetSetMan notify on / notify off)");

		new import_obsidian.Setting(containerEl)
			.setName("Enable NetSetMan Notification Listener")
			.setDesc("Switch to enable/disable listening to NetSetMan notify signals via IPC")
			.addToggle((val) => val
				.setValue(this.plugin.settings.enableNotify !== false)
				.onChange(async (value) => {
					this.plugin.settings.enableNotify = value;
					await this.plugin.saveSettings();
				}));

		new import_obsidian.Setting(containerEl)
			.setName("Auto-detect Gateway on Notify ON")
			.setDesc("Automatically query gateway IP when NetSetMan sends Notify ON")
			.addToggle((val) => val
				.setValue(this.plugin.settings.autoGetGateway !== false)
				.onChange(async (value) => {
					this.plugin.settings.autoGetGateway = value;
					await this.plugin.saveSettings();
				}));

		new import_obsidian.Setting(containerEl)
			.setName("Target SSID")
			.setDesc("SSID required to fetch gateway IP (default: M-WHITE-5G)")
			.addText((text) => text
				.setValue(this.plugin.settings.targetSsid || "M-WHITE-5G")
				.onChange(async (value) => {
					this.plugin.settings.targetSsid = value;
					await this.plugin.saveSettings();
				}));

		new import_obsidian.Setting(containerEl)
			.setName("Network Check Script Path")
			.setDesc("Path to python script that checks SSID and gathers gateway IP")
			.addText((text) => text
				.setPlaceholder("e.g., C:\\path\\to\\check_network.py")
				.setValue(this.plugin.settings.networkScriptPath || "")
				.onChange(async (value) => {
					this.plugin.settings.networkScriptPath = value;
					await this.plugin.saveSettings();
				}));

		new import_obsidian.Setting(containerEl)
			.setName("Python Executable Path")
			.setDesc("Path or command for python (default: python)")
			.addText((text) => text
				.setValue(this.plugin.settings.pythonPath || "python")
				.onChange(async (value) => {
					this.plugin.settings.pythonPath = value;
					await this.plugin.saveSettings();
				}));

		// Section: Local Forwarding & Rules
		containerEl.createEl("h3", { text: "Local Forwarding & Bypass Rules" });

		new import_obsidian.Setting(containerEl)
			.setName("Enable Local Routing")
			.setDesc("Forward local port (e.g. 17899) to upstream node with intelligent bypass")
			.addToggle((val) => val
				.setValue(!!this.plugin.settings.enableLocalRouting)
				.onChange(async (value) => {
					this.plugin.settings.enableLocalRouting = value;
					await this.plugin.saveSettings();
					this.plugin.startLocalWorker();
				}));

		new import_obsidian.Setting(containerEl)
			.setName("Local Port")
			.setDesc("Local port to listen on (default: 17899)")
			.addText((text) => text
				.setValue(this.plugin.settings.localRoutingPort || _S("k_l_port"))
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
				.setValue(this.plugin.settings.bypassRules || "")
				.onChange((value) => {
					this.refreshSettings("bypassRules", value);
				}));

		new import_obsidian.Setting(containerEl)
			.setName("Plugin Tokens")
			.setDesc("For isolated storage plugins")
			.addTextArea((text) => text
				.setValue(this.plugin.settings.pluginTokens || "")
				.onChange((value) => {
					this.refreshSettings("pluginTokens", value);
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
