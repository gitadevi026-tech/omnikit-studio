# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path

from PyInstaller.utils.hooks import collect_all


ROOT = Path(SPECPATH).resolve()

datas = [
    (str(ROOT / "index.html"), "."),
    (str(ROOT / "style.css"), "."),
    (str(ROOT / "app.js"), "."),
]
binaries = []
hiddenimports = [
    "tkinter",
    "tkinter.filedialog",
    "tkinter.messagebox",
]

for package in ("webview", "psutil", "PIL", "pypdf", "qrcode", "cv2"):
    package_datas, package_binaries, package_hiddenimports = collect_all(package)
    datas += package_datas
    binaries += package_binaries
    hiddenimports += package_hiddenimports

hiddenimports.append("webview.platforms.edgechromium")

a = Analysis(
    [str(ROOT / "main.py")],
    pathex=[str(ROOT)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["customtkinter", "PySide6", "PyQt5", "PyQt6", "PySide2"],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="OmniKitStudio",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    icon=str(ROOT / "icon.ico"),
    console=False,
    disable_windowed_traceback=False,
)
