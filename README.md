# ⚡ OmniKit Studio

**Offline-ready 10-in-1 desktop utility application**  
Built with Python 3, PyWebView, and a local HTML/CSS/JavaScript interface. The Python utilities run on your computer; the desktop app does not require a web server, CDN, or internet connection for its core features.

---

## 🚀 Quick Start Guide

### 1. Requirements
- Python 3.8 or higher.
- A system WebView runtime (WebView2 on Windows).

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Application
```bash
python main.py
```

The desktop window loads [`index.html`](./index.html) and its adjacent `style.css` and `app.js` files directly from disk. The frontend calls the Python backend through PyWebView; live CPU, memory, and storage readings refresh every second from `psutil`. In a source run, task and note data is stored in `omnikit_data.json`, and saved vault entries in `omnikit_vault.json`, alongside the application. A packaged executable stores these files in `%LOCALAPPDATA%\OmniKit Studio\`. Vault entries are stored as plain JSON and are not encrypted.

## Build a standalone Windows executable

Build on Windows with the same architecture (normally 64-bit) as the computers that will run the application. The PyInstaller one-file bundle includes the Python runtime, Python packages, and local frontend assets. It does not install Windows' WebView2 Runtime; see the runtime note below.

Open PowerShell in the project folder and run:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip install pyinstaller
python convert_logo_to_ico.py logo.png icon.ico
python -m PyInstaller --clean --noconfirm build.spec
```

Replace `logo.png` with your logo image. The converter creates an `icon.ico` containing multiple Windows icon sizes. The spec embeds it into the executable.

To build directly from `main.py` instead of using the spec, run this PowerShell command from the project folder:

```powershell
python -m PyInstaller --clean --noconfirm --noconsole --onefile --name OmniKitStudio --icon=icon.ico --add-data "index.html;." --add-data "style.css;." --add-data "app.js;." --collect-all webview --collect-all psutil --collect-all PIL --collect-all pypdf --collect-all qrcode --collect-all cv2 --hidden-import tkinter --hidden-import tkinter.filedialog --hidden-import tkinter.messagebox --hidden-import webview.platforms.edgechromium main.py
```

The executable is `dist\OmniKitStudio.exe`. Run it with:

```powershell
.\dist\OmniKitStudio.exe
```

`build.spec` explicitly includes `index.html`, `style.css`, `app.js`, and the dynamically loaded PyWebView, Pillow, psutil, pypdf, QR, and OpenCV modules. In one-file mode, PyInstaller extracts bundled resources into a temporary directory when the program starts. The application reads its UI from that bundle and saves notes and vault data persistently in `%LOCALAPPDATA%\OmniKit Studio\`, not in the temporary extraction directory.

For startup diagnostics, temporarily change `console=False` to `console=True` in `build.spec`, rebuild using the same command, and launch the executable from PowerShell to see error output.

### WebView2 runtime requirement

PyInstaller bundles Python and Python libraries, but not Microsoft's WebView2 Runtime. It is commonly already present on Windows 10/11, but a machine without it must install the official **Evergreen Standalone Installer** (or your installer must deploy the approved Evergreen bootstrapper) before the app can open its PyWebView window. If you need a truly self-contained distribution that also carries a browser runtime, use and test a supported fixed-version WebView2 deployment and its licensing/update requirements; a single PyInstaller EXE alone cannot guarantee that external runtime is present.

Before distributing, test `dist\OmniKitStudio.exe` on a clean Windows machine or VM that has no Python installation, verify WebView2 is available, and exercise the file pickers, image/PDF/QR tools, system monitor, and persistent notes/vault. OpenCV adds substantial size to the one-file executable because it supports QR decoding.

Build outputs and the virtual environment are generated under `build\`, `dist\`, and `.venv\`; these are not needed as source inputs once the executable has been tested.

---

## 🛠️ The 10 Built-In Modules

1. **📁 Smart File Organizer**: Sorts selected file types into Documents, Images, Videos, Audio, Archives, and Code folders, with collision-safe names.
2. **🖼️ Image Compressor & Resizer**: Adjust image quality and dimensions and save JPEG, PNG, or WebP files.
3. **🔐 Password Generator & Vault**: Generate cryptographically random passwords and manage locally stored credentials (stored unencrypted in `omnikit_vault.json`).
4. **⚡ System Health**: Monitor CPU, memory, and disk usage refreshed every second, battery status, and device details.
5. **📄 PDF Tools**: Merge PDF files or extract page ranges (for example, `1-3, 5, 8-10`) into a new document.
6. **📝 Text Utility**: Count words, characters, and lines; transform case; and tidy whitespace.
7. **📱 QR Code Studio**: Generate colored QR codes as PNGs and decode QR codes from image files.
8. **📐 Unit & Currency Converter**: Convert length, weight, temperature, data, speed, and reference currency values without fetching live rates.
9. **📌 Tasks & Notes**: Manage prioritized tasks and an auto-saved scratchpad in `omnikit_data.json`.
10. **🌐 Network Check**: Measure a TCP connection to a chosen host and show local IP/hostname details. This diagnostic needs a network connection; the other core tools work offline.
