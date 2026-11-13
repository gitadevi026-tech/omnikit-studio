(() => {
  "use strict";

  const tools = [
    { id: "organizer", name: "File Organizer", icon: "▤", description: "Sort files into tidy folders by type.", detail: "Choose a folder and let OmniKit sort its files into clear categories. Existing files are never overwritten." },
    { id: "compressor", name: "Image Compressor", icon: "▧", description: "Resize and optimize an image.", detail: "Resize photos and save a lighter JPEG, PNG, or WebP copy directly to your computer." },
    { id: "vault", name: "Password Safe", icon: "⌑", description: "Create and keep secure passwords.", detail: "Generate strong passwords and manage credentials in a local JSON file. Saved entries are not encrypted." },
    { id: "system", name: "System Health", icon: "◉", description: "See your device's live resource use.", detail: "Check real-time processor, memory, disk, and battery information from your device." },
    { id: "pdf", name: "PDF Tools", icon: "▧", description: "Merge documents or extract pages.", detail: "Combine PDF documents or extract selected pages into a new PDF file." },
    { id: "text", name: "Text & Markdown", icon: "T", description: "Transform, clean, and count text.", detail: "Quickly change letter case, tidy whitespace, and see useful writing statistics." },
    { id: "qr", name: "QR Code Studio", icon: "▦", description: "Make a QR code from any text.", detail: "Create a crisp, scannable PNG QR code from a link or any short message." },
    { id: "converter", name: "Unit Converter", icon: "⇄", description: "Convert common everyday units.", detail: "Convert length, weight, temperature, data, speed, and reference currency values." },
    { id: "notes", name: "Tasks & Notes", icon: "✓", description: "Keep a simple to-do list and notes.", detail: "Add tasks, tick off your progress, and keep a scratchpad saved on this device." },
    { id: "network", name: "Network Check", icon: "⌁", description: "Measure host connection latency.", detail: "Check a network host's connection time and see your local network details." }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const modal = $("#tool-modal");
  const modalContent = $("#modal-content");
  const resultBox = $("#modal-result");
  let currentTool = null;
  let modalGeneration = 0;
  let previousFocus = null;
  let toastTimer = 0;
  let activity = [];
  let dashboardData = { tasks: [], notes: "", stats: {} };
  const cpuHistory = [];
  const diskHistory = [];
  let pendingNotes = null;
  let notesSaveTimer;
  let notesSaveQueue = Promise.resolve();
  let convertTimer;
  let dashboardRefreshInFlight = false;
  let lastDashboardError = "";
  const pointerFrames = new WeakMap();

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  function notify(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function api() {
    const bridge = window.pywebview && window.pywebview.api;
    if (!bridge) throw new Error("The desktop bridge is unavailable. Start OmniKit Studio with python main.py.");
    return bridge;
  }

  async function invoke(method, ...args) {
    const bridge = api();
    if (typeof bridge[method] !== "function") throw new Error(`The desktop action "${method}" is unavailable.`);
    return bridge[method](...args);
  }

  function recordActivity(tool, message) {
    activity.unshift({ icon: tool.icon, name: tool.name, message, time: new Date() });
    activity = activity.slice(0, 12);
    renderActivity();
  }

  function renderShortcuts() {
    $("#tool-shortcuts").innerHTML = tools.slice(0, 6).map((tool) =>
      `<button class="mini-tool" data-open-tool="${tool.id}"><span class="mini-icon">${tool.icon}</span><span>${tool.name}</span></button>`
    ).join("");
    $("#tool-timeline").innerHTML = tools.slice(0, 5).map((tool, index) =>
      `<button class="timeline-item" data-open-tool="${tool.id}" title="${escapeHtml(tool.name)}"><span class="timeline-dot"></span><span class="timeline-year">${["01","02","03","04","05"][index]}</span><span class="timeline-name">${escapeHtml(tool.name)}</span></button>`
    ).join("");
    $("#all-tools-grid").innerHTML = tools.map((tool) =>
      `<button class="tool-card" data-open-tool="${tool.id}"><span class="tool-card-top"><span class="tool-card-icon">${tool.icon}</span><span class="tool-card-arrow">↗</span></span><h3>${escapeHtml(tool.name)}</h3><p>${escapeHtml(tool.description)}</p></button>`
    ).join("");
  }

  function renderActivity() {
    const list = $("#activity-list");
    if (!activity.length) {
      list.innerHTML = `<div class="activity-item"><span class="tool-card-icon">✳</span><span><b>All quiet for now</b><small>When you use a tool, you'll find it here.</small></span></div>`;
      return;
    }
    list.innerHTML = activity.map((item) =>
      `<div class="activity-item"><span class="tool-card-icon">${item.icon}</span><span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.message)}</small></span><time>${item.time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></div>`
    ).join("");
  }

  function updateTasks(tasks = []) {
    const complete = tasks.filter((task) => task.done).length;
    const percent = tasks.length ? Math.round((complete / tasks.length) * 100) : 0;
    $("#task-count").textContent = `${complete} of ${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;
    $("#task-percent").textContent = `${percent}%`;
    $("#task-donut").style.background = `conic-gradient(#3659e8 ${percent * 3.6}deg,var(--donut-track) ${percent * 3.6}deg 360deg)`;
    $("#task-summary").textContent = tasks.length
      ? tasks.length === complete ? "Everything is checked off. Lovely work!" : `${tasks.length - complete} ${tasks.length - complete === 1 ? "little thing" : "little things"} left to do.`
      : "Add a task to get started.";
    $("#focus-foot-copy").textContent = tasks.length && complete === tasks.length ? "You did everything on your list. Nice work." : "Make today count, one task at a time.";
  }

  function updateMetrics(stats = {}) {
    const metric = (value) => value !== null && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null;
    const cpu = metric(stats.cpu);
    const ram = metric(stats.ram);
    const disk = metric(stats.disk);
    $("#cpu-value").textContent = cpu === null ? "—" : Math.round(cpu);
    $("#ram-value").textContent = ram === null ? "—" : Math.round(ram);
    $("#disk-value").textContent = disk === null ? "—" : Math.round(disk);
    $("#cpu-caption").textContent = cpu === null ? "Device data unavailable" : "Processor in use";
    $("#ram-caption").textContent = stats.ram_used && stats.ram_total
      ? `${stats.ram_used} of ${stats.ram_total} in use`
      : "System memory";
    if (ram !== null) {
      $("#ram-bar").style.width = `${Math.max(0, Math.min(100, ram))}%`;
      $("#ram-bar").nextElementSibling.style.left = `${Math.max(0, Math.min(100, ram))}%`;
    } else {
      $("#ram-bar").style.width = "0%";
    }
    $("#device-name").textContent = stats.host || "Device";
    const deviceStatus = $(".device-status");
    if (deviceStatus) deviceStatus.lastChild.textContent = disk === null ? " Unavailable" : " Live";
    if (disk === null) $("#storage-bars").setAttribute("aria-label", "Storage usage is unavailable");
    $("#system-caption").textContent = stats.os ? `${stats.os} · Your data stays on this device` : "Your data stays on this device";
    if (cpu !== null) {
      cpuHistory.push(cpu);
      if (cpuHistory.length > 18) cpuHistory.shift();
      const points = cpuHistory.map((value, index) => ({
        x: cpuHistory.length === 1 ? 360 : index * 360 / (cpuHistory.length - 1),
        y: 72 - Math.max(0, Math.min(100, value)) * 0.56
      }));
      let line = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
      for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1];
        const point = points[index];
        const midpoint = (previous.x + point.x) / 2;
        line += ` C${midpoint.toFixed(1)} ${previous.y.toFixed(1)} ${midpoint.toFixed(1)} ${point.y.toFixed(1)} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
      }
      const paths = $$(".line-chart path");
      paths[0].setAttribute("d", `${line} L360 80 L0 80 Z`);
      paths[1].setAttribute("d", line);
      const currentPoint = points[points.length - 1];
      $$(".chart-current-point, .chart-current-halo").forEach((circle) => {
        circle.setAttribute("cx", currentPoint.x.toFixed(1));
        circle.setAttribute("cy", currentPoint.y.toFixed(1));
      });
    }
    if (disk !== null) {
      diskHistory.push(disk);
      if (diskHistory.length > 12) diskHistory.shift();
      $$("#storage-bars i").forEach((bar, index) => {
        bar.style.height = `${diskHistory[index] ?? 0}%`;
        bar.title = diskHistory[index] === undefined ? "Waiting for a live sample" : `${diskHistory[index].toFixed(1)}% storage used`;
      });
      $("#storage-bars").setAttribute("aria-label", `Live storage use: ${disk.toFixed(1)}%`);
    }
  }

  async function refreshDashboard() {
    if (!window.pywebview || !window.pywebview.api) {
      $("#engine-status").textContent = "Waiting for local desktop engine";
      return false;
    }
    if (dashboardRefreshInFlight) return false;
    dashboardRefreshInFlight = true;
    try {
      const data = await invoke("get_dashboard_data");
      if (!data || !data.stats) throw new Error("The local engine returned incomplete dashboard data.");
      dashboardData = data;
      updateTasks(data.tasks);
      updateMetrics(data.stats);
      if (currentTool && currentTool.id === "system" && !modal.classList.contains("hidden")) updateSystemPanel(data.stats);
      $("#engine-status").textContent = "Local engine connected";
      lastDashboardError = "";
      return true;
    } catch (error) {
      $("#engine-status").textContent = "Local engine needs attention";
      const message = error.message || String(error);
      if (message !== lastDashboardError) notify(message);
      lastDashboardError = message;
      return false;
    } finally {
      dashboardRefreshInFlight = false;
    }
  }

  function setView(name) {
    const views = ["home", "tools", "activity", "settings"];
    views.forEach((view) => {
      const section = $(`#${view}-view`);
      if (section) section.classList.toggle("hidden", view !== name);
    });
    $$(".nav-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === name));
  }

  function showModal(toolId) {
    const tool = tools.find((item) => item.id === toolId);
    if (!tool) return;
    const generation = ++modalGeneration;
    if (modal.classList.contains("hidden")) previousFocus = document.activeElement;
    currentTool = tool;
    document.body.classList.add("modal-open");
    $("#modal-icon").textContent = tool.icon;
    $("#modal-title").textContent = tool.name;
    $("#modal-description").textContent = tool.detail;
    $("#modal-kicker").textContent = "OMNIKIT TOOL";
    resultBox.className = "modal-result hidden";
    resultBox.textContent = "";
    modalContent.innerHTML = toolForm(toolId);
    modal.classList.remove("hidden");
    modalContent.querySelector("input,textarea,select,button")?.focus();
    if (toolId === "converter") renderUnits();
    if (toolId === "system") refreshSystemPanel();
    if (toolId === "notes") loadNotesPanel(generation);
    if (toolId === "vault") loadVaultPanel(generation);
  }

  function closeModal() {
    flushNotesSave();
    modalGeneration += 1;
    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
    currentTool = null;
    const focusTarget = previousFocus;
    previousFocus = null;
    if (focusTarget?.isConnected && typeof focusTarget.focus === "function") focusTarget.focus();
  }

  function field(label, control, full = false) {
    const controlId = control.match(/\bid="([^"]+)"/)?.[1];
    return `<div class="field${full ? " full" : ""}"><label${controlId ? ` for="${controlId}"` : ""}>${label}</label>${control}</div>`;
  }

  function pathInput(id, placeholder, kind) {
    return `<div class="file-row"><input id="${id}" placeholder="${placeholder}" autocomplete="off"><button type="button" data-picker="${kind}" data-target="${id}">Browse…</button></div>`;
  }

  function formActions(action, label = "Continue") {
    return `<div class="form-actions"><button class="button-secondary" type="button" data-close-modal>Cancel</button><button class="button-primary" type="button" data-action="${action}">${label}</button></div>`;
  }

  function toolForm(id) {
    switch (id) {
      case "organizer":
        return `<div class="form-grid">${field("Folder to organize", pathInput("folder-path", "Choose a folder on this device…", "folder"), true)}${field("File types to sort", `<div class="check-row">${["Documents","Images","Videos","Audio","Archives","Code"].map((name) => `<label><input type="checkbox" name="category" value="${name}" checked>${name}</label>`).join("")}</div>`, true)}</div>${formActions("organize", "Organize files")}`;
      case "compressor":
        return `<div class="form-grid">${field("Image to process", pathInput("image-path", "Select a local image…", "image"), true)}${field("Save as", pathInput("image-output", "Choose output file…", "save-image"), true)}${field("Quality (5–100)", `<input id="image-quality" type="number" min="5" max="100" value="75">`)}${field("Format", `<select id="image-format"><option>JPEG</option><option>PNG</option><option>WEBP</option></select>`)}${field("Width (px)", `<input id="image-width" type="number" min="1" placeholder="Keep original">`)}${field("Height (px)", `<input id="image-height" type="number" min="1" placeholder="Keep original">`)}</div>${formActions("compress", "Process image")}`;
      case "vault":
        return `<div class="form-grid"><div class="field full"><label>Password generator</label><div class="file-row"><input id="generated-password" readonly placeholder="Click generate for a secure password"><button type="button" data-action="generate-password">Generate</button></div></div>${field("Length", `<input id="password-length" type="number" min="8" max="64" value="20">`)}${field("Characters", `<div class="check-row"><label><input type="checkbox" name="charset" value="upper" checked>A–Z</label><label><input type="checkbox" name="charset" value="lower" checked>a–z</label><label><input type="checkbox" name="charset" value="digits" checked>0–9</label><label><input type="checkbox" name="charset" value="symbols" checked>Symbols</label></div>`)}${field("Service", `<input id="vault-service" placeholder="Website or service">`)}${field("Username", `<input id="vault-username" placeholder="Email or username">`)}${field("Password to save", `<input id="vault-password" type="password" placeholder="Enter or generate a password">`)}${field("Saved credentials", `<div id="vault-list" class="vault-list"><span>Loading your private vault…</span></div>`, true)}</div>${formActions("save-credential", "Save to vault")}`;
      case "system":
        return `<div class="system-panel" id="system-panel"><span class="muted">Reading real system metrics…</span></div><div class="form-actions"><button class="button-secondary" type="button" data-action="refresh-system">Refresh</button></div>`;
      case "pdf":
        return `<div class="form-grid"><div class="field full"><label>Action</label><select id="pdf-action"><option value="merge">Merge PDF files</option><option value="split">Extract selected pages</option></select></div><div class="field full"><label>PDF file(s)</label><div class="file-row"><input id="pdf-paths" placeholder="Select PDF file(s)…" autocomplete="off"><button type="button" data-picker="pdfs" data-target="pdf-paths">Browse…</button></div></div><div class="field full" id="page-range-field" hidden><label for="page-range">Pages to extract (e.g. 1-3, 5)</label><input id="page-range" placeholder="1-3, 5"></div>${field("Save as", pathInput("pdf-output", "Choose output PDF…", "save-pdf"), true)}</div>${formActions("pdf", "Create PDF")}`;
      case "text":
        return `<div class="form-grid">${field("Your text", `<textarea id="text-source" placeholder="Type or paste your text here…"></textarea>`, true)}${field("Writing stats", `<span id="text-stats" class="muted">0 words · 0 characters · 0 lines</span>`, true)}</div><div class="form-actions text-actions"><button class="button-secondary" type="button" data-action="transform" data-mode="upper">UPPERCASE</button><button class="button-secondary" type="button" data-action="transform" data-mode="lower">lowercase</button><button class="button-secondary" type="button" data-action="transform" data-mode="title">Title Case</button><button class="button-secondary" type="button" data-action="transform" data-mode="strip">Tidy spaces</button><button class="button-primary" type="button" data-action="copy-text">Copy text</button></div>`;
      case "qr":
        return `<div class="form-grid">${field("What would you like to do?", `<select id="qr-mode"><option value="generate">Create a QR code</option><option value="decode">Read a QR image</option></select>`, true)}<div class="field full" id="qr-generate-fields"><div class="form-grid">${field("Link or message", `<input id="qr-text" placeholder="https://example.com">`, true)}${field("Save PNG as", pathInput("qr-output", "Choose where to save your QR code…", "save-png"), true)}${field("QR color", `<select id="qr-color"><option value="blue">Electric blue</option><option value="black">Classic black</option><option value="green">Emerald green</option><option value="purple">Deep purple</option></select>`)}</div></div><div class="field full hidden" id="qr-decode-fields">${field("QR image", pathInput("qr-image-path", "Select an image containing a QR code…", "qr-image"), true)}${field("Decoded content", `<textarea id="qr-decoded" readonly placeholder="Your QR code content will appear here…"></textarea>`, true)}</div></div><div class="form-actions" id="qr-generate-actions"><button class="button-primary" type="button" data-action="qr">Create QR code</button></div><div class="form-actions hidden" id="qr-decode-actions"><button class="button-primary" type="button" data-action="decode-qr">Read QR image</button></div>`;
      case "converter":
        return `<div class="form-grid">${field("Category", `<select id="convert-category"><option>Length</option><option>Weight</option><option>Temperature</option><option>Data Storage</option><option>Speed</option><option>Currency</option></select>`)}${field("Amount", `<input id="convert-value" type="number" value="10" step="any">`)}${field("From", `<select id="convert-from"></select>`)}${field("To", `<select id="convert-to"></select>`) }${field("Result", `<input id="convert-result" readonly>`, true)}</div><div class="form-actions"><button class="button-primary" type="button" data-action="convert">Convert</button></div>`;
      case "notes":
        return `<div class="form-grid">${field("New task", `<div class="file-row"><input id="new-task" placeholder="Add something you want to get done…"><button type="button" data-action="add-task">Add</button></div>`, true)}${field("Priority", `<select id="task-priority"><option>Medium</option><option>High</option><option>Low</option></select>`)}${field("Your task list", `<div class="task-list" id="modal-task-list">Loading your tasks…</div>`, true)}${field("Scratchpad · saves automatically", `<textarea id="scratchpad" placeholder="A place for the little things…"></textarea>`, true)}<div class="field full"><label>Export notes</label><div class="file-row"><input id="notes-output" placeholder="Choose a .txt file…"><button type="button" data-picker="save-text" data-target="notes-output">Browse…</button></div></div></div><div class="form-actions"><button class="button-secondary" type="button" data-action="export-notes">Export notes</button></div>`;
      case "network":
        return `<div class="form-grid">${field("Host name or IP address", `<input id="network-host" value="1.1.1.1" placeholder="example.com">`, true)}<div class="field full"><label>Quick choices</label><div class="check-row"><button class="button-secondary" type="button" data-host="1.1.1.1">Cloudflare</button><button class="button-secondary" type="button" data-host="8.8.8.8">Google DNS</button><button class="button-secondary" type="button" data-host="github.com">GitHub</button></div></div></div>${formActions("network", "Check connection")}`;
      default: return "";
    }
  }

  async function choosePath(kind) {
    const filters = {
      image: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "bmp", "gif"] }],
      pdf: [{ name: "PDF", extensions: ["pdf"] }],
      saveImage: [{ name: "Image", extensions: ["jpg", "png", "webp"] }],
      savePdf: [{ name: "PDF", extensions: ["pdf"] }],
      savePng: [{ name: "PNG image", extensions: ["png"] }],
      saveText: [{ name: "Text file", extensions: ["txt"] }]
    };
    const mode = kind.startsWith("save-") ? "save" : kind === "folder" ? "folder" : "open";
    return invoke("pick_path", mode, kind, filters[kind] || []);
  }

  async function handlePicker(button) {
    const generation = modalGeneration;
    const tool = currentTool;
    const kind = button.dataset.picker;
    if (kind === "pdfs") {
      const selected = await invoke("pick_multiple_pdfs");
      if (generation !== modalGeneration || currentTool !== tool) return;
      if (selected && selected.length) $("#pdf-paths").value = selected.join(" | ");
      return;
    }
    const path = await choosePath(kind);
    if (generation !== modalGeneration || currentTool !== tool) return;
    if (path) {
      $(`#${button.dataset.target}`).value = path;
      if (kind === "image" && button.dataset.target === "image-path" && currentTool?.id === "compressor") {
        try {
          const dimensions = await invoke("image_info", path);
          if (generation !== modalGeneration || currentTool !== tool) return;
          $("#image-width").value = dimensions.width;
          $("#image-height").value = dimensions.height;
          $("#image-output").placeholder = `Choose output · ${dimensions.name}`;
        } catch (error) { showResult(error.message, true); }
      }
      if (kind === "save-image") {
        const extension = path.split(".").pop().toLowerCase();
        $("#image-format").value = extension === "png" ? "PNG" : extension === "webp" ? "WEBP" : "JPEG";
      }
    }
  }

  function showResult(message, isError = false) {
    if (modal.classList.contains("hidden")) return;
    resultBox.textContent = message;
    resultBox.className = `modal-result${isError ? " error" : ""}`;
  }

  async function runAction(button) {
    const action = button.dataset.action;
    if (!action || !currentTool) return;
    const tool = currentTool;
    const original = button.textContent;
    button.disabled = true;
    if (["organize", "compress", "pdf", "qr", "network"].includes(action)) button.textContent = "Working…";
    try {
      if (action === "organize") {
        const folder = $("#folder-path").value.trim();
        if (!folder) throw new Error("Choose a folder to organize.");
        const categories = $$('input[name="category"]:checked').map((input) => input.value);
        const result = await invoke("organize_files", folder, categories);
        recordActivity(tool, result.message);
        if (currentTool !== tool) return;
        showResult(result.message);
        await refreshDashboard();
      } else if (action === "compress") {
        const source = $("#image-path").value.trim();
        const output = $("#image-output").value.trim();
        if (!source || !output) throw new Error("Choose an image and a destination file.");
        const result = await invoke("compress_image", source, output, Number($("#image-quality").value), $("#image-format").value, $("#image-width").value || null, $("#image-height").value || null);
        recordActivity(tool, "Image processed and saved.");
        if (currentTool !== tool) return;
        showResult(`${result.message} Original: ${result.original_size}; new file: ${result.output_size}.`);
      } else if (action === "generate-password") {
        const options = $$('input[name="charset"]:checked').map((input) => input.value);
        const password = await invoke("generate_password", Number($("#password-length").value), options);
        if (currentTool !== tool) return;
        $("#generated-password").value = password;
        $("#vault-password").value = password;
        showResult("A secure password was generated on this device.");
      } else if (action === "save-credential") {
        const service = $("#vault-service").value.trim();
        const username = $("#vault-username").value.trim();
        const password = $("#vault-password").value || $("#generated-password").value;
        if (!service || !password) throw new Error("Enter a service and password before saving.");
        await invoke("save_credential", service, username, password);
        recordActivity(tool, `Saved a credential for ${service}.`);
        if (currentTool !== tool) return;
        await loadVaultPanel(modalGeneration);
        $("#vault-service").value = "";
        $("#vault-username").value = "";
        $("#vault-password").value = "";
        showResult("Saved to your local vault. Entries are stored unencrypted on this device.");
      } else if (action === "refresh-system") {
        if (await refreshSystemPanel(true)) recordActivity(tool, "Refreshed live system metrics.");
      } else if (action === "pdf") {
        const mode = $("#pdf-action").value;
        const paths = $("#pdf-paths").value.split(" | ").map((path) => path.trim()).filter(Boolean);
        const output = $("#pdf-output").value.trim();
        if (!paths.length || !output) throw new Error("Choose the PDF file(s) and a destination.");
        let response;
        if (mode === "merge") response = await invoke("merge_pdfs", paths, output);
        else {
          const pages = $("#page-range").value.trim();
          if (!pages) throw new Error("Enter the page numbers to extract.");
          response = await invoke("split_pdf", paths[0], pages, output);
        }
        recordActivity(tool, response.message);
        if (currentTool !== tool) return;
        showResult(response.message);
      } else if (action === "transform") {
        const textarea = $("#text-source");
        const transformed = await invoke("transform_text", textarea.value, button.dataset.mode);
        if (currentTool !== tool) return;
        textarea.value = transformed;
        updateTextStats();
      } else if (action === "copy-text") {
        await invoke("copy_to_clipboard", $("#text-source").value);
        if (currentTool !== tool) return;
        showResult("Text copied to the clipboard.");
      } else if (action === "qr") {
        const text = $("#qr-text").value.trim();
        const output = $("#qr-output").value.trim();
        if (!text || !output) throw new Error("Enter a message and choose where to save the QR image.");
        const response = await invoke("generate_qr", text, output, $("#qr-color").value);
        recordActivity(tool, "QR code generated and saved.");
        if (currentTool !== tool) return;
        showResult(response.message);
      } else if (action === "decode-qr") {
        const path = $("#qr-image-path").value.trim();
        if (!path) throw new Error("Choose an image containing a QR code.");
        const decoded = await invoke("decode_qr", path);
        recordActivity(tool, "QR code read from an image.");
        if (currentTool !== tool) return;
        $("#qr-decoded").value = decoded;
        showResult("QR code decoded successfully.");
      } else if (action === "convert") {
        $("#convert-result").value = "";
        const rawValue = $("#convert-value").value.trim();
        if (!rawValue) throw new Error("Enter an amount to convert.");
        const value = Number(rawValue);
        if (!Number.isFinite(value)) throw new Error("Enter a valid amount to convert.");
        const result = await invoke("convert_units", $("#convert-category").value, value, $("#convert-from").value, $("#convert-to").value);
        if (currentTool !== tool) return;
        $("#convert-result").value = result;
      } else if (action === "add-task") {
        const input = $("#new-task");
        if (!input.value.trim()) throw new Error("Write a task before adding it.");
        const tasks = await invoke("add_task", input.value.trim(), $("#task-priority").value);
        recordActivity(tool, "Added a new task.");
        if (currentTool !== tool) return;
        input.value = "";
        updateTasks(tasks);
        renderTaskList(tasks);
      } else if (action === "toggle-task") {
        const tasks = await invoke("toggle_task", button.dataset.taskId);
        if (currentTool !== tool) return;
        updateTasks(tasks);
        renderTaskList(tasks);
      } else if (action === "delete-task") {
        const tasks = await invoke("delete_task", button.dataset.taskId);
        if (currentTool !== tool) return;
        updateTasks(tasks);
        renderTaskList(tasks);
      } else if (action === "delete-credential") {
        await invoke("delete_credential", button.dataset.credentialId);
        if (currentTool !== tool) return;
        await loadVaultPanel(modalGeneration);
        showResult("Credential removed from your local vault.");
      } else if (action === "export-notes") {
        const output = $("#notes-output").value.trim();
        if (!output) throw new Error("Choose a destination for your notes.");
        await invoke("export_notes", $("#scratchpad").value, output);
        if (currentTool !== tool) return;
        showResult("Your notes were exported.");
      } else if (action === "network") {
        const host = $("#network-host").value.trim();
        if (!host) throw new Error("Enter a host name or IP address.");
        const response = await invoke("network_test", host);
        recordActivity(tool, `Checked ${response.host}: ${response.latency_ms} ms.`);
        if (currentTool !== tool) return;
        showResult(`${response.host}: ${response.latency_ms} ms round trip · Local IP ${response.local_ip} · ${response.hostname}`);
      }
    } catch (error) {
      if (currentTool === tool) showResult(error.message || String(error), true);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function updateTextStats() {
    const value = $("#text-source").value;
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;
    const lines = value ? value.split(/\r\n|\r|\n/).length : 0;
    const sentences = (value.match(/[.!?]+(?=\s|$)/g) || []).length;
    $("#text-stats").textContent = `${words} ${words === 1 ? "word" : "words"} · ${value.length} characters · ${lines} ${lines === 1 ? "line" : "lines"} · ${sentences} ${sentences === 1 ? "sentence" : "sentences"}`;
  }

  function updateSystemPanel(stats) {
    const panel = $("#system-panel");
    if (!panel) return;
    const percentage = (value) => value !== null && value !== undefined && Number.isFinite(Number(value))
      ? `${Number(value).toFixed(1)}%`
      : "Unavailable";
    const rows = [
      ["Processor", percentage(stats.cpu)],
      ["Memory", `${percentage(stats.ram)}${stats.ram_used ? ` · ${stats.ram_used} / ${stats.ram_total}` : ""}`],
      ["Storage", stats.disk == null ? "Unavailable" : `${percentage(stats.disk)} used`],
      ["Battery", stats.battery == null ? "No battery detected" : `${Math.round(stats.battery)}%${stats.charging ? " · Charging" : ""}`],
      ["Device", stats.host || "Unavailable"],
      ["Operating system", stats.os || "Unavailable"]
    ];
    panel.innerHTML = rows.map(([label, value]) => `<div class="system-row"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join("");
  }

  async function refreshSystemPanel(force = false, generation = modalGeneration) {
    if (!force && dashboardData.stats && Number.isFinite(Number(dashboardData.stats.cpu))) {
      updateSystemPanel(dashboardData.stats);
      return true;
    }
    try {
      const stats = await invoke("get_system_metrics");
      if (generation !== modalGeneration || currentTool?.id !== "system") return false;
      dashboardData.stats = stats;
      updateMetrics(stats);
      updateSystemPanel(stats);
      return true;
    } catch (error) {
      if (generation !== modalGeneration || currentTool?.id !== "system") return false;
      const panel = $("#system-panel");
      if (panel) panel.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
      return false;
    }
  }

  function flushNotesSave() {
    clearTimeout(notesSaveTimer);
    if (pendingNotes === null) return notesSaveQueue;
    const notes = pendingNotes;
    pendingNotes = null;
    notesSaveQueue = notesSaveQueue.then(() => invoke("save_notes", notes)).catch((error) => {
      const message = error.message || String(error);
      if (currentTool?.id === "notes" && !modal.classList.contains("hidden")) showResult(message, true);
      else notify(message);
    });
    return notesSaveQueue;
  }

  async function loadNotesPanel(generation = modalGeneration) {
    try {
      flushNotesSave();
      await notesSaveQueue;
      if (generation !== modalGeneration || currentTool?.id !== "notes") return;
      const data = await invoke("get_local_data");
      if (generation !== modalGeneration || currentTool?.id !== "notes") return;
      dashboardData = { ...dashboardData, ...data };
      updateTasks(data.tasks || []);
      renderTaskList(data.tasks || []);
      const notesField = $("#scratchpad");
      if (pendingNotes === null && document.activeElement !== notesField) notesField.value = data.notes || "";
    } catch (error) {
      if (generation === modalGeneration && currentTool?.id === "notes") showResult(error.message, true);
    }
  }

  function renderTaskList(tasks) {
    const list = $("#modal-task-list");
    if (!list) return;
    list.innerHTML = tasks.length ? tasks.map((task) =>
      `<div class="task-row"><label><input type="checkbox" data-action="toggle-task" data-task-id="${escapeHtml(task.id)}"${task.done ? " checked" : ""}> <span${task.done ? ' class="done"' : ""}>${escapeHtml(task.text)}</span></label><small>${escapeHtml(task.priority || "Medium")}</small><button type="button" data-action="delete-task" data-task-id="${escapeHtml(task.id)}" aria-label="Delete task">×</button></div>`
    ).join("") : `<span class="muted">Your list is clear. Add a task above.</span>`;
  }

  async function loadVaultPanel(generation = modalGeneration) {
    try {
      const entries = await invoke("get_vault");
      if (generation !== modalGeneration || currentTool?.id !== "vault") return;
      const list = $("#vault-list");
      if (!list) return;
      list.innerHTML = entries.length ? entries.map((entry) =>
        `<div class="vault-row"><span><b>${escapeHtml(entry.service)}</b><small>${escapeHtml(entry.username || "No username")}</small></span><button type="button" data-action="delete-credential" data-credential-id="${escapeHtml(entry.id)}">Remove</button></div>`
      ).join("") : `<span class="muted">No credentials saved yet.</span>`;
    } catch (error) {
      if (generation === modalGeneration && currentTool?.id === "vault") showResult(error.message, true);
    }
  }

  function renderUnits() {
    const categories = {
      "Length": ["Meters", "Kilometers", "Miles", "Feet", "Inches"],
      "Weight": ["Kilograms", "Grams", "Pounds (lbs)", "Ounces (oz)"],
      "Temperature": ["Celsius", "Fahrenheit", "Kelvin"],
      "Data Storage": ["Megabytes (MB)", "Gigabytes (GB)", "Terabytes (TB)", "Kilobytes (KB)"],
      "Speed": ["Kilometers/h", "Miles/h", "Meters/sec", "Knots"],
      "Currency": ["USD ($)", "EUR (€)", "GBP (£)", "JPY (¥)", "INR (₹)"]
    };
    const units = categories[$("#convert-category").value];
    ["#convert-from", "#convert-to"].forEach((selector) => {
      const select = $(selector);
      const previous = select.value;
      select.innerHTML = units.map((unit) => `<option>${escapeHtml(unit)}</option>`).join("");
      if (units.includes(previous)) select.value = previous;
    });
    $("#convert-from").value = units[0];
    $("#convert-to").value = units[1] || units[0];
  }

  document.addEventListener("click", async (event) => {
    const target = event.target instanceof Element ? event.target.closest("button, a[data-view]") : null;
    if (!target) return;
    if (target.dataset.view) {
      event.preventDefault();
      setView(target.dataset.view);
      return;
    }
    if (target.dataset.openTool) { showModal(target.dataset.openTool); return; }
    if (target.hasAttribute("data-close-modal") || target.id === "modal-close") { closeModal(); return; }
    if (target.dataset.picker) {
      try { await handlePicker(target); } catch (error) { showResult(error.message, true); }
      return;
    }
    if (target.dataset.host) { $("#network-host").value = target.dataset.host; return; }
    if (target.dataset.action) { await runAction(target); return; }
    if (target.id === "refresh-button") {
      const refreshed = await refreshDashboard();
      if (refreshed) notify("Your dashboard is up to date.");
    }
  });

  document.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    const surface = event.target instanceof Element
      ? event.target.closest(".card, .tool-card, .quick-action, .nav-tab, .mini-tool, .icon-button, .primary-button, .button-primary, .button-secondary, .file-row button, .modal-close, .toggle-switch, .text-button, .inline-link")
      : null;
    if (!surface || pointerFrames.has(surface)) return;
    pointerFrames.set(surface, requestAnimationFrame(() => {
      const bounds = surface.getBoundingClientRect();
      surface.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
      surface.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
      pointerFrames.delete(surface);
    }));
  });

  document.addEventListener("change", async (event) => {
    if (event.target.id === "pdf-action") {
      $("#page-range-field").hidden = event.target.value !== "split";
      $("#pdf-paths").placeholder = event.target.value === "split" ? "Select a PDF…" : "Select PDF file(s)…";
    }
    if (event.target.id === "image-format") {
      const output = $("#image-output");
      const path = output.value.trim();
      if (path) output.value = path.replace(/\.[^./\\]+$/, "") + ({
        JPEG: ".jpg", PNG: ".png", WEBP: ".webp"
      }[event.target.value]);
    }
    if (event.target.id === "qr-mode") {
      const decode = event.target.value === "decode";
      $("#qr-generate-fields").classList.toggle("hidden", decode);
      $("#qr-decode-fields").classList.toggle("hidden", !decode);
      $("#qr-generate-actions").classList.toggle("hidden", decode);
      $("#qr-decode-actions").classList.toggle("hidden", !decode);
    }
    if (event.target.id === "convert-category") {
      renderUnits();
      $("#convert-result").value = "";
    }
    if (["convert-from", "convert-to"].includes(event.target.id)) {
      const button = $('[data-action="convert"]');
      if (button) runAction(button);
    }
    if (event.target.matches('[data-action="toggle-task"]')) await runAction(event.target);
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "text-source") updateTextStats();
    if (event.target.id === "scratchpad") {
      pendingNotes = event.target.value;
      clearTimeout(notesSaveTimer);
      notesSaveTimer = setTimeout(flushNotesSave, 350);
    }
    if (event.target.id === "convert-value") {
      clearTimeout(convertTimer);
      const rawValue = event.target.value.trim();
      const button = $('[data-action="convert"]');
      if (!button || !rawValue || !Number.isFinite(Number(rawValue))) {
        $("#convert-result").value = "";
        return;
      }
      convertTimer = setTimeout(() => {
        if (currentTool?.id === "converter" && !button.disabled) runAction(button);
      }, 180);
    }
  });

  function applyTheme(dark) {
    document.body.classList.toggle("dark", dark);
    $("#theme-toggle").setAttribute("aria-pressed", String(dark));
    const themeColor = getComputedStyle(document.body).getPropertyValue("--theme-color").trim();
    $('meta[name="theme-color"]').content = themeColor;
  }

  $("#theme-toggle").addEventListener("click", () => {
    const dark = !document.body.classList.contains("dark");
    applyTheme(dark);
    try { localStorage.setItem("omnikit-theme", dark ? "dark" : "light"); } catch (_) { /* Optional browser preference. */ }
  });
  modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
  document.addEventListener("keydown", (event) => {
    if (modal.classList.contains("hidden")) return;
    if (event.key === "Escape") {
      closeModal();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = $$('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])', modal)
      .filter((element) => !element.hidden && element.getClientRects().length);
    if (!focusable.length) {
      event.preventDefault();
      modal.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  });

  function initialize() {
    renderShortcuts();
    renderActivity();
    let savedTheme = null;
    try { savedTheme = localStorage.getItem("omnikit-theme"); } catch (_) { /* File-backed previews may disable storage. */ }
    applyTheme(savedTheme === "dark");
    const today = new Date();
    $("#today-label").textContent = today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase();
    window.scrollTo(0, 0);
    refreshDashboard();
    setInterval(() => {
      if (document.visibilityState === "visible") refreshDashboard();
    }, 1000);
  }

  window.addEventListener("pywebviewready", refreshDashboard);
  initialize();
})();
