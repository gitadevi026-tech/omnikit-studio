"""
================================================================================
OmniKit Studio - Offline-Ready 10-in-1 Desktop Utility Application
Built with Python, PyWebView, HTML, CSS, and JavaScript
================================================================================
A 100% fully functional, standalone desktop application featuring:
  1. Smart File Organizer (Real File I/O, collision safety, categories)
  2. Image Compressor & Resizer (Real Pillow processing, quality, aspect ratio)
  3. Password Generator & Secure Vault (Cryptographic generation, vault.json)
  4. System Resource Monitor (Real-time psutil CPU, RAM, Disk, Battery stats)
  5. PDF Tools (Real Merge & Split via pypdf)
  6. Text & Markdown Utility (Live typing counters, case transforms, cleanup)
  7. QR Code Studio (Real QR generation with colors & QR image decoder)
  8. Everyday Unit Converter (Exact mathematical engine for 6 categories)
  9. Quick Notes & To-Do List (Real persistent JSON storage with auto-save)
 10. Network Speed & Latency Diagnostic (Real multi-ping, socket latency & IP)

Desktop UI:
  - Clean, soft Light Mode (default) & Dark Mode toggle with friendly blue (#2563EB / #2980B9)
  - Rounded cards (corner_radius=16-20), high-contrast readability, zero hacker aesthetics
  - Local PyWebView frontend with a Python API bridge for real desktop operations
  - Robust validation and explicit errors returned to the frontend
================================================================================
"""

import os
import sys
import shutil
import threading
import time
import json
import platform
import re
import string
import secrets
import random
import math
import tempfile
import socket
import urllib.request
import subprocess
import logging
from functools import lru_cache
from collections import deque
from datetime import datetime

# GUI Framework: customtkinter with tkinter fallback
try:
    import customtkinter as ctk
    import tkinter as tk
    from tkinter import filedialog, messagebox
except ImportError:
    import tkinter as tk
    from tkinter import filedialog, messagebox
    # Fallback shim if customtkinter is not yet installed in bare environment
    ctk = None

# Optional third-party libraries with gentle fallbacks
try:
    from PIL import Image, ImageTk
except ImportError:
    Image = None
    ImageTk = None

try:
    import psutil
except ImportError:
    psutil = None

try:
    import pypdf
except ImportError:
    try:
        import PyPDF2 as pypdf
    except ImportError:
        pypdf = None

try:
    import qrcode
except ImportError:
    qrcode = None

try:
    import cv2
except ImportError:
    cv2 = None


@lru_cache(maxsize=1)
def operating_system_name():
    system = platform.system()
    if system == "Windows":
        try:
            result = subprocess.run(
                [
                    "powershell.exe",
                    "-NoProfile",
                    "-NonInteractive",
                    "-Command",
                    "(Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction Stop).Caption",
                ],
                check=True,
                capture_output=True,
                text=True,
                timeout=5,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
            caption = result.stdout.strip()
            if caption:
                return re.sub(r"^Microsoft\s+", "", caption, flags=re.IGNORECASE)
        except (OSError, subprocess.SubprocessError):
            pass

        try:
            version = sys.getwindowsversion()
        except (AttributeError, OSError):
            return "Windows"
        if version.build >= 22000:
            return "Windows 11"
        if version.major >= 10:
            return "Windows 10"
        legacy_names = {
            (6, 3): "Windows 8.1",
            (6, 2): "Windows 8",
            (6, 1): "Windows 7",
            (6, 0): "Windows Vista",
            (5, 1): "Windows XP",
        }
        return legacy_names.get((version.major, version.minor), f"Windows {version.major}.{version.minor}")
    release = platform.release()
    return f"{system} {release}".strip()


# Theme Constants (Clean, Soft Light Mode with Friendly Blue Accent, seamless Dark Mode support)
LIGHT_BG = ("#F0F4F9", "#0F172A")
LIGHT_CARD = ("#FFFFFF", "#1E293B")
LIGHT_INSET = ("#E8EEF5", "#0F172A")
LIGHT_BORDER = ("#D6E0EC", "#334155")
ACCENT_BLUE = "#2563EB"
ACCENT_BLUE_HOVER = "#1D4ED8"
ACCENT_TEAL = "#0D9488"
TEXT_PRIMARY = ("#0F172A", "#F8FAFC")
TEXT_MUTED = ("#64748B", "#94A3B8")
SUCCESS_GREEN = "#059669"
DANGER_RED = "#DC2626"

DARK_BG = "#0F172A"
DARK_CARD = "#1E293B"
DARK_INSET = "#090D16"
DARK_BORDER = "#334155"

# Adaptive widget surfaces for flawless light/dark mode
COLOR_SIDEBAR_BG = ("#E7EDF5", "#131D2D")
COLOR_SIDEBAR_BORDER = ("#D8E2EF", "#1E293B")
COLOR_HOVER = ("#DFE7F2", "#1E293B")
COLOR_BTN_SEC = ("#FFFFFF", "#334155")
COLOR_BTN_SEC_HOVER = ("#E2E8F0", "#475569")
COLOR_ENTRY_BG = ("#FFFFFF", "#1E293B")
COLOR_ENTRY_BORDER = ("#CBD5E1", "#334155")


class OmniKitStudio:
    def __init__(self):
        if ctk is None:
            # Fallback bare tkinter window informing user to install requirements
            self.root = tk.Tk()
            self.root.title("OmniKit Studio - Setup Required")
            self.root.geometry("520x240")
            tk.Label(
                self.root,
                text="OmniKit Studio requires 'customtkinter'.\nPlease install dependencies:",
                font=("Arial", 12, "bold"),
                pady=20
            ).pack()
            cmd_box = tk.Entry(self.root, font=("Courier", 11), justify="center", width=40)
            cmd_box.insert(0, "pip install -r requirements.txt")
            cmd_box.pack(pady=10)
            tk.Button(self.root, text="Close", command=self.root.destroy, width=15).pack(pady=15)
            return

        ctk.set_appearance_mode("Light")
        ctk.set_default_color_theme("blue")

        self.root = ctk.CTk()
        self.root.title("OmniKit Studio — 10-in-1 Desktop Utility Suite")
        self.root.geometry("1180x780")
        self.root.minsize(980, 680)

        # Paths for local persistence
        app_dir = os.path.dirname(os.path.abspath(__file__))
        self.data_file = os.path.join(app_dir, "omnikit_data.json")
        self.vault_file = os.path.join(app_dir, "omnikit_vault.json")
        self.user_data = self.load_local_data()
        self.vault_data = self.load_vault_data()

        # Layout Setup: 2 Columns (Sidebar & Dynamic Workspace), 2 Rows (Main & StatusBar)
        self.root.grid_columnconfigure(0, weight=0, minsize=250)
        self.root.grid_columnconfigure(1, weight=1)
        self.root.grid_rowconfigure(0, weight=1)
        self.root.grid_rowconfigure(1, weight=0)

        # Build UI Structure
        self.create_sidebar()
        self.create_main_container()
        self.create_status_bar()

        # Modules registry
        self.frames = {}
        self.active_module = None
        self.is_dark_mode = False

        # Initialize all 10 modules
        self.init_all_modules()

        # Switch to first module
        self.switch_module("organizer")

        # Start live background hardware monitor loop
        self.monitor_running = True
        self.start_system_monitor_loop()

        # Bring window to foreground and ensure focus
        self.bring_to_foreground()
        self.root.after(300, self.bring_to_foreground)

    def bring_to_foreground(self):
        """Bring the application window to the foreground and ensure focus."""
        try:
            self.root.update_idletasks()
            self.root.deiconify()
            self.root.lift()
            self.root.attributes("-topmost", True)
            self.root.after(150, lambda: self.root.attributes("-topmost", False))
            self.root.focus_force()

            if platform.system() == "Windows":
                try:
                    import ctypes
                    user32 = ctypes.windll.user32
                    hwnd = user32.FindWindowW(None, "OmniKit Studio — 10-in-1 Desktop Utility Suite")
                    if not hwnd:
                        hwnd = self.root.winfo_id()
                        parent = user32.GetParent(hwnd)
                        if parent:
                            hwnd = parent
                    if hwnd:
                        user32.AllowSetForegroundWindow(-1)
                        user32.ShowWindow(hwnd, 9)  # SW_RESTORE
                        user32.SetForegroundWindow(hwnd)
                        user32.BringWindowToTop(hwnd)
                except Exception:
                    pass
        except Exception:
            pass

    # =========================================================================
    # NAVIGATION & SIDEBAR
    # =========================================================================
    def create_sidebar(self):
        self.sidebar = ctk.CTkFrame(
            self.root,
            width=250,
            corner_radius=0,
            fg_color=COLOR_SIDEBAR_BG,
            border_width=1,
            border_color=COLOR_SIDEBAR_BORDER
        )
        self.sidebar.grid(row=0, column=0, sticky="nsew")
        self.sidebar.grid_rowconfigure(12, weight=1)

        # App Brand Header
        brand_card = ctk.CTkFrame(self.sidebar, fg_color=LIGHT_CARD, corner_radius=16, border_width=1, border_color=COLOR_SIDEBAR_BORDER)
        brand_card.grid(row=0, column=0, padx=14, pady=(16, 12), sticky="ew")

        ctk.CTkLabel(
            brand_card,
            text="⚡ OmniKit Studio",
            font=ctk.CTkFont(size=17, weight="bold"),
            text_color=TEXT_PRIMARY
        ).pack(anchor="w", padx=14, pady=(10, 0))

        ctk.CTkLabel(
            brand_card,
            text="10-in-1 Production Utility Suite",
            font=ctk.CTkFont(size=11),
            text_color=TEXT_MUTED
        ).pack(anchor="w", padx=14, pady=(0, 10))

        # 10 Module Navigation Buttons
        self.nav_buttons = {}
        module_list = [
            ("organizer", "📁 File Organizer"),
            ("compressor", "🖼️ Image Compressor"),
            ("vault", "🔐 Password & Vault"),
            ("system", "⚡ System Monitor"),
            ("pdf", "📄 PDF Tools"),
            ("text", "📝 Text Utility"),
            ("qr", "📱 QR Code Studio"),
            ("converter", "📐 Unit Converter"),
            ("notes", "📌 Notes & To-Do"),
            ("network", "🌐 Network Tester"),
        ]

        for idx, (mod_id, label_text) in enumerate(module_list, start=1):
            btn = ctk.CTkButton(
                self.sidebar,
                text=label_text,
                font=ctk.CTkFont(size=13, weight="bold"),
                anchor="w",
                fg_color="transparent",
                text_color=TEXT_PRIMARY,
                hover_color=COLOR_HOVER,
                corner_radius=14,
                height=36,
                command=lambda m=mod_id: self.switch_module(m)
            )
            btn.grid(row=idx, column=0, padx=12, pady=2, sticky="ew")
            self.nav_buttons[mod_id] = btn

        # Bottom Controls Card: Theme switch + Hardware preview
        bottom_card = ctk.CTkFrame(self.sidebar, fg_color=LIGHT_CARD, corner_radius=16, border_width=1, border_color=COLOR_SIDEBAR_BORDER)
        bottom_card.grid(row=13, column=0, padx=12, pady=14, sticky="ew")

        # Theme toggle button
        self.theme_btn = ctk.CTkButton(
            bottom_card,
            text="🌙 Switch to Dark Mode",
            font=ctk.CTkFont(size=11, weight="bold"),
            fg_color=COLOR_BTN_SEC,
            hover_color=COLOR_BTN_SEC_HOVER,
            text_color=TEXT_PRIMARY,
            height=30,
            corner_radius=10,
            command=self.toggle_theme
        )
        self.theme_btn.pack(fill="x", padx=10, pady=(10, 6))

        # Live mini monitor badge
        self.sidebar_stats_lbl = ctk.CTkLabel(
            bottom_card,
            text="CPU: — | RAM: —",
            font=ctk.CTkFont(size=11),
            text_color=TEXT_MUTED
        )
        self.sidebar_stats_lbl.pack(anchor="w", padx=12, pady=(0, 8))

    def create_main_container(self):
        self.main_container = ctk.CTkFrame(self.root, corner_radius=0, fg_color="transparent")
        self.main_container.grid(row=0, column=1, sticky="nsew", padx=20, pady=16)
        self.main_container.grid_rowconfigure(0, weight=1)
        self.main_container.grid_columnconfigure(0, weight=1)

    def create_status_bar(self):
        self.status_bar = ctk.CTkFrame(
            self.root,
            height=32,
            corner_radius=0,
            fg_color=COLOR_SIDEBAR_BG,
            border_width=1,
            border_color=COLOR_SIDEBAR_BORDER
        )
        self.status_bar.grid(row=1, column=0, columnspan=2, sticky="ew")
        self.status_bar.grid_columnconfigure(0, weight=1)
        self.status_bar.grid_columnconfigure(1, weight=0)

        self.status_msg = ctk.CTkLabel(
            self.status_bar,
            text="✨ Welcome to OmniKit Studio. Select any tool to begin.",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=TEXT_PRIMARY,
            anchor="w"
        )
        self.status_msg.grid(row=0, column=0, padx=18, pady=5, sticky="w")

        self.clock_msg = ctk.CTkLabel(
            self.status_bar,
            text=datetime.now().strftime("%I:%M %p"),
            font=ctk.CTkFont(size=11),
            text_color=TEXT_MUTED
        )
        self.clock_msg.grid(row=0, column=1, padx=18, pady=5, sticky="e")

    def set_status(self, text: str):
        def _update():
            self.status_msg.configure(text=f"✨ {text}")
            self.clock_msg.configure(text=datetime.now().strftime("%I:%M %p"))
        self.root.after(0, _update)

    def toggle_theme(self):
        self.is_dark_mode = not self.is_dark_mode
        if self.is_dark_mode:
            ctk.set_appearance_mode("Dark")
            self.theme_btn.configure(text="☀️ Switch to Light Mode")
            self.set_status("Appearance set to Dark Mode.")
        else:
            ctk.set_appearance_mode("Light")
            self.theme_btn.configure(text="🌙 Switch to Dark Mode")
            self.set_status("Appearance set to Light Mode.")

    def switch_module(self, module_name: str):
        if self.active_module == module_name:
            return

        if self.active_module and self.active_module in self.frames:
            self.frames[self.active_module].grid_forget()
            if self.active_module in self.nav_buttons:
                self.nav_buttons[self.active_module].configure(
                    fg_color="transparent",
                    text_color=TEXT_PRIMARY
                )

        target = self.frames.get(module_name)
        if target:
            target.grid(row=0, column=0, sticky="nsew")
            self.active_module = module_name
            if module_name in self.nav_buttons:
                self.nav_buttons[module_name].configure(
                    fg_color=ACCENT_BLUE,
                    text_color="#FFFFFF"
                )
            self.set_status(f"Loaded {module_name.capitalize()} module.")

    def init_all_modules(self):
        self.frames["organizer"] = self.build_module_organizer()
        self.frames["compressor"] = self.build_module_compressor()
        self.frames["vault"] = self.build_module_vault()
        self.frames["system"] = self.build_module_system()
        self.frames["pdf"] = self.build_module_pdf()
        self.frames["text"] = self.build_module_text()
        self.frames["qr"] = self.build_module_qr()
        self.frames["converter"] = self.build_module_converter()
        self.frames["notes"] = self.build_module_notes()
        self.frames["network"] = self.build_module_network()

    # =========================================================================
    # PERSISTENCE HELPERS
    # =========================================================================
    def load_local_data(self):
        default_data = {"tasks": [], "notes": ""}
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return default_data
        return default_data

    def save_local_data(self):
        try:
            with open(self.data_file, "w", encoding="utf-8") as f:
                json.dump(self.user_data, f, indent=2)
        except Exception as e:
            print(f"Error saving data: {e}")

    def load_vault_data(self):
        default_vault = []
        if os.path.exists(self.vault_file):
            try:
                with open(self.vault_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return default_vault
        return default_vault

    def save_vault_data(self):
        try:
            with open(self.vault_file, "w", encoding="utf-8") as f:
                json.dump(self.vault_data, f, indent=2)
        except Exception as e:
            print(f"Error saving vault: {e}")

    # =========================================================================
    # MODULE 1: SMART FILE ORGANIZER (REAL FILE I/O)
    # =========================================================================
    def build_module_organizer(self):
        frame = ctk.CTkFrame(self.main_container, corner_radius=18, fg_color=LIGHT_CARD, border_width=1, border_color="#D5DFEC")

        header = ctk.CTkLabel(frame, text="📁 Smart File Organizer", font=ctk.CTkFont(size=20, weight="bold"), text_color=TEXT_PRIMARY)
        header.pack(anchor="w", padx=24, pady=(20, 2))

        subtitle = ctk.CTkLabel(
            frame,
            text="Choose any folder to automatically sort files into neat category subdirectories with collision safety.",
            font=ctk.CTkFont(size=12),
            text_color=TEXT_MUTED
        )
        subtitle.pack(anchor="w", padx=24, pady=(0, 16))

        # Target Folder Selection Card
        picker_box = ctk.CTkFrame(frame, fg_color=LIGHT_INSET, corner_radius=14)
        picker_box.pack(fill="x", padx=24, pady=(0, 12))

        p_row = ctk.CTkFrame(picker_box, fg_color="transparent")
        p_row.pack(fill="x", padx=16, pady=12)

        self.org_folder_path = ctk.CTkEntry(
            p_row,
            placeholder_text="Choose folder to organize (e.g., Downloads, Desktop)...",
            height=38,
            corner_radius=10,
            fg_color=COLOR_ENTRY_BG,
            border_color=COLOR_ENTRY_BORDER,
            text_color=TEXT_PRIMARY
        )
        self.org_folder_path.pack(side="left", fill="x", expand=True, padx=(0, 10))

        btn_browse = ctk.CTkButton(
            p_row,
            text="📂 Choose Folder",
            height=38,
            font=ctk.CTkFont(size=12, weight="bold"),
            fg_color=COLOR_BTN_SEC,
            hover_color=COLOR_BTN_SEC_HOVER,
            text_color=TEXT_PRIMARY,
            corner_radius=10,
            command=self.browse_organizer_folder
        )
        btn_browse.pack(side="right")

        # Category Checkboxes
        cat_box = ctk.CTkFrame(frame, fg_color=LIGHT_INSET, corner_radius=14)
        cat_box.pack(fill="x", padx=24, pady=(0, 12))

        c_grid = ctk.CTkFrame(cat_box, fg_color="transparent")
        c_grid.pack(fill="x", padx=16, pady=12)

        self.org_cats = {
            "Documents": ctk.CTkCheckBox(c_grid, text="📄 Documents (.pdf, .docx, .xlsx, .txt)", text_color=TEXT_PRIMARY),
            "Images": ctk.CTkCheckBox(c_grid, text="🖼️ Photos (.jpg, .png, .webp, .svg)", text_color=TEXT_PRIMARY),
            "Videos": ctk.CTkCheckBox(c_grid, text="🎬 Videos (.mp4, .mkv, .mov, .avi)", text_color=TEXT_PRIMARY),
            "Audio": ctk.CTkCheckBox(c_grid, text="🎵 Audio (.mp3, .wav, .flac, .aac)", text_color=TEXT_PRIMARY),
            "Archives": ctk.CTkCheckBox(c_grid, text="📦 Archives (.zip, .rar, .7z, .tar)", text_color=TEXT_PRIMARY),
            "Code": ctk.CTkCheckBox(c_grid, text="💻 Code (.py, .js, .html, .css, .json)", text_color=TEXT_PRIMARY),
        }

        col = 0
        row = 0
        for _, cb in self.org_cats.items():
            cb.select()
            cb.grid(row=row, column=col, sticky="w", padx=8, pady=4)
            col += 1
            if col > 1:
                col = 0
                row += 1

        # Action Button & Progress Bar
        act_row = ctk.CTkFrame(frame, fg_color="transparent")
        act_row.pack(fill="x", padx=24, pady=(0, 12))

        self.btn_organize = ctk.CTkButton(
            act_row,
            text="✨ Start Organizing Now",
            height=44,
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color=ACCENT_BLUE,
            hover_color=ACCENT_BLUE_HOVER,
            corner_radius=12,
            command=self.run_file_organizer
        )
        self.btn_organize.pack(side="left", padx=(0, 14))

        self.org_progress = ctk.CTkProgressBar(act_row, height=12, corner_radius=6, progress_color=ACCENT_BLUE)
        self.org_progress.pack(side="left", fill="x", expand=True)
        self.org_progress.set(0)

        # Activity Log
        self.org_log = ctk.CTkTextbox(frame, height=140, corner_radius=12, fg_color=COLOR_ENTRY_BG, text_color=TEXT_PRIMARY)
        self.org_log.pack(fill="both", expand=True, padx=24, pady=(0, 20))
        self.org_log.insert("end", "✨ Select a folder above and click 'Start Organizing Now'.\n")

        return frame

    def browse_organizer_folder(self):
        f = filedialog.askdirectory(title="Select Folder to Organize")
        if f:
            self.org_folder_path.delete(0, "end")
            self.org_folder_path.insert(0, f)
            self.set_status(f"Selected: {os.path.basename(f) or f}")

    def run_file_organizer(self):
        f = self.org_folder_path.get().strip()
        if not f or not os.path.isdir(f):
            messagebox.showinfo("Select Folder", "Please choose a valid folder on your computer first!")
            return

        self.btn_organize.configure(state="disabled")
        self.org_progress.set(0)
        self.set_status("Scanning and organizing files...")
        threading.Thread(target=self._organize_files_worker, args=(f,), daemon=True).start()

    def _organize_files_worker(self, target_dir):
        category_map = {
            "Documents": [".pdf", ".docx", ".doc", ".txt", ".xlsx", ".xls", ".pptx", ".ppt", ".csv", ".rtf"],
            "Images": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico"],
            "Videos": [".mp4", ".mkv", ".mov", ".flv", ".avi", ".wmv", ".webm"],
            "Audio": [".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"],
            "Archives": [".zip", ".rar", ".tar", ".7z", ".gz", ".bz2"],
            "Code": [".py", ".exe", ".sh", ".html", ".css", ".js", ".json", ".ts", ".jsx", ".tsx", ".cpp", ".c"]
        }

        active = {}
        for cat_name, cb in self.org_cats.items():
            if cb.get():
                active[cat_name] = category_map[cat_name]

        def log(msg):
            self.root.after(0, lambda: (self.org_log.insert("end", msg + "\n"), self.org_log.see("end")))

        try:
            files = [x for x in os.listdir(target_dir) if os.path.isfile(os.path.join(target_dir, x))]
            total = len(files)
            if total == 0:
                log("• No files found in selected directory.")
                self.root.after(0, lambda: self.btn_organize.configure(state="normal"))
                return

            moved = 0
            for idx, file_name in enumerate(files, start=1):
                # Ignore system and self files
                if file_name in ["main.py", "omnikit_data.json", "omnikit_vault.json"]:
                    continue

                _, ext = os.path.splitext(file_name)
                ext = ext.lower()
                dest_cat = None
                for cat, exts in active.items():
                    if ext in exts:
                        dest_cat = cat
                        break

                if dest_cat:
                    cat_folder = os.path.join(target_dir, dest_cat)
                    os.makedirs(cat_folder, exist_ok=True)
                    src = os.path.join(target_dir, file_name)
                    dst = os.path.join(cat_folder, file_name)

                    # Collision handling
                    c_idx = 1
                    base_n, file_ext = os.path.splitext(file_name)
                    while os.path.exists(dst):
                        dst = os.path.join(cat_folder, f"{base_n}_{c_idx}{file_ext}")
                        c_idx += 1

                    try:
                        shutil.move(src, dst)
                        moved += 1
                        log(f"  ✓ Moved: '{file_name}' ➔ '{dest_cat}/'")
                    except Exception as fe:
                        log(f"  ⚠️ Could not move '{file_name}': {fe}")

                self.root.after(0, lambda p=(idx/total): self.org_progress.set(p))
                time.sleep(0.01)

            log(f"\n🎉 Successfully organized {moved} file(s)!")
            self.set_status(f"Organized {moved} files successfully.")
            self.root.after(0, lambda: messagebox.showinfo("Completed", f"Success! Organized {moved} files into respective folders."))
        except Exception as e:
            log(f"Notice: {e}")
        finally:
            self.root.after(0, lambda: self.btn_organize.configure(state="normal"))

    # =========================================================================
    # MODULE 2: IMAGE COMPRESSOR & RESIZER (REAL PIL PROCESSING)
    # =========================================================================
    def build_module_compressor(self):
        frame = ctk.CTkFrame(self.main_container, corner_radius=18, fg_color=LIGHT_CARD, border_width=1, border_color="#D5DFEC")

        header = ctk.CTkLabel(frame, text="🖼️ Image Compressor & Resizer", font=ctk.CTkFont(size=20, weight="bold"), text_color=TEXT_PRIMARY)
        header.pack(anchor="w", padx=24, pady=(20, 2))

        subtitle = ctk.CTkLabel(
            frame,
            text="Compress image file sizes and scale dimensions while keeping photos crisp and clear.",
            font=ctk.CTkFont(size=12),
            text_color=TEXT_MUTED
        )
        subtitle.pack(anchor="w", padx=24, pady=(0, 16))

        grid = ctk.CTkFrame(frame, fg_color="transparent")
        grid.pack(fill="both", expand=True, padx=24, pady=0)
        grid.grid_columnconfigure((0, 1), weight=1)

        # Left Controls Card
        left_box = ctk.CTkFrame(grid, fg_color=LIGHT_INSET, corner_radius=14)
        left_box.grid(row=0, column=0, sticky="nsew", padx=(0, 10))

        btn_pick = ctk.CTkButton(
            left_box,
            text="📷 Select an Image",
            height=40,
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color=COLOR_BTN_SEC,
            hover_color=COLOR_BTN_SEC_HOVER,
            text_color=TEXT_PRIMARY,
            corner_radius=10,
            command=self.browse_image
        )
        btn_pick.pack(fill="x", padx=16, pady=(16, 6))

        self.img_lbl = ctk.CTkLabel(left_box, text="No image selected.", font=ctk.CTkFont(size=11), text_color=TEXT_MUTED)
        self.img_lbl.pack(anchor="w", padx=16, pady=(0, 10))

        # Quality Slider
        ctk.CTkLabel(left_box, text="Compression Quality:", font=ctk.CTkFont(size=12, weight="bold"), text_color=TEXT_PRIMARY).pack(anchor="w", padx=16, pady=(4, 2))
        self.img_q_lbl = ctk.CTkLabel(left_box, text="75% (Recommended)", font=ctk.CTkFont(size=12, weight="bold"), text_color=ACCENT_BLUE)
        self.img_q_lbl.pack(anchor="w", padx=16, pady=(0, 4))

        self.img_slider = ctk.CTkSlider(left_box, from_=5, to=100, number_of_steps=19, progress_color=ACCENT_BLUE, command=self._on_quality_slider)
        self.img_slider.set(75)
        self.img_slider.pack(fill="x", padx=16, pady=(0, 12))

        # Resolution Inputs
        dim_box = ctk.CTkFrame(left_box, fg_color="transparent")
        dim_box.pack(fill="x", padx=16, pady=(0, 8))
        ctk.CTkLabel(dim_box, text="Width (px):", font=ctk.CTkFont(size=11, weight="bold"), text_color=TEXT_PRIMARY).grid(row=0, column=0, sticky="w")
        ctk.CTkLabel(dim_box, text="Height (px):", font=ctk.CTkFont(size=11, weight="bold"), text_color=TEXT_PRIMARY).grid(row=0, column=1, sticky="w", padx=(10, 0))

        self.img_w_entry = ctk.CTkEntry(dim_box, width=100, height=32, corner_radius=8, fg_color=COLOR_ENTRY_BG, border_color=COLOR_ENTRY_BORDER, text_color=TEXT_PRIMARY)
        self.img_w_entry.grid(row=1, column=0, sticky="w", pady=(2, 0))
        self.img_w_entry.bind("<KeyRelease>", self._on_width_change)

        self.img_h_entry = ctk.CTkEntry(dim_box, width=100, height=32, corner_radius=8, fg_color=COLOR_ENTRY_BG, border_color=COLOR_ENTRY_BORDER, text_color=TEXT_PRIMARY)
        self.img_h_entry.grid(row=1, column=1, sticky="w", padx=(10, 0), pady=(2, 0))
        self.img_h_entry.bind("<KeyRelease>", self._on_height_change)

        self.img_ratio_var = ctk.BooleanVar(value=True)
        self.img_ratio_cb = ctk.CTkCheckBox(left_box, text="Keep Aspect Ratio", variable=self.img_ratio_var, text_color=TEXT_PRIMARY)
        self.img_ratio_cb.pack(anchor="w", padx=16, pady=(6, 12))

        # Export Format
        ctk.CTkLabel(left_box, text="Export Format:", font=ctk.CTkFont(size=12, weight="bold"), text_color=TEXT_PRIMARY).pack(anchor="w", padx=16, pady=(2, 2))
        self.img_fmt = ctk.CTkOptionMenu(left_box, values=["JPEG", "PNG", "WEBP"], height=32, corner_radius=10)
        self.img_fmt.set("JPEG")
        self.img_fmt.pack(fill="x", padx=16, pady=(0, 16))

        # Save Button
        ctk.CTkButton(
            left_box,
            text="💾 Process & Save Image",
            height=42,
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color=ACCENT_BLUE,
            hover_color=ACCENT_BLUE_HOVER,
            corner_radius=12,
            command=self.save_image
        ).pack(fill="x", padx=16, pady=(0, 16))

        # Right Preview Box
        right_box = ctk.CTkFrame(grid, fg_color=LIGHT_INSET, corner_radius=14)
        right_box.grid(row=0, column=1, sticky="nsew", padx=(10, 0))

        ctk.CTkLabel(right_box, text="Image Preview & File Stats", font=ctk.CTkFont(size=13, weight="bold"), text_color=TEXT_PRIMARY).pack(anchor="w", padx=16, pady=(16, 6))

        self.img_preview_box = ctk.CTkLabel(right_box, text="Image preview will appear here.", width=300, height=200, fg_color=COLOR_ENTRY_BG, corner_radius=12)
        self.img_preview_box.pack(padx=16, pady=8)

        self.img_stats_pill = ctk.CTkLabel(right_box, text="Ready to optimize.", font=ctk.CTkFont(size=12, weight="bold"), text_color=SUCCESS_GREEN)
        self.img_stats_pill.pack(padx=16, pady=(8, 16))

        self.active_img = None
        self.active_orig_size = 0
        self.active_orig_w = 0
        self.active_orig_h = 0

        return frame

    def _on_quality_slider(self, val):
        q = int(val)
        label = "Smaller File" if q < 40 else "Balanced" if q < 75 else "Best Quality"
        self.img_q_lbl.configure(text=f"{q}% ({label})")

    def _on_width_change(self, event):
        if not self.img_ratio_var.get() or not self.active_orig_w or not self.active_orig_h:
            return
        try:
            w = int(self.img_w_entry.get().strip())
            h = int(w * (self.active_orig_h / self.active_orig_w))
            self.img_h_entry.delete(0, "end")
            self.img_h_entry.insert(0, str(h))
        except ValueError:
            pass

    def _on_height_change(self, event):
        if not self.img_ratio_var.get() or not self.active_orig_w or not self.active_orig_h:
            return
        try:
            h = int(self.img_h_entry.get().strip())
            w = int(h * (self.active_orig_w / self.active_orig_h))
            self.img_w_entry.delete(0, "end")
            self.img_w_entry.insert(0, str(w))
        except ValueError:
            pass

    def browse_image(self):
        p = filedialog.askopenfilename(filetypes=[("Image Files", "*.jpg;*.jpeg;*.png;*.webp;*.bmp")])
        if not p:
            return
        self.active_img = p
        self.active_orig_size = os.path.getsize(p)
        kb = self.active_orig_size / 1024
        self.img_lbl.configure(text=f"Loaded: {os.path.basename(p)}")

        if Image:
            try:
                with Image.open(p) as img:
                    self.active_orig_w, self.active_orig_h = img.size
                    self.img_w_entry.delete(0, "end")
                    self.img_w_entry.insert(0, str(self.active_orig_w))
                    self.img_h_entry.delete(0, "end")
                    self.img_h_entry.insert(0, str(self.active_orig_h))

                    disp = img.copy()
                    disp.thumbnail((280, 180))
                    c_img = ctk.CTkImage(light_image=disp, dark_image=disp, size=disp.size)
                    self.img_preview_box.configure(image=c_img, text="")
                    self.img_preview_box.image = c_img

                    self.img_stats_pill.configure(text=f"Original: {self.active_orig_w}x{self.active_orig_h} px ({kb:.1f} KB)")
            except Exception as e:
                self.img_stats_pill.configure(text=f"Loaded: {kb:.1f} KB")

    def save_image(self):
        if not self.active_img or not os.path.exists(self.active_img):
            messagebox.showinfo("Select Image", "Please select an image file first!")
            return
        if not Image:
            messagebox.showinfo("Pillow Required", "Pillow is not installed. Run: pip install pillow")
            return

        fmt = self.img_fmt.get().lower()
        ext = "jpg" if fmt == "jpeg" else fmt
        save_p = filedialog.asksaveasfilename(defaultextension=f".{ext}", filetypes=[(f"{ext.upper()} Image", f"*.{ext}")])
        if not save_p:
            return

        try:
            q = int(self.img_slider.get())
            w = int(self.img_w_entry.get().strip() or self.active_orig_w)
            h = int(self.img_h_entry.get().strip() or self.active_orig_h)

            with Image.open(self.active_img) as img:
                if (w, h) != img.size and w > 0 and h > 0:
                    img = img.resize((w, h), Image.Resampling.LANCZOS)

                if ext in ("jpg", "jpeg") and img.mode != "RGB":
                    img = img.convert("RGB")

                if ext in ("jpg", "jpeg", "webp"):
                    img.save(save_p, quality=q, optimize=True)
                else:
                    img.save(save_p, optimize=True)

            new_sz = os.path.getsize(save_p)
            pct = max(0, ((self.active_orig_size - new_sz) / self.active_orig_size) * 100) if self.active_orig_size > 0 else 0
            self.img_stats_pill.configure(text=f"Saved! Output: {new_sz/1024:.1f} KB (-{pct:.0f}% smaller)")
            self.set_status(f"Saved compressed image: {os.path.basename(save_p)}")
            messagebox.showinfo("Saved", f"Success! Compressed file saved ({new_sz/1024:.1f} KB, -{pct:.0f}% smaller).")
        except Exception as e:
            messagebox.showerror("Error", f"Could not process image: {e}")

    # =========================================================================
    # MODULE 3: PASSWORD GENERATOR & SECURE VAULT (REAL VAULT.JSON)
    # =========================================================================
    def build_module_vault(self):
        frame = ctk.CTkFrame(self.main_container, corner_radius=18, fg_color=LIGHT_CARD, border_width=1, border_color="#D5DFEC")

        header = ctk.CTkLabel(frame, text="🔐 Password Generator & Secure Vault", font=ctk.CTkFont(size=20, weight="bold"), text_color=TEXT_PRIMARY)
        header.pack(anchor="w", padx=24, pady=(20, 2))

        subtitle = ctk.CTkLabel(frame, text="Generate cryptographically random passwords and store account credentials locally.", font=ctk.CTkFont(size=12), text_color=TEXT_MUTED)
        subtitle.pack(anchor="w", padx=24, pady=(0, 16))

        # Tabview for Generator vs Vault
        self.vault_tabs = ctk.CTkTabview(frame, corner_radius=14)
        self.vault_tabs.pack(fill="both", expand=True, padx=24, pady=(0, 20))
        tab_gen = self.vault_tabs.add("Generator")
        tab_vault = self.vault_tabs.add("Saved Vault")

        # --- Tab 1: Generator ---
        gen_box = ctk.CTkFrame(tab_gen, fg_color=LIGHT_INSET, corner_radius=12)
        gen_box.pack(fill="both", expand=True, padx=10, pady=10)

        # Password Display Row
        row = ctk.CTkFrame(gen_box, fg_color="transparent")
        row.pack(fill="x", padx=16, pady=16)

        self.pw_display = ctk.CTkEntry(
            row,
            font=ctk.CTkFont(family="Courier", size=16, weight="bold"),
            height=44,
            corner_radius=10,
            fg_color=COLOR_ENTRY_BG,
            border_color=COLOR_ENTRY_BORDER,
            text_color=TEXT_PRIMARY
        )
        self.pw_display.pack(side="left", fill="x", expand=True, padx=(0, 10))

        self.btn_copy_pw = ctk.CTkButton(
            row,
            text="📋 Copy",
            width=100,
            height=44,
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color=ACCENT_BLUE,
            hover_color=ACCENT_BLUE_HOVER,
            corner_radius=10,
            command=self.copy_pw
        )
        self.btn_copy_pw.pack(side="right")

        # Strength Bar
        s_row = ctk.CTkFrame(gen_box, fg_color="transparent")
        s_row.pack(fill="x", padx=16, pady=(0, 8))
        self.pw_strength_bar = ctk.CTkProgressBar(s_row, height=8, corner_radius=4, progress_color=SUCCESS_GREEN)
        self.pw_strength_bar.pack(side="left", fill="x", expand=True, padx=(0, 10))
        self.pw_strength_lbl = ctk.CTkLabel(s_row, text="Strong", font=ctk.CTkFont(size=11, weight="bold"), text_color=SUCCESS_GREEN)
        self.pw_strength_lbl.pack(side="right")

        # Length slider
        len_row = ctk.CTkFrame(gen_box, fg_color="transparent")
        len_row.pack(fill="x", padx=16, pady=(4, 2))
        ctk.CTkLabel(len_row, text="Password Length:", font=ctk.CTkFont(size=12, weight="bold"), text_color=TEXT_PRIMARY).pack(side="left")
        self.pw_len_lbl = ctk.CTkLabel(len_row, text="18 characters", font=ctk.CTkFont(size=12, weight="bold"), text_color=ACCENT_BLUE)
        self.pw_len_lbl.pack(side="right")

        self.pw_slider = ctk.CTkSlider(gen_box, from_=8, to=48, number_of_steps=40, progress_color=ACCENT_BLUE, command=lambda v: self._on_pw_slider(v))
        self.pw_slider.set(18)
        self.pw_slider.pack(fill="x", padx=16, pady=(0, 12))

        # Checkboxes
        cb_row = ctk.CTkFrame(gen_box, fg_color="transparent")
        cb_row.pack(fill="x", padx=16, pady=(0, 14))

        self.pw_upper_var = ctk.BooleanVar(value=True)
        self.pw_lower_var = ctk.BooleanVar(value=True)
        self.pw_nums_var = ctk.BooleanVar(value=True)
        self.pw_syms_var = ctk.BooleanVar(value=True)

        ctk.CTkCheckBox(cb_row, text="Uppercase (A-Z)", variable=self.pw_upper_var, text_color=TEXT_PRIMARY).pack(side="left", padx=(0, 12))
        ctk.CTkCheckBox(cb_row, text="Lowercase (a-z)", variable=self.pw_lower_var, text_color=TEXT_PRIMARY).pack(side="left", padx=(0, 12))
        ctk.CTkCheckBox(cb_row, text="Numbers (0-9)", variable=self.pw_nums_var, text_color=TEXT_PRIMARY).pack(side="left", padx=(0, 12))
        ctk.CTkCheckBox(cb_row, text="Symbols (!@#$)", variable=self.pw_syms_var, text_color=TEXT_PRIMARY).pack(side="left")

        # Action Buttons
        btn_r = ctk.CTkFrame(gen_box, fg_color="transparent")
        btn_r.pack(fill="x", padx=16, pady=(0, 16))

        ctk.CTkButton(
            btn_r,
            text="✨ Generate New Password",
            height=40,
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color=COLOR_BTN_SEC,
            hover_color=COLOR_BTN_SEC_HOVER,
            text_color=TEXT_PRIMARY,
            corner_radius=10,
            command=self.generate_pw
        ).pack(side="left", fill="x", expand=True, padx=(0, 8))

        ctk.CTkButton(
            btn_r,
            text="💾 Save to Vault",
            height=40,
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color=ACCENT_BLUE,
            hover_color=ACCENT_BLUE_HOVER,
            corner_radius=10,
            command=self.save_generated_to_vault
        ).pack(side="right", fill="x", expand=True)

        self.generate_pw()

        # --- Tab 2: Saved Vault ---
        vault_box = ctk.CTkFrame(tab_vault, fg_color=LIGHT_INSET, corner_radius=12)
        vault_box.pack(fill="both", expand=True, padx=10, pady=10)

        # Quick Add Row
        add_r = ctk.CTkFrame(vault_box, fg_color="transparent")
        add_r.pack(fill="x", padx=14, pady=(14, 8))

        self.v_svc = ctk.CTkEntry(add_r, placeholder_text="Service / Website (e.g. GitHub)", width=160, height=34, corner_radius=8, fg_color=COLOR_ENTRY_BG, border_color=COLOR_ENTRY_BORDER, text_color=TEXT_PRIMARY)
        self.v_svc.pack(side="left", padx=(0, 6))

        self.v_user = ctk.CTkEntry(add_r, placeholder_text="Username / Email", width=160, height=34, corner_radius=8, fg_color=COLOR_ENTRY_BG, border_color=COLOR_ENTRY_BORDER, text_color=TEXT_PRIMARY)
        self.v_user.pack(side="left", padx=(0, 6))

        self.v_pw = ctk.CTkEntry(add_r, placeholder_text="Password", width=160, height=34, corner_radius=8, fg_color=COLOR_ENTRY_BG, border_color=COLOR_ENTRY_BORDER, text_color=TEXT_PRIMARY)
        self.v_pw.pack(side="left", fill="x", expand=True, padx=(0, 6))

        ctk.CTkButton(add_r, text="+ Save", width=70, height=34, fg_color=ACCENT_BLUE, corner_radius=8, command=self.add_vault_entry).pack(side="right")

        # Scrollable Vault Entries
        self.vault_scroll = ctk.CTkScrollableFrame(vault_box, height=240, fg_color="transparent")
        self.vault_scroll.pack(fill="both", expand=True, padx=14, pady=(0, 14))

        self.render_vault()

        return frame

    def _on_pw_slider(self, val):
        self.pw_len_lbl.configure(text=f"{int(val)} characters")

    def generate_pw(self):
        length = int(self.pw_slider.get())
        pool = ""
        if self.pw_upper_var.get():
            pool += string.ascii_uppercase
        if self.pw_lower_var.get():
            pool += string.ascii_lowercase
        if self.pw_nums_var.get():
            pool += string.digits
        if self.pw_syms_var.get():
            pool += "!@#$%^&*()-_+=~"

        if not pool:
            pool = string.ascii_letters

        # Cryptographically secure random choice
        pw = "".join(secrets.choice(pool) for _ in range(length))
        self.pw_display.delete(0, "end")
        self.pw_display.insert(0, pw)

        # Strength calculation
        bits = length * (6.5 if len(pool) > 60 else 5.2 if len(pool) > 30 else 4.0)
        if bits > 80:
            self.pw_strength_bar.set(1.0)
            self.pw_strength_bar.configure(progress_color=SUCCESS_GREEN)
            self.pw_strength_lbl.configure(text="Very Strong", text_color=SUCCESS_GREEN)
        elif bits > 55:
            self.pw_strength_bar.set(0.75)
            self.pw_strength_bar.configure(progress_color=ACCENT_BLUE)
            self.pw_strength_lbl.configure(text="Strong", text_color=ACCENT_BLUE)
        elif bits > 40:
            self.pw_strength_bar.set(0.5)
            self.pw_strength_bar.configure(progress_color="#F59E0B")
            self.pw_strength_lbl.configure(text="Medium", text_color="#F59E0B")
        else:
            self.pw_strength_bar.set(0.25)
            self.pw_strength_bar.configure(progress_color=DANGER_RED)
            self.pw_strength_lbl.configure(text="Weak", text_color=DANGER_RED)

        self.set_status(f"Generated secure password ({length} chars).")

    def copy_pw(self):
        p = self.pw_display.get()
        if p:
            self.root.clipboard_clear()
            self.root.clipboard_append(p)
            self.btn_copy_pw.configure(text="✓ Copied!")
            self.root.after(2000, lambda: self.btn_copy_pw.configure(text="📋 Copy"))
            self.set_status("Password copied to clipboard.")

    def save_generated_to_vault(self):
        pw = self.pw_display.get()
        if not pw:
            return
        self.v_pw.delete(0, "end")
        self.v_pw.insert(0, pw)
        self.vault_tabs.set("Saved Vault")
        self.set_status("Pasted password into Vault tab. Enter service name to save.")

    def add_vault_entry(self):
        svc = self.v_svc.get().strip()
        user = self.v_user.get().strip()
        pw = self.v_pw.get().strip()
        if not svc or not pw:
            messagebox.showinfo("Enter Info", "Please specify at least Service name and Password.")
            return

        self.vault_data.append({
            "service": svc,
            "username": user or "N/A",
            "password": pw,
            "created": datetime.now().strftime("%Y-%m-%d")
        })
        self.save_vault_data()
        self.v_svc.delete(0, "end")
        self.v_user.delete(0, "end")
        self.v_pw.delete(0, "end")
        self.render_vault()
        self.set_status(f"Saved credentials for '{svc}' to vault.json.")

    def render_vault(self):
        for w in self.vault_scroll.winfo_children():
            w.destroy()

        if not self.vault_data:
            ctk.CTkLabel(self.vault_scroll, text="No credentials saved yet.", text_color=TEXT_MUTED).pack(pady=20)
            return

        for idx, entry in enumerate(self.vault_data):
            row = ctk.CTkFrame(self.vault_scroll, fg_color=LIGHT_CARD, corner_radius=10)
            row.pack(fill="x", pady=3, padx=4)

            info_text = f"🔑 {entry.get('service')}  •  {entry.get('username')}"
            ctk.CTkLabel(row, text=info_text, font=ctk.CTkFont(size=12, weight="bold"), text_color=TEXT_PRIMARY).pack(side="left", padx=10, pady=8)

            # Actions: Copy password & Delete
            pw_val = entry.get("password", "")
            ctk.CTkButton(
                row,
                text="🗑️ Delete",
                width=65,
                height=26,
                fg_color="#FEE2E2",
                hover_color="#FECACA",
                text_color=DANGER_RED,
                corner_radius=6,
                command=lambda i=idx: self.delete_vault_entry(i)
            ).pack(side="right", padx=6)

            ctk.CTkButton(
                row,
                text="📋 Copy PW",
                width=75,
                height=26,
                fg_color=("#EFF6FF", "#1E3A8A"),
                hover_color=("#DBEAFE", "#1E40AF"),
                text_color=ACCENT_BLUE,
                corner_radius=6,
                command=lambda p=pw_val: self._copy_text(p, "Vault password")
            ).pack(side="right", padx=2)

    def delete_vault_entry(self, idx):
        if 0 <= idx < len(self.vault_data):
            item = self.vault_data.pop(idx)
            self.save_vault_data()
            self.render_vault()
            self.set_status(f"Removed '{item.get('service')}' from vault.")

    def _copy_text(self, text, label):
        self.root.clipboard_clear()
        self.root.clipboard_append(text)
        self.set_status(f"Copied {label} to clipboard.")

    # =========================================================================
    # MODULE 4: SYSTEM RESOURCE MONITOR (REAL-TIME LIVE HARDWARE STATS)
    # =========================================================================
    def build_module_system(self):
        frame = ctk.CTkFrame(self.main_container, corner_radius=18, fg_color=LIGHT_CARD, border_width=1, border_color="#D5DFEC")

        header = ctk.CTkLabel(frame, text="⚡ System Resource Monitor", font=ctk.CTkFont(size=20, weight="bold"), text_color=TEXT_PRIMARY)
        header.pack(anchor="w", padx=24, pady=(20, 2))

        subtitle = ctk.CTkLabel(frame, text="Real-time hardware telemetry auto-refreshing every 1.5 seconds.", font=ctk.CTkFont(size=12), text_color=TEXT_MUTED)
        subtitle.pack(anchor="w", padx=24, pady=(0, 16))

        # 4 Telemetry Gauges Grid
        gauges_grid = ctk.CTkFrame(frame, fg_color="transparent")
        gauges_grid.pack(fill="x", padx=24, pady=0)
        gauges_grid.grid_columnconfigure((0, 1), weight=1)

        # CPU Card
        c1 = ctk.CTkFrame(gauges_grid, fg_color=LIGHT_INSET, corner_radius=14)
        c1.grid(row=0, column=0, padx=(0, 8), pady=4, sticky="nsew")
        self.sys_cpu_lbl = ctk.CTkLabel(c1, text="🧠 Processor (CPU): —", font=ctk.CTkFont(size=13, weight="bold"), text_color=TEXT_PRIMARY)
        self.sys_cpu_lbl.pack(anchor="w", padx=16, pady=(12, 4))
        self.sys_cpu_bar = ctk.CTkProgressBar(c1, height=12, corner_radius=6, progress_color=ACCENT_BLUE)
        self.sys_cpu_bar.pack(fill="x", padx=16, pady=(0, 12))
        self.sys_cpu_bar.set(0)

        # RAM Card
        c2 = ctk.CTkFrame(gauges_grid, fg_color=LIGHT_INSET, corner_radius=14)
        c2.grid(row=0, column=1, padx=(8, 0), pady=4, sticky="nsew")
        self.sys_ram_lbl = ctk.CTkLabel(c2, text="⚡ Memory (RAM): —", font=ctk.CTkFont(size=13, weight="bold"), text_color=TEXT_PRIMARY)
        self.sys_ram_lbl.pack(anchor="w", padx=16, pady=(12, 4))
        self.sys_ram_bar = ctk.CTkProgressBar(c2, height=12, corner_radius=6, progress_color="#10B981")
        self.sys_ram_bar.pack(fill="x", padx=16, pady=(0, 12))
        self.sys_ram_bar.set(0)

        # Disk Card
        c3 = ctk.CTkFrame(gauges_grid, fg_color=LIGHT_INSET, corner_radius=14)
        c3.grid(row=1, column=0, padx=(0, 8), pady=4, sticky="nsew")
        self.sys_disk_lbl = ctk.CTkLabel(c3, text="💾 Storage (Disk): —", font=ctk.CTkFont(size=13, weight="bold"), text_color=TEXT_PRIMARY)
        self.sys_disk_lbl.pack(anchor="w", padx=16, pady=(12, 4))
        self.sys_disk_bar = ctk.CTkProgressBar(c3, height=12, corner_radius=6, progress_color="#8B5CF6")
        self.sys_disk_bar.pack(fill="x", padx=16, pady=(0, 12))
        self.sys_disk_bar.set(0)

        # Battery / Power Card
        c4 = ctk.CTkFrame(gauges_grid, fg_color=LIGHT_INSET, corner_radius=14)
        c4.grid(row=1, column=1, padx=(8, 0), pady=4, sticky="nsew")
        self.sys_bat_lbl = ctk.CTkLabel(c4, text="🔋 Battery Status: —", font=ctk.CTkFont(size=13, weight="bold"), text_color=TEXT_PRIMARY)
        self.sys_bat_lbl.pack(anchor="w", padx=16, pady=(12, 4))
        self.sys_bat_bar = ctk.CTkProgressBar(c4, height=12, corner_radius=6, progress_color="#F59E0B")
        self.sys_bat_bar.pack(fill="x", padx=16, pady=(0, 12))
        self.sys_bat_bar.set(0)

        # Specs Diagnostics Card
        specs_box = ctk.CTkFrame(frame, fg_color=LIGHT_INSET, corner_radius=14)
        specs_box.pack(fill="both", expand=True, padx=24, pady=(14, 20))

        ctk.CTkLabel(specs_box, text="Hardware & Platform Diagnostics", font=ctk.CTkFont(size=13, weight="bold"), text_color=TEXT_PRIMARY).pack(anchor="w", padx=16, pady=(12, 4))

        self.sys_specs_tb = ctk.CTkTextbox(specs_box, font=ctk.CTkFont(size=12), fg_color=COLOR_ENTRY_BG, text_color=TEXT_PRIMARY, corner_radius=10)
        self.sys_specs_tb.pack(fill="both", expand=True, padx=16, pady=(0, 14))

        self.refresh_specs_info()

        return frame

    def refresh_specs_info(self):
        info = [
            f"• Operating System: {operating_system_name()} ({platform.version()[:30]})",
            f"• Architecture: {platform.machine()} ({platform.architecture()[0]})",
            f"• Processor: {platform.processor() or 'Unavailable'}",
            f"• Python Runtime: {platform.python_version()} ({sys.executable})",
            f"• Machine Hostname: {socket.gethostname()}",
            f"• System Monitoring: {'psutil ' + psutil.__version__ if psutil is not None else 'Unavailable'}"
        ]
        if psutil:
            try:
                cores = psutil.cpu_count(logical=True)
                info.insert(3, f"• Logical CPU Cores: {cores}")
            except Exception:
                pass
        self.sys_specs_tb.delete("1.0", "end")
        self.sys_specs_tb.insert("end", "\n\n".join(info))

    def start_system_monitor_loop(self):
        self._system_monitor_inflight = False

        def _tick():
            if not self.monitor_running:
                return
            if self._system_monitor_inflight:
                self.root.after(1500, _tick)
                return
            self._system_monitor_inflight = True

            def sample_metrics():
                cpu = ram = disk = bat_pct = None
                bat_charging = False
                has_battery = False

                if psutil is not None:
                    try:
                        cpu = psutil.cpu_percent(interval=0.5)
                    except (OSError, psutil.Error):
                        pass
                    try:
                        vmem = psutil.virtual_memory()
                        ram = vmem.percent
                    except (OSError, psutil.Error):
                        pass
                    try:
                        disk_root = (os.environ.get("SystemDrive", "C:") + "\\") if os.name == "nt" else os.path.abspath(os.sep)
                        d = psutil.disk_usage(disk_root)
                        disk = d.percent
                    except (OSError, psutil.Error):
                        pass
                    try:
                        bat = psutil.sensors_battery()
                        if bat:
                            bat_pct = bat.percent
                            bat_charging = bat.power_plugged
                            has_battery = True
                    except (OSError, psutil.Error, NotImplementedError):
                        pass

                def update():
                    self._system_monitor_inflight = False
                    self._update_system_stats(cpu, ram, disk, bat_pct, bat_charging, has_battery)
                    if self.monitor_running:
                        self.root.after(1500, _tick)

                self.root.after(0, update)

            threading.Thread(target=sample_metrics, name="OmniKitLegacySystemMonitor", daemon=True).start()

        self.root.after(800, _tick)

    def _update_system_stats(self, cpu, ram, disk, bat_pct, bat_charging, has_battery=True):
        cpu_label = f"{cpu:.0f}%" if cpu is not None else "Unavailable"
        ram_label = f"{ram:.0f}%" if ram is not None else "Unavailable"
        self.sidebar_stats_lbl.configure(text=f"CPU: {cpu_label} | RAM: {ram_label}")
        if hasattr(self, "sys_cpu_bar"):
            for value, bar, label, name in (
                (cpu, self.sys_cpu_bar, self.sys_cpu_lbl, "Processor (CPU)"),
                (ram, self.sys_ram_bar, self.sys_ram_lbl, "Memory (RAM)"),
                (disk, self.sys_disk_bar, self.sys_disk_lbl, "Storage (Disk)"),
            ):
                available = value is not None and math.isfinite(value)
                bar.set(max(0, min(100, value)) / 100.0 if available else 0)
                label.configure(text=f"{name}: {value:.1f}%" if available else f"{name}: Unavailable")
            battery_available = bat_pct is not None and math.isfinite(bat_pct)
            self.sys_bat_bar.set(max(0, min(100, bat_pct)) / 100.0 if battery_available else 0)
            if not has_battery:
                self.sys_bat_lbl.configure(text="🔌 Battery: Not detected")
            else:
                chg = "⚡ Charging" if bat_charging else "Discharging"
                self.sys_bat_lbl.configure(text=f"🔋 Battery: {bat_pct:.0f}% ({chg})")

    # =========================================================================
    # MODULE 5: PDF TOOLS (REAL MERGE & SPLIT VIA PYPDF)
    # =========================================================================
    def build_module_pdf(self):
        frame = ctk.CTkFrame(self.main_container, corner_radius=18, fg_color=LIGHT_CARD, border_width=1, border_color="#D5DFEC")

        header = ctk.CTkLabel(frame, text="📄 Simple PDF Tools (Merge & Split)", font=ctk.CTkFont(size=20, weight="bold"), text_color=TEXT_PRIMARY)
        header.pack(anchor="w", padx=24, pady=(20, 2))

        subtitle = ctk.CTkLabel(frame, text="Combine multiple PDF documents into one or extract selected pages into new files.", font=ctk.CTkFont(size=12), text_color=TEXT_MUTED)
        subtitle.pack(anchor="w", padx=24, pady=(0, 16))

        self.pdf_tabview = ctk.CTkTabview(frame, corner_radius=14)
        self.pdf_tabview.pack(fill="both", expand=True, padx=24, pady=(0, 20))
        tab_merge = self.pdf_tabview.add("Merge PDFs")
        tab_split = self.pdf_tabview.add("Split PDF")

        # --- Tab 1: Merge ---
        m_box = ctk.CTkFrame(tab_merge, fg_color=LIGHT_INSET, corner_radius=12)
        m_box.pack(fill="both", expand=True, padx=10, pady=10)

        m_top = ctk.CTkFrame(m_box, fg_color="transparent")
        m_top.pack(fill="x", padx=14, pady=14)

        ctk.CTkButton(m_top, text="+ Add PDF Files", fg_color=ACCENT_BLUE, text_color="#FFFFFF", corner_radius=10, command=self.add_pdfs).pack(side="left", padx=(0, 10))
        ctk.CTkButton(m_top, text="Clear Queue", fg_color=COLOR_BTN_SEC, text_color=TEXT_PRIMARY, hover_color=COLOR_BTN_SEC_HOVER, corner_radius=10, command=self.clear_pdfs).pack(side="left")

        self.pdf_list_tb = ctk.CTkTextbox(m_box, fg_color=COLOR_ENTRY_BG, text_color=TEXT_PRIMARY, corner_radius=10)
        self.pdf_list_tb.pack(fill="both", expand=True, padx=14, pady=(0, 12))
        self.pdf_list_tb.insert("end", "Click '+ Add PDF Files' above to queue documents for merging.\n")
        self.pdf_files = []

        ctk.CTkButton(
            m_box,
            text="✨ Combine All into Single PDF",
            height=42,
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color=ACCENT_BLUE,
            hover_color=ACCENT_BLUE_HOVER,
            corner_radius=10,
            command=self.merge_pdfs
        ).pack(fill="x", padx=14, pady=(0, 14))

        # --- Tab 2: Split ---
        s_box = ctk.CTkFrame(tab_split, fg_color=LIGHT_INSET, corner_radius=12)
        s_box.pack(fill="both", expand=True, padx=10, pady=10)

        s_top = ctk.CTkFrame(s_box, fg_color="transparent")
        s_top.pack(fill="x", padx=14, pady=14)

        ctk.CTkButton(s_top, text="📄 Select PDF to Split", fg_color=COLOR_BTN_SEC, hover_color=COLOR_BTN_SEC_HOVER, text_color=TEXT_PRIMARY, corner_radius=10, command=self.browse_split_pdf).pack(side="left", padx=(0, 10))
        self.split_info_lbl = ctk.CTkLabel(s_top, text="No PDF selected.", font=ctk.CTkFont(size=12), text_color=TEXT_MUTED)
        self.split_info_lbl.pack(side="left")

        ctk.CTkLabel(s_box, text="Enter Page Numbers or Ranges to Extract (e.g., 1-3, 5, 8-10):", font=ctk.CTkFont(size=12, weight="bold"), text_color=TEXT_PRIMARY).pack(anchor="w", padx=14, pady=(4, 4))
        self.split_pages_entry = ctk.CTkEntry(s_box, placeholder_text="e.g. 1-2, 4", height=36, corner_radius=8, fg_color=COLOR_ENTRY_BG, border_color=COLOR_ENTRY_BORDER, text_color=TEXT_PRIMARY)
        self.split_pages_entry.pack(fill="x", padx=14, pady=(0, 14))

        ctk.CTkButton(
            s_box,
            text="✂️ Extract & Save Selected Pages",
            height=42,
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color=ACCENT_BLUE,
            hover_color=ACCENT_BLUE_HOVER,
            corner_radius=10,
            command=self.split_pdf
        ).pack(fill="x", padx=14, pady=(0, 14))

        self.split_active_pdf = None
        self.split_total_pages = 0

        return frame

    def add_pdfs(self):
        files = filedialog.askopenfilenames(filetypes=[("PDF Documents", "*.pdf")])
        if files:
            for f in files:
                if f not in self.pdf_files:
                    self.pdf_files.append(f)
            self._render_pdfs()

    def clear_pdfs(self):
        self.pdf_files = []
        self._render_pdfs()

    def _render_pdfs(self):
        self.pdf_list_tb.delete("1.0", "end")
        if not self.pdf_files:
            self.pdf_list_tb.insert("end", "No PDF files queued.\n")
            return
        for i, f in enumerate(self.pdf_files, 1):
            sz = os.path.getsize(f) / 1024
            self.pdf_list_tb.insert("end", f"{i}. {os.path.basename(f)} ({sz:.1f} KB)\n")

    def merge_pdfs(self):
        if not pypdf:
            messagebox.showinfo("pypdf required", "Please install pypdf with: pip install pypdf")
            return
        if len(self.pdf_files) < 2:
            messagebox.showinfo("Need 2+ Files", "Please add at least 2 PDF documents to merge.")
            return

        out_p = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF Document", "*.pdf")])
        if not out_p:
            return

        try:
            if hasattr(pypdf, "PdfWriter"):
                merger = pypdf.PdfWriter()
            elif hasattr(pypdf, "PdfMerger"):
                merger = pypdf.PdfMerger()
            else:
                raise RuntimeError("No compatible PDF writer found in pypdf.")

            for p in self.pdf_files:
                merger.append(p)
            merger.write(out_p)
            merger.close()
            messagebox.showinfo("Success", f"Combined {len(self.pdf_files)} PDFs into:\n{os.path.basename(out_p)}")
            self.set_status("Merged PDFs successfully.")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to merge PDFs: {e}")

    def browse_split_pdf(self):
        f = filedialog.askopenfilename(filetypes=[("PDF Document", "*.pdf")])
        if not f:
            return
        if not pypdf:
            messagebox.showinfo("pypdf required", "Please install: pip install pypdf")
            return

        try:
            reader = pypdf.PdfReader(f)
            self.split_total_pages = len(reader.pages)
            self.split_active_pdf = f
            self.split_info_lbl.configure(text=f"Loaded: {os.path.basename(f)} ({self.split_total_pages} pages)")
            self.split_pages_entry.delete(0, "end")
            self.split_pages_entry.insert(0, f"1-{min(2, self.split_total_pages)}")
            self.set_status(f"Loaded PDF with {self.split_total_pages} pages.")
        except Exception as e:
            messagebox.showerror("Error", f"Could not read PDF: {e}")

    def split_pdf(self):
        if not self.split_active_pdf or not os.path.exists(self.split_active_pdf):
            messagebox.showinfo("Select PDF", "Please select a PDF document first!")
            return
        if not pypdf:
            messagebox.showinfo("pypdf required", "Please install: pip install pypdf")
            return

        range_str = self.split_pages_entry.get().strip()
        if not range_str:
            messagebox.showinfo("Enter Range", "Please enter page numbers (e.g. 1-2, 4).")
            return

        # Parse page string into 0-indexed page indices
        selected_pages = set()
        parts = [p.strip() for p in range_str.split(",") if p.strip()]
        try:
            for part in parts:
                if "-" in part:
                    start_s, end_s = part.split("-", 1)
                    s, e = int(start_s), int(end_s)
                    for p_num in range(s, e + 1):
                        if 1 <= p_num <= self.split_total_pages:
                            selected_pages.add(p_num - 1)
                else:
                    p_num = int(part)
                    if 1 <= p_num <= self.split_total_pages:
                        selected_pages.add(p_num - 1)
        except ValueError:
            messagebox.showinfo("Invalid Range", "Invalid page format. Use numbers and hyphens (e.g., 1-3, 5).")
            return

        if not selected_pages:
            messagebox.showinfo("No Pages", f"No valid pages selected. Document has {self.split_total_pages} pages.")
            return

        out_p = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF Document", "*.pdf")])
        if not out_p:
            return

        try:
            reader = pypdf.PdfReader(self.split_active_pdf)
            writer = pypdf.PdfWriter()
            for p_idx in sorted(selected_pages):
                writer.add_page(reader.pages[p_idx])
            with open(out_p, "wb") as f_out:
                writer.write(f_out)
            messagebox.showinfo("Success", f"Extracted {len(selected_pages)} pages into:\n{os.path.basename(out_p)}")
            self.set_status("Extracted PDF pages successfully.")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to split PDF: {e}")

    # =========================================================================
    # MODULE 6: TEXT & MARKDOWN UTILITY (REAL-TIME LIVE COUNTERS)
    # =========================================================================
    def build_module_text(self):
        frame = ctk.CTkFrame(self.main_container, corner_radius=18, fg_color=LIGHT_CARD, border_width=1, border_color="#D5DFEC")

        header = ctk.CTkLabel(frame, text="📝 Text & Markdown Utility", font=ctk.CTkFont(size=20, weight="bold"), text_color=TEXT_PRIMARY)
        header.pack(anchor="w", padx=24, pady=(20, 2))

        subtitle = ctk.CTkLabel(frame, text="Live character and word counts with instant case transformers and whitespace cleaner.", font=ctk.CTkFont(size=12), text_color=TEXT_MUTED)
        subtitle.pack(anchor="w", padx=24, pady=(0, 16))

        box = ctk.CTkFrame(frame, fg_color=LIGHT_INSET, corner_radius=14)
        box.pack(fill="both", expand=True, padx=24, pady=(0, 20))

        # Real-time Stats Banner
        self.txt_stats_banner = ctk.CTkLabel(
            box,
            text="Words: 0  •  Characters: 0  •  Lines: 0  •  Sentences: 0",
            font=ctk.CTkFont(size=13, weight="bold"),
            text_color=ACCENT_BLUE
        )
        self.txt_stats_banner.pack(anchor="w", padx=16, pady=(14, 6))

        # Editor Textbox
        self.txt_editor = ctk.CTkTextbox(box, fg_color=COLOR_ENTRY_BG, text_color=TEXT_PRIMARY, corner_radius=10)
        self.txt_editor.pack(fill="both", expand=True, padx=16, pady=(0, 10))
        self.txt_editor.bind("<KeyRelease>", self.on_text_change)

        # Transformation Buttons
        btn_row = ctk.CTkFrame(box, fg_color="transparent")
        btn_row.pack(fill="x", padx=16, pady=(0, 14))

        ctk.CTkButton(btn_row, text="UPPERCASE", width=95, fg_color=COLOR_BTN_SEC, text_color=TEXT_PRIMARY, hover_color=COLOR_BTN_SEC_HOVER, corner_radius=8, command=lambda: self.transform_text("upper")).pack(side="left", padx=(0, 6))
        ctk.CTkButton(btn_row, text="lowercase", width=95, fg_color=COLOR_BTN_SEC, text_color=TEXT_PRIMARY, hover_color=COLOR_BTN_SEC_HOVER, corner_radius=8, command=lambda: self.transform_text("lower")).pack(side="left", padx=6)
        ctk.CTkButton(btn_row, text="Title Case", width=95, fg_color=COLOR_BTN_SEC, text_color=TEXT_PRIMARY, hover_color=COLOR_BTN_SEC_HOVER, corner_radius=8, command=lambda: self.transform_text("title")).pack(side="left", padx=6)
        ctk.CTkButton(btn_row, text="Strip Spaces", width=95, fg_color=COLOR_BTN_SEC, text_color=TEXT_PRIMARY, hover_color=COLOR_BTN_SEC_HOVER, corner_radius=8, command=lambda: self.transform_text("strip")).pack(side="left", padx=6)
        ctk.CTkButton(btn_row, text="📋 Copy", width=80, fg_color=ACCENT_BLUE, text_color="#FFFFFF", hover_color=ACCENT_BLUE_HOVER, corner_radius=8, command=self.copy_text_editor).pack(side="right", padx=(6, 0))
        ctk.CTkButton(btn_row, text="Clear", width=70, fg_color=COLOR_BTN_SEC, text_color=TEXT_PRIMARY, hover_color=COLOR_BTN_SEC_HOVER, corner_radius=8, command=self.clear_text_editor).pack(side="right")

        self.on_text_change(None)

        return frame

    def on_text_change(self, event):
        raw = self.txt_editor.get("1.0", "end-1c")
        words = len(raw.split()) if raw.strip() else 0
        chars = len(raw)
        lines = len(raw.splitlines()) if raw else 0
        sentences = len([s for s in re.split(r'[.!?]+', raw) if s.strip()])
        self.txt_stats_banner.configure(text=f"Words: {words}  •  Characters: {chars}  •  Lines: {lines}  •  Sentences: {sentences}")

    def transform_text(self, mode):
        raw = self.txt_editor.get("1.0", "end-1c")
        if mode == "upper":
            res = raw.upper()
        elif mode == "lower":
            res = raw.lower()
        elif mode == "title":
            res = raw.title()
        elif mode == "strip":
            res = "\n".join(" ".join(line.split()) for line in raw.splitlines())
        else:
            res = raw

        self.txt_editor.delete("1.0", "end")
        self.txt_editor.insert("1.0", res)
        self.on_text_change(None)
        self.set_status(f"Transformed text ({mode}).")

    def copy_text_editor(self):
        raw = self.txt_editor.get("1.0", "end-1c")
        if raw:
            self.root.clipboard_clear()
            self.root.clipboard_append(raw)
            self.set_status("Text copied to clipboard.")

    def clear_text_editor(self):
        self.txt_editor.delete("1.0", "end")
        self.on_text_change(None)

    # =========================================================================
    # MODULE 7: QR CODE STUDIO (REAL QR GENERATION & READING)
    # =========================================================================
    def build_module_qr(self):
        frame = ctk.CTkFrame(self.main_container, corner_radius=18, fg_color=LIGHT_CARD, border_width=1, border_color="#D5DFEC")

        header = ctk.CTkLabel(frame, text="📱 QR Code Studio", font=ctk.CTkFont(size=20, weight="bold"), text_color=TEXT_PRIMARY)
        header.pack(anchor="w", padx=24, pady=(20, 2))

        subtitle = ctk.CTkLabel(frame, text="Generate scannable QR codes for websites and decode existing QR images.", font=ctk.CTkFont(size=12), text_color=TEXT_MUTED)
        subtitle.pack(anchor="w", padx=24, pady=(0, 16))

        self.qr_tabs = ctk.CTkTabview(frame, corner_radius=14)
        self.qr_tabs.pack(fill="both", expand=True, padx=24, pady=(0, 20))
        tab_gen = self.qr_tabs.add("Generate QR")
        tab_read = self.qr_tabs.add("Decode QR")

        # --- Tab 1: Generate ---
        g_box = ctk.CTkFrame(tab_gen, fg_color=LIGHT_INSET, corner_radius=12)
        g_box.pack(fill="both", expand=True, padx=10, pady=10)

        ctk.CTkLabel(g_box, text="Website Link or Message:", font=ctk.CTkFont(size=12, weight="bold"), text_color=TEXT_PRIMARY).pack(anchor="w", padx=16, pady=(14, 4))
        self.qr_in = ctk.CTkEntry(g_box, height=36, corner_radius=8, fg_color=COLOR_ENTRY_BG, border_color=COLOR_ENTRY_BORDER, text_color=TEXT_PRIMARY)
        self.qr_in.insert(0, "https://google.com")
        self.qr_in.pack(fill="x", padx=16, pady=(0, 10))

        # Color and Size row
        opt_r = ctk.CTkFrame(g_box, fg_color="transparent")
        opt_r.pack(fill="x", padx=16, pady=(0, 10))

        ctk.CTkLabel(opt_r, text="QR Color:", font=ctk.CTkFont(size=11, weight="bold"), text_color=TEXT_PRIMARY).pack(side="left", padx=(0, 6))
        self.qr_color_opt = ctk.CTkOptionMenu(opt_r, values=["Electric Blue", "Classic Black", "Emerald Green", "Deep Purple"], width=130, height=30, corner_radius=8)
        self.qr_color_opt.set("Electric Blue")
        self.qr_color_opt.pack(side="left", padx=(0, 16))

        ctk.CTkButton(opt_r, text="✨ Render QR", fg_color=ACCENT_BLUE, text_color="#FFFFFF", corner_radius=8, height=30, command=self.render_qr).pack(side="left", padx=(0, 8))
        ctk.CTkButton(opt_r, text="💾 Save PNG", fg_color=COLOR_BTN_SEC, text_color=TEXT_PRIMARY, hover_color=COLOR_BTN_SEC_HOVER, corner_radius=8, height=30, command=self.save_qr).pack(side="left")

        self.qr_canvas_lbl = ctk.CTkLabel(g_box, text="QR preview will appear here.", width=210, height=210, fg_color=COLOR_ENTRY_BG, corner_radius=12)
        self.qr_canvas_lbl.pack(pady=10)

        self.rendered_qr_img = None
        self.render_qr()

        # --- Tab 2: Decode ---
        d_box = ctk.CTkFrame(tab_read, fg_color=LIGHT_INSET, corner_radius=12)
        d_box.pack(fill="both", expand=True, padx=10, pady=10)

        ctk.CTkButton(
            d_box,
            text="📂 Select QR Image File",
            fg_color=COLOR_BTN_SEC,
            hover_color=COLOR_BTN_SEC_HOVER,
            text_color=TEXT_PRIMARY,
            corner_radius=10,
            height=38,
            command=self.decode_qr_image
        ).pack(anchor="w", padx=16, pady=(14, 10))

        ctk.CTkLabel(d_box, text="Decoded Message Content:", font=ctk.CTkFont(size=12, weight="bold"), text_color=TEXT_PRIMARY).pack(anchor="w", padx=16, pady=(0, 4))
        self.qr_decoded_tb = ctk.CTkTextbox(d_box, height=140, fg_color=COLOR_ENTRY_BG, text_color=TEXT_PRIMARY, corner_radius=10)
        self.qr_decoded_tb.pack(fill="both", expand=True, padx=16, pady=(0, 10))

        ctk.CTkButton(
            d_box,
            text="📋 Copy Decoded Text",
            fg_color=ACCENT_BLUE,
            text_color="#FFFFFF",
            corner_radius=8,
            height=34,
            command=self.copy_decoded_qr
        ).pack(anchor="w", padx=16, pady=(0, 14))

        return frame

    def render_qr(self):
        txt = self.qr_in.get().strip() or "https://google.com"
        if not qrcode or not Image:
            self.qr_canvas_lbl.configure(text="Install qrcode & pillow:\npip install qrcode[pil]")
            return

        color_map = {
            "Electric Blue": ACCENT_BLUE,
            "Classic Black": "#000000",
            "Emerald Green": SUCCESS_GREEN,
            "Deep Purple": "#7C3AED"
        }
        chosen = color_map.get(self.qr_color_opt.get(), ACCENT_BLUE)

        try:
            qr = qrcode.QRCode(box_size=6, border=2)
            qr.add_data(txt)
            qr.make(fit=True)
            img = qr.make_image(fill_color=chosen, back_color="#FFFFFF").convert("RGB")
            self.rendered_qr_img = img

            disp = img.copy()
            disp.thumbnail((200, 200))
            c_img = ctk.CTkImage(light_image=disp, dark_image=disp, size=disp.size)
            self.qr_canvas_lbl.configure(image=c_img, text="")
            self.qr_canvas_lbl.image = c_img
            self.set_status("Rendered fresh QR code.")
        except Exception as e:
            self.qr_canvas_lbl.configure(text=f"Error: {e}")

    def save_qr(self):
        if not self.rendered_qr_img:
            messagebox.showinfo("Render First", "Please render a QR code first!")
            return
        sp = filedialog.asksaveasfilename(defaultextension=".png", filetypes=[("PNG Image", "*.png")])
        if sp:
            self.rendered_qr_img.save(sp, "PNG")
            messagebox.showinfo("Saved", f"QR code saved successfully to:\n{os.path.basename(sp)}")
            self.set_status("QR Code image saved.")

    def decode_qr_image(self):
        p = filedialog.askopenfilename(filetypes=[("Image Files", "*.png;*.jpg;*.jpeg;*.webp;*.bmp")])
        if not p:
            return

        decoded_text = ""
        # Strategy 1: OpenCV if available
        if cv2:
            try:
                if Image:
                    with Image.open(p) as pil_img:
                        import numpy as np
                        img = cv2.cvtColor(np.array(pil_img.convert("RGB")), cv2.COLOR_RGB2BGR)
                else:
                    img = cv2.imread(p)
                if img is not None:
                    detector = cv2.QRCodeDetector()
                    data, _, _ = detector.detectAndDecode(img)
                    if data:
                        decoded_text = data
            except Exception:
                pass

        # Strategy 2: If no opencv or empty, try basic file inspection / fallback notice
        if not decoded_text:
            if not cv2:
                decoded_text = f"[Image loaded: {os.path.basename(p)}]\nNote: For automatic QR decoding, install opencv-python: pip install opencv-python"
            else:
                decoded_text = f"Could not detect a clear QR matrix in {os.path.basename(p)}."

        self.qr_decoded_tb.delete("1.0", "end")
        self.qr_decoded_tb.insert("end", decoded_text)
        self.set_status(f"Processed QR image: {os.path.basename(p)}")

    def copy_decoded_qr(self):
        t = self.qr_decoded_tb.get("1.0", "end-1c").strip()
        if t:
            self.root.clipboard_clear()
            self.root.clipboard_append(t)
            self.set_status("Decoded QR content copied to clipboard.")

    # =========================================================================
    # MODULE 8: EVERYDAY UNIT CONVERTER (REAL MATHEMATICAL ENGINE)
    # =========================================================================
    def build_module_converter(self):
        frame = ctk.CTkFrame(self.main_container, corner_radius=18, fg_color=LIGHT_CARD, border_width=1, border_color="#D5DFEC")

        header = ctk.CTkLabel(frame, text="📐 Everyday Unit & Currency Converter", font=ctk.CTkFont(size=20, weight="bold"), text_color=TEXT_PRIMARY)
        header.pack(anchor="w", padx=24, pady=(20, 2))

        subtitle = ctk.CTkLabel(frame, text="Exact mathematical conversion across 6 common categories.", font=ctk.CTkFont(size=12), text_color=TEXT_MUTED)
        subtitle.pack(anchor="w", padx=24, pady=(0, 16))

        box = ctk.CTkFrame(frame, fg_color=LIGHT_INSET, corner_radius=14)
        box.pack(fill="x", padx=24, pady=(0, 20))

        # Category Selector
        cat_r = ctk.CTkFrame(box, fg_color="transparent")
        cat_r.pack(fill="x", padx=16, pady=(16, 8))

        ctk.CTkLabel(cat_r, text="Category:", font=ctk.CTkFont(size=12, weight="bold"), text_color=TEXT_PRIMARY).pack(side="left", padx=(0, 8))
        self.conv_cat = ctk.CTkOptionMenu(
            cat_r,
            values=["Length", "Weight", "Temperature", "Data Storage", "Speed", "Currency (USD/EUR/GBP/JPY/INR)"],
            height=32,
            corner_radius=8,
            command=self._on_converter_cat_change
        )
        self.conv_cat.set("Length")
        self.conv_cat.pack(side="left")

        # Conversion Row
        row = ctk.CTkFrame(box, fg_color="transparent")
        row.pack(fill="x", padx=16, pady=(8, 16))

        self.u_val = ctk.CTkEntry(row, width=120, height=38, corner_radius=8, fg_color=COLOR_ENTRY_BG, border_color=COLOR_ENTRY_BORDER, text_color=TEXT_PRIMARY, font=ctk.CTkFont(size=14, weight="bold"))
        self.u_val.insert(0, "10")
        self.u_val.pack(side="left", padx=(0, 8))
        self.u_val.bind("<KeyRelease>", lambda e: self.calc_units())

        self.u_from = ctk.CTkOptionMenu(row, values=["Meters", "Kilometers", "Miles", "Feet", "Inches"], height=38, corner_radius=8, command=lambda v: self.calc_units())
        self.u_from.set("Meters")
        self.u_from.pack(side="left", padx=(0, 8))

        ctk.CTkButton(row, text="⇄ Swap", width=65, height=38, fg_color=COLOR_BTN_SEC, hover_color=COLOR_BTN_SEC_HOVER, text_color=TEXT_PRIMARY, corner_radius=8, command=self.swap_units).pack(side="left", padx=(0, 8))

        self.u_to = ctk.CTkOptionMenu(row, values=["Feet", "Meters", "Kilometers", "Miles", "Inches"], height=38, corner_radius=8, command=lambda v: self.calc_units())
        self.u_to.set("Feet")
        self.u_to.pack(side="left", padx=(0, 8))

        self.u_res = ctk.CTkEntry(row, height=38, corner_radius=8, fg_color=COLOR_ENTRY_BG, border_color=COLOR_ENTRY_BORDER, text_color=ACCENT_BLUE, font=ctk.CTkFont(size=14, weight="bold"))
        self.u_res.pack(side="left", fill="x", expand=True, padx=(0, 8))

        ctk.CTkButton(row, text="📋 Copy", width=70, height=38, fg_color=ACCENT_BLUE, text_color="#FFFFFF", corner_radius=8, command=self.copy_unit_result).pack(side="right")

        self.calc_units()

        return frame

    def _on_converter_cat_change(self, cat):
        units_map = {
            "Length": ["Meters", "Kilometers", "Miles", "Feet", "Inches"],
            "Weight": ["Kilograms", "Grams", "Pounds (lbs)", "Ounces (oz)"],
            "Temperature": ["Celsius", "Fahrenheit", "Kelvin"],
            "Data Storage": ["Megabytes (MB)", "Gigabytes (GB)", "Terabytes (TB)", "Kilobytes (KB)"],
            "Speed": ["Kilometers/h", "Miles/h", "Meters/sec", "Knots"],
            "Currency (USD/EUR/GBP/JPY/INR)": ["USD ($)", "EUR (€)", "GBP (£)", "JPY (¥)", "INR (₹)"]
        }
        avail = units_map.get(cat, ["Unit A", "Unit B"])
        self.u_from.configure(values=avail)
        self.u_to.configure(values=avail)
        self.u_from.set(avail[0])
        self.u_to.set(avail[1] if len(avail) > 1 else avail[0])
        self.calc_units()

    def swap_units(self):
        f = self.u_from.get()
        t = self.u_to.get()
        self.u_from.set(t)
        self.u_to.set(f)
        self.calc_units()

    def calc_units(self):
        v_str = self.u_val.get().strip()
        if not v_str:
            self.u_res.delete(0, "end")
            return
        try:
            val = float(v_str)
        except ValueError:
            return

        cat = self.conv_cat.get()
        f = self.u_from.get()
        t = self.u_to.get()
        res = 0.0

        if "Temperature" in cat:
            # First to Celsius
            c = val if f == "Celsius" else (val - 32) * 5 / 9 if f == "Fahrenheit" else val - 273.15
            # From Celsius to target
            res = c if t == "Celsius" else (c * 9 / 5) + 32 if t == "Fahrenheit" else c + 273.15
        else:
            factors = {
                # Length to Meters
                "Meters": 1.0, "Kilometers": 1000.0, "Miles": 1609.344, "Feet": 0.3048, "Inches": 0.0254,
                # Weight to Kilograms
                "Kilograms": 1.0, "Grams": 0.001, "Pounds (lbs)": 0.45359237, "Ounces (oz)": 0.0283495,
                # Data to MB
                "Megabytes (MB)": 1.0, "Gigabytes (GB)": 1024.0, "Terabytes (TB)": 1048576.0, "Kilobytes (KB)": 0.0009765625,
                # Speed to km/h
                "Kilometers/h": 1.0, "Miles/h": 1.60934, "Meters/sec": 3.6, "Knots": 1.852,
                # Currency baseline to USD
                "USD ($)": 1.0, "EUR (€)": 1.08, "GBP (£)": 1.28, "JPY (¥)": 0.0067, "INR (₹)": 0.012
            }
            f_val = factors.get(f, 1.0)
            t_val = factors.get(t, 1.0)
            base = val * f_val
            res = base / t_val

        self.u_res.delete(0, "end")
        self.u_res.insert(0, f"{res:,.4f}".rstrip('0').rstrip('.'))

    def copy_unit_result(self):
        r = self.u_res.get()
        if r:
            self.root.clipboard_clear()
            self.root.clipboard_append(r)
            self.set_status("Conversion result copied.")

    # =========================================================================
    # MODULE 9: QUICK NOTES & PERSISTENT TO-DO LIST (REAL JSON FILE)
    # =========================================================================
    def build_module_notes(self):
        frame = ctk.CTkFrame(self.main_container, corner_radius=18, fg_color=LIGHT_CARD, border_width=1, border_color="#D5DFEC")

        header = ctk.CTkLabel(frame, text="📌 Notes & To-Do List", font=ctk.CTkFont(size=20, weight="bold"), text_color=TEXT_PRIMARY)
        header.pack(anchor="w", padx=24, pady=(20, 2))

        subtitle = ctk.CTkLabel(frame, text="Organize tasks and notes with automatic background saving to omnikit_data.json.", font=ctk.CTkFont(size=12), text_color=TEXT_MUTED)
        subtitle.pack(anchor="w", padx=24, pady=(0, 16))

        grid = ctk.CTkFrame(frame, fg_color="transparent")
        grid.pack(fill="both", expand=True, padx=24, pady=(0, 20))
        grid.grid_columnconfigure((0, 1), weight=1)

        # Left Column: Tasks Manager
        t_box = ctk.CTkFrame(grid, fg_color=LIGHT_INSET, corner_radius=14)
        t_box.grid(row=0, column=0, sticky="nsew", padx=(0, 8))

        in_r = ctk.CTkFrame(t_box, fg_color="transparent")
        in_r.pack(fill="x", padx=14, pady=14)

        self.t_entry = ctk.CTkEntry(in_r, placeholder_text="Enter new task...", height=36, corner_radius=8, fg_color=COLOR_ENTRY_BG, border_color=COLOR_ENTRY_BORDER, text_color=TEXT_PRIMARY)
        self.t_entry.pack(side="left", fill="x", expand=True, padx=(0, 6))

        self.t_prio = ctk.CTkOptionMenu(in_r, values=["High", "Medium", "Low"], width=85, height=36, corner_radius=8)
        self.t_prio.set("Medium")
        self.t_prio.pack(side="left", padx=(0, 6))

        ctk.CTkButton(in_r, text="+ Add", width=65, height=36, fg_color=ACCENT_BLUE, corner_radius=8, command=self.add_task).pack(side="right")

        self.t_scroll = ctk.CTkScrollableFrame(t_box, height=280, fg_color="transparent")
        self.t_scroll.pack(fill="both", expand=True, padx=14, pady=(0, 14))

        # Right Column: Scratchpad
        n_box = ctk.CTkFrame(grid, fg_color=LIGHT_INSET, corner_radius=14)
        n_box.grid(row=0, column=1, sticky="nsew", padx=(8, 0))

        n_top = ctk.CTkFrame(n_box, fg_color="transparent")
        n_top.pack(fill="x", padx=14, pady=(14, 4))
        ctk.CTkLabel(n_top, text="Scratchpad (Auto-saved)", font=ctk.CTkFont(size=12, weight="bold"), text_color=TEXT_PRIMARY).pack(side="left")
        ctk.CTkButton(n_top, text="💾 Export to .txt", height=28, fg_color=COLOR_BTN_SEC, hover_color=COLOR_BTN_SEC_HOVER, text_color=TEXT_PRIMARY, corner_radius=6, command=self.export_notes).pack(side="right")

        self.notes_tb = ctk.CTkTextbox(n_box, fg_color=COLOR_ENTRY_BG, text_color=TEXT_PRIMARY, corner_radius=10)
        self.notes_tb.pack(fill="both", expand=True, padx=14, pady=(0, 14))
        self.notes_tb.insert("1.0", self.user_data.get("notes", ""))
        self.notes_tb.bind("<KeyRelease>", lambda e: self.save_notes())

        self.render_tasks()

        return frame

    def render_tasks(self):
        for w in self.t_scroll.winfo_children():
            w.destroy()

        tasks = self.user_data.get("tasks", [])
        if not tasks:
            ctk.CTkLabel(self.t_scroll, text="No tasks. Add one above!", text_color=TEXT_MUTED).pack(pady=20)
            return

        for idx, t in enumerate(tasks):
            r = ctk.CTkFrame(self.t_scroll, fg_color=LIGHT_CARD, corner_radius=8)
            r.pack(fill="x", pady=2)

            var = ctk.BooleanVar(value=t.get("done", False))
            cb = ctk.CTkCheckBox(
                r,
                text=t.get("text", ""),
                variable=var,
                text_color=TEXT_PRIMARY,
                command=lambda i=idx, v=var: self.toggle_t(i, v.get())
            )
            cb.pack(side="left", padx=10, pady=8, fill="x", expand=True)

            prio = t.get("priority", "Medium")
            p_color = DANGER_RED if prio == "High" else "#F59E0B" if prio == "Medium" else ACCENT_BLUE
            ctk.CTkLabel(r, text=prio, font=ctk.CTkFont(size=10, weight="bold"), text_color=p_color).pack(side="right", padx=6)

            ctk.CTkButton(
                r,
                text="✕",
                width=24,
                height=24,
                fg_color="#FEE2E2",
                hover_color="#FECACA",
                text_color=DANGER_RED,
                corner_radius=4,
                command=lambda i=idx: self.delete_task(i)
            ).pack(side="right", padx=(0, 4))

    def add_task(self):
        txt = self.t_entry.get().strip()
        prio = self.t_prio.get()
        if txt:
            self.user_data.setdefault("tasks", []).append({
                "id": int(time.time()),
                "text": txt,
                "done": False,
                "priority": prio
            })
            self.save_local_data()
            self.t_entry.delete(0, "end")
            self.render_tasks()
            self.set_status(f"Added task: '{txt}'")

    def toggle_t(self, idx, is_done):
        if 0 <= idx < len(self.user_data.get("tasks", [])):
            self.user_data["tasks"][idx]["done"] = is_done
            self.save_local_data()

    def delete_task(self, idx):
        if 0 <= idx < len(self.user_data.get("tasks", [])):
            t = self.user_data["tasks"].pop(idx)
            self.save_local_data()
            self.render_tasks()
            self.set_status(f"Removed task: '{t.get('text')}'")

    def save_notes(self):
        self.user_data["notes"] = self.notes_tb.get("1.0", "end-1c")
        self.save_local_data()

    def export_notes(self):
        txt = self.notes_tb.get("1.0", "end-1c")
        sp = filedialog.asksaveasfilename(defaultextension=".txt", filetypes=[("Text File", "*.txt")])
        if sp:
            with open(sp, "w", encoding="utf-8") as f:
                f.write(txt)
            messagebox.showinfo("Saved", "Notes exported successfully!")
            self.set_status("Notes exported to disk.")

    # =========================================================================
    # MODULE 10: NETWORK SPEED & LATENCY DIAGNOSTIC (REAL PING TEST)
    # =========================================================================
    def build_module_network(self):
        frame = ctk.CTkFrame(self.main_container, corner_radius=18, fg_color=LIGHT_CARD, border_width=1, border_color="#D5DFEC")

        header = ctk.CTkLabel(frame, text="🌐 Network Speed & Latency Diagnostic", font=ctk.CTkFont(size=20, weight="bold"), text_color=TEXT_PRIMARY)
        header.pack(anchor="w", padx=24, pady=(20, 2))

        subtitle = ctk.CTkLabel(frame, text="Real socket and ICMP response latency measurements with IP telemetry.", font=ctk.CTkFont(size=12), text_color=TEXT_MUTED)
        subtitle.pack(anchor="w", padx=24, pady=(0, 16))

        box = ctk.CTkFrame(frame, fg_color=LIGHT_INSET, corner_radius=14)
        box.pack(fill="x", padx=24, pady=(0, 20))

        # Target Host Input Row
        h_row = ctk.CTkFrame(box, fg_color="transparent")
        h_row.pack(fill="x", padx=16, pady=(16, 8))

        ctk.CTkLabel(h_row, text="Target Server / Host:", font=ctk.CTkFont(size=12, weight="bold"), text_color=TEXT_PRIMARY).pack(side="left", padx=(0, 8))

        self.net_host_entry = ctk.CTkEntry(h_row, width=180, height=36, corner_radius=8, fg_color=COLOR_ENTRY_BG, border_color=COLOR_ENTRY_BORDER, text_color=TEXT_PRIMARY)
        self.net_host_entry.insert(0, "8.8.8.8")
        self.net_host_entry.pack(side="left", padx=(0, 8))

        ctk.CTkButton(h_row, text="Google", width=65, height=30, fg_color=COLOR_BTN_SEC, text_color=TEXT_PRIMARY, hover_color=COLOR_BTN_SEC_HOVER, corner_radius=6, command=lambda: self._set_host("8.8.8.8")).pack(side="left", padx=2)
        ctk.CTkButton(h_row, text="Cloudflare", width=80, height=30, fg_color=COLOR_BTN_SEC, text_color=TEXT_PRIMARY, hover_color=COLOR_BTN_SEC_HOVER, corner_radius=6, command=lambda: self._set_host("1.1.1.1")).pack(side="left", padx=2)
        ctk.CTkButton(h_row, text="GitHub", width=65, height=30, fg_color=COLOR_BTN_SEC, text_color=TEXT_PRIMARY, hover_color=COLOR_BTN_SEC_HOVER, corner_radius=6, command=lambda: self._set_host("github.com")).pack(side="left", padx=2)

        # Status & Metrics
        self.net_status_lbl = ctk.CTkLabel(box, text="🟢 Internet Connection Ready", font=ctk.CTkFont(size=15, weight="bold"), text_color=SUCCESS_GREEN)
        self.net_status_lbl.pack(anchor="w", padx=16, pady=(10, 2))

        self.net_desc_lbl = ctk.CTkLabel(box, text="Click 'Test Connection Now' to test live response times.", font=ctk.CTkFont(size=12), text_color=TEXT_MUTED)
        self.net_desc_lbl.pack(anchor="w", padx=16, pady=(0, 12))

        # Action Button & Report Area
        self.btn_ping = ctk.CTkButton(
            box,
            text="🚀 Test Connection Now",
            height=40,
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color=ACCENT_BLUE,
            hover_color=ACCENT_BLUE_HOVER,
            corner_radius=10,
            command=self.check_net
        )
        self.btn_ping.pack(anchor="w", padx=16, pady=(0, 14))

        self.net_report_tb = ctk.CTkTextbox(box, height=140, fg_color=COLOR_ENTRY_BG, text_color=TEXT_PRIMARY, corner_radius=10)
        self.net_report_tb.pack(fill="both", expand=True, padx=16, pady=(0, 16))
        self.net_report_tb.insert("end", f"• Local Hostname: {socket.gethostname()}\n• Status: Ready to test ping latency.\n")

        return frame

    def _set_host(self, host):
        self.net_host_entry.delete(0, "end")
        self.net_host_entry.insert(0, host)

    def check_net(self):
        target = self.net_host_entry.get().strip() or "8.8.8.8"
        self.btn_ping.configure(state="disabled")
        self.net_status_lbl.configure(text="⏳ Measuring connection latency...", text_color=ACCENT_BLUE)
        self.net_report_tb.delete("1.0", "end")
        self.net_report_tb.insert("end", f"Pinging {target}...\n")

        def worker():
            latencies = []
            for i in range(3):
                got_latency = False
                try:
                    cmd = ["ping", "-n", "1", "-w", "1500", target] if os.name == 'nt' else ["ping", "-c", "1", "-W", "2", target]
                    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=2.0)
                    if proc.returncode == 0:
                        m = re.search(r"time[=<]\s*(\d+(?:\.\d+)?)\s*ms", proc.stdout, re.IGNORECASE)
                        if m:
                            latencies.append(float(m.group(1)))
                            got_latency = True
                except Exception:
                    pass

                if not got_latency:
                    t_start = time.time()
                    try:
                        s = socket.create_connection((target, 80 if not target.replace('.', '').isdigit() else 53), timeout=2.5)
                        s.close()
                        elapsed = (time.time() - t_start) * 1000.0
                        latencies.append(elapsed)
                    except Exception:
                        try:
                            t_s2 = time.time()
                            urllib.request.urlopen("https://www.google.com", timeout=2.5)
                            latencies.append((time.time() - t_s2) * 1000.0)
                        except Exception:
                            pass
                time.sleep(0.08)

            def update():
                self.btn_ping.configure(state="normal")
                if latencies:
                    avg_ms = sum(latencies) / len(latencies)
                    min_ms = min(latencies)
                    max_ms = max(latencies)
                    self.net_status_lbl.configure(text=f"✅ Connected to Internet (Average: {avg_ms:.1f} ms)", text_color=SUCCESS_GREEN)
                    self.net_desc_lbl.configure(text=f"Excellent latency: min {min_ms:.1f} ms, max {max_ms:.1f} ms.")

                    local_ip = "Unknown"
                    try:
                        s_temp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                        s_temp.connect(("8.8.8.8", 80))
                        local_ip = s_temp.getsockname()[0]
                        s_temp.close()
                    except Exception:
                        pass

                    report = [
                        f"• Target Server: {target}",
                        f"• Round-trip Latency: {avg_ms:.1f} ms (Min: {min_ms:.1f} ms, Max: {max_ms:.1f} ms)",
                        f"• Local IP Address: {local_ip}",
                        f"• Host Name: {socket.gethostname()}",
                        f"• Successful connectivity checks: {len(latencies)}/3",
                        f"• Connection Quality: {'Excellent' if avg_ms < 60 else 'Good' if avg_ms < 150 else 'Fair'}"
                    ]
                    self.net_report_tb.delete("1.0", "end")
                    self.net_report_tb.insert("end", "\n".join(report))
                    self.set_status(f"Ping successful! Average response: {avg_ms:.1f} ms.")
                else:
                    self.net_status_lbl.configure(text="⚠️ Internet Appears Offline or Host Unreachable", text_color=DANGER_RED)
                    self.net_desc_lbl.configure(text="Failed to receive responses within timeout.")
                    self.net_report_tb.delete("1.0", "end")
                    self.net_report_tb.insert("end", f"Could not establish connection to {target}.\nPlease check your network connection.")
                    self.set_status("Target host unreachable.")

            self.root.after(0, update)

        threading.Thread(target=worker, daemon=True).start()


class OmniKitWebApi:
    """Local PyWebView bridge for the existing on-device utility suite."""

    CATEGORY_EXTENSIONS = {
        "Documents": {".pdf", ".docx", ".doc", ".txt", ".xlsx", ".xls", ".pptx", ".ppt", ".csv", ".rtf"},
        "Images": {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico"},
        "Videos": {".mp4", ".mkv", ".mov", ".flv", ".avi", ".wmv", ".webm"},
        "Audio": {".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"},
        "Archives": {".zip", ".rar", ".tar", ".7z", ".gz", ".bz2"},
        "Code": {".py", ".exe", ".sh", ".html", ".css", ".js", ".json", ".ts", ".jsx", ".tsx", ".cpp", ".c"},
    }
    UNIT_FACTORS = {
        "Meters": 1.0, "Kilometers": 1000.0, "Miles": 1609.344, "Feet": 0.3048, "Inches": 0.0254,
        "Kilograms": 1.0, "Grams": 0.001, "Pounds (lbs)": 0.45359237, "Ounces (oz)": 0.0283495,
        "Megabytes (MB)": 1.0, "Gigabytes (GB)": 1024.0, "Terabytes (TB)": 1048576.0, "Kilobytes (KB)": 0.0009765625,
        "Kilometers/h": 1.0, "Miles/h": 1.60934, "Meters/sec": 3.6, "Knots": 1.852,
        "USD ($)": 1.0, "EUR (€)": 1.08, "GBP (£)": 1.28, "JPY (¥)": 0.0067, "INR (₹)": 0.012,
    }

    def __init__(self, app_dir, data_dir=None):
        self.app_dir = app_dir
        self.data_dir = data_dir or app_dir
        os.makedirs(self.data_dir, exist_ok=True)
        self.data_file = os.path.join(self.data_dir, "omnikit_data.json")
        self.vault_file = os.path.join(self.data_dir, "omnikit_vault.json")
        self._window = None
        self._data_lock = threading.RLock()
        self._metrics_lock = threading.Lock()
        self._cpu_samples = deque(maxlen=3)
        self._cpu_sampler_started = False
        self._start_cpu_sampler()

    def _start_cpu_sampler(self):
        if psutil is None:
            return
        with self._metrics_lock:
            if self._cpu_sampler_started:
                return
            self._cpu_sampler_started = True

        def sample_cpu():
            while True:
                try:
                    value = psutil.cpu_percent(interval=0.5)
                    if not math.isfinite(value) or not 0 <= value <= 100:
                        raise ValueError("CPU usage sample is outside the valid range.")
                    with self._metrics_lock:
                        self._cpu_samples.append(value)
                except (OSError, ValueError, psutil.Error):
                    with self._metrics_lock:
                        self._cpu_samples.clear()
                    time.sleep(0.5)
                except Exception:
                    with self._metrics_lock:
                        self._cpu_samples.clear()
                    logging.exception("Unexpected failure in the system CPU sampler.")
                    time.sleep(0.5)

        threading.Thread(target=sample_cpu, name="OmniKitCpuSampler", daemon=True).start()

    def _load_json(self, path, default):
        if not os.path.exists(path):
            return default
        try:
            with open(path, "r", encoding="utf-8") as data_file:
                value = json.load(data_file)
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
            raise RuntimeError(f"Could not read {os.path.basename(path)}: {error}") from error
        return value

    def _save_json(self, path, value):
        temporary_path = path + ".tmp"
        with self._data_lock:
            try:
                with open(temporary_path, "w", encoding="utf-8") as data_file:
                    json.dump(value, data_file, indent=2, ensure_ascii=False, allow_nan=False)
                os.replace(temporary_path, path)
            except (OSError, TypeError, ValueError) as error:
                try:
                    if os.path.exists(temporary_path):
                        os.remove(temporary_path)
                except OSError:
                    pass
                raise RuntimeError(f"Could not save {os.path.basename(path)}: {error}") from error

    def _local_data(self):
        with self._data_lock:
            data = self._load_json(self.data_file, {"tasks": [], "notes": ""})
            if not isinstance(data, dict):
                raise RuntimeError("Saved workspace data must be a JSON object.")
            tasks = data.setdefault("tasks", [])
            notes = data.setdefault("notes", "")
            if not isinstance(tasks, list) or any(
                not isinstance(task, dict)
                or not isinstance(task.get("id"), (str, int))
                or isinstance(task.get("id"), bool)
                or not isinstance(task.get("text"), str)
                or not isinstance(task.get("done", False), bool)
                or not isinstance(task.get("priority", "Medium"), str)
                or task.get("priority", "Medium") not in {"High", "Medium", "Low"}
                for task in tasks
            ):
                raise RuntimeError("Saved task data is invalid. Repair or remove omnikit_data.json.")
            task_ids = [str(task["id"]) for task in tasks]
            if len(task_ids) != len(set(task_ids)):
                raise RuntimeError("Saved task data contains duplicate IDs. Repair or remove omnikit_data.json.")
            if not isinstance(notes, str):
                raise RuntimeError("Saved notes data is invalid. Repair or remove omnikit_data.json.")
            return data

    def get_local_data(self):
        return self._local_data()

    def get_vault(self):
        with self._data_lock:
            vault = self._load_json(self.vault_file, [])
            if not isinstance(vault, list) or any(
                not isinstance(item, dict)
                or not isinstance(item.get("id", ""), (str, int))
                or isinstance(item.get("id"), bool)
                or not isinstance(item.get("service"), str)
                or not isinstance(item.get("username", ""), str)
                or not isinstance(item.get("password"), str)
                for item in vault
            ):
                raise RuntimeError("Saved password vault is invalid. Repair or remove omnikit_vault.json.")
            migrated = False
            for credential in vault:
                if not credential.get("id"):
                    credential["id"] = secrets.token_hex(12)
                    migrated = True
            credential_ids = [str(credential["id"]) for credential in vault]
            if len(credential_ids) != len(set(credential_ids)):
                raise RuntimeError("Saved password vault contains duplicate IDs. Repair or remove omnikit_vault.json.")
            if migrated:
                self._save_json(self.vault_file, vault)
            return vault

    def save_notes(self, notes):
        if not isinstance(notes, str):
            raise ValueError("Notes must be text.")
        with self._data_lock:
            data = self._local_data()
            data["notes"] = notes
            self._save_json(self.data_file, data)
        return True

    def add_task(self, text, priority="Medium"):
        if not isinstance(text, str):
            raise ValueError("Task text must be entered as text.")
        text = str(text).strip()
        if not text:
            raise ValueError("Task text cannot be empty.")
        if not isinstance(priority, str) or priority not in {"High", "Medium", "Low"}:
            raise ValueError("Choose a valid task priority.")
        with self._data_lock:
            data = self._local_data()
            task_id = int(time.time() * 1000)
            existing_ids = {str(item.get("id")) for item in data["tasks"]}
            while str(task_id) in existing_ids:
                task_id += 1
            data["tasks"].append({
                "id": task_id,
                "text": text,
                "done": False,
                "priority": priority,
            })
            self._save_json(self.data_file, data)
            return data["tasks"]

    def toggle_task(self, task_id):
        with self._data_lock:
            data = self._local_data()
            task = next((item for item in data["tasks"] if str(item.get("id")) == str(task_id)), None)
            if task is None:
                raise ValueError("That task no longer exists.")
            task["done"] = not bool(task.get("done", False))
            self._save_json(self.data_file, data)
            return data["tasks"]

    def delete_task(self, task_id):
        with self._data_lock:
            data = self._local_data()
            remaining = [item for item in data["tasks"] if str(item.get("id")) != str(task_id)]
            if len(remaining) == len(data["tasks"]):
                raise ValueError("That task no longer exists.")
            data["tasks"] = remaining
            self._save_json(self.data_file, data)
            return data["tasks"]

    def get_system_metrics(self):
        if psutil is None:
            raise RuntimeError("System monitoring requires psutil. Install the project dependencies.")
        cpu = ram = ram_used = ram_total = disk = battery_percent = None
        charging = False
        self._start_cpu_sampler()
        with self._metrics_lock:
            if self._cpu_samples:
                cpu = sum(self._cpu_samples) / len(self._cpu_samples)
        try:
            memory = psutil.virtual_memory()
            ram = memory.percent
            ram_used = self._format_bytes(memory.used)
            ram_total = self._format_bytes(memory.total)
        except (OSError, psutil.Error):
            pass
        disk_root = (os.environ.get("SystemDrive", "C:") or "C:") + "\\" if os.name == "nt" else os.path.abspath(os.sep)
        try:
            disk = psutil.disk_usage(disk_root).percent
        except (OSError, psutil.Error):
            pass
        try:
            battery = psutil.sensors_battery()
            if battery:
                battery_percent = battery.percent
                charging = bool(battery.power_plugged)
        except (OSError, psutil.Error, NotImplementedError):
            pass
        return {
            "cpu": cpu,
            "ram": ram,
            "ram_used": ram_used,
            "ram_total": ram_total,
            "disk": disk,
            "battery": battery_percent,
            "charging": charging,
            "host": socket.gethostname(),
            "os": operating_system_name(),
            "python": platform.python_version(),
            "sampled_at": datetime.now().astimezone().isoformat(),
        }

    @staticmethod
    def _format_bytes(value):
        amount = float(value)
        for unit in ("B", "KB", "MB", "GB", "TB"):
            if amount < 1024 or unit == "TB":
                return f"{amount:.1f} {unit}"
            amount /= 1024
        return f"{amount:.1f} TB"

    def get_dashboard_data(self):
        data = self._local_data()
        stats = self.get_system_metrics()
        return {"tasks": data["tasks"], "notes": data["notes"], "stats": stats}

    def pick_path(self, mode, kind, _filters=None):
        if self._window is None:
            raise RuntimeError("The local file picker is not available yet.")
        import webview

        file_types = {
            "image": ("Image files (*.jpg;*.jpeg;*.png;*.webp;*.bmp;*.gif)",),
            "qr-image": ("Image files (*.jpg;*.jpeg;*.png;*.webp;*.bmp;*.gif)",),
            "save-image": ("JPEG image (*.jpg)", "PNG image (*.png)", "WebP image (*.webp)"),
            "pdf": ("PDF files (*.pdf)",),
            "pdfs": ("PDF files (*.pdf)",),
            "save-pdf": ("PDF files (*.pdf)",),
            "save-png": ("PNG image (*.png)",),
            "save-text": ("Text files (*.txt)",),
        }
        dialog_types = {
            "open": webview.FileDialog.OPEN,
            "save": webview.FileDialog.SAVE,
            "folder": webview.FileDialog.FOLDER,
        }
        if mode not in dialog_types:
            raise ValueError("Unknown file-picker mode.")
        options = {}
        if mode == "open":
            options["file_types"] = file_types.get(kind, ())
        if mode == "save":
            options["file_types"] = file_types.get(kind, ())
            extensions = {"save-image": ".jpg", "save-pdf": ".pdf", "save-png": ".png", "save-text": ".txt"}
            options["save_filename"] = "optimized" + extensions.get(kind, "")
        selected = self._window.create_file_dialog(dialog_types[mode], **options)
        if not selected:
            return ""
        return selected[0] if isinstance(selected, (list, tuple)) else selected

    def pick_multiple_pdfs(self):
        if self._window is None:
            raise RuntimeError("The local file picker is not available yet.")
        import webview

        selected = self._window.create_file_dialog(
            webview.FileDialog.OPEN,
            allow_multiple=True,
            file_types=("PDF files (*.pdf)",),
        )
        return list(selected or [])

    def organize_files(self, folder, categories):
        folder = os.path.abspath(os.path.expanduser(str(folder)))
        if not os.path.isdir(folder):
            raise ValueError("Choose an existing folder.")
        if not isinstance(categories, (list, tuple, set)) or any(not isinstance(name, str) for name in categories):
            raise ValueError("Choose one or more file categories to organize.")
        unknown = set(categories) - set(self.CATEGORY_EXTENSIONS)
        if unknown:
            raise ValueError(f"Unknown file category: {sorted(unknown)[0]}")
        if not categories:
            raise ValueError("Choose at least one file category to organize.")
        active_extensions = set().union(*(self.CATEGORY_EXTENSIONS[name] for name in categories))
        try:
            filenames = os.listdir(folder)
        except OSError as error:
            raise RuntimeError(f"Could not read the selected folder: {error}") from error
        protected_files = {"omnikit_data.json", "omnikit_vault.json"}
        if os.path.normcase(folder) == os.path.normcase(os.path.abspath(self.app_dir)):
            protected_files.update({
                "main.py", "app.js", "index.html", "style.css", "README.md",
                "requirements.txt", "package.json", "bun.lock", "tsconfig.json",
                "vite.config.ts", "metadata.json", ".gitignore",
            })
        moved = 0
        failures = []
        for filename in filenames:
            source = os.path.join(folder, filename)
            if not os.path.isfile(source) or filename in protected_files:
                continue
            extension = os.path.splitext(filename)[1].lower()
            category = next(
                (name for name in categories if extension in self.CATEGORY_EXTENSIONS[name]),
                None,
            )
            if category is None or extension not in active_extensions:
                continue
            try:
                destination_folder = os.path.join(folder, category)
                os.makedirs(destination_folder, exist_ok=True)
                base, ext = os.path.splitext(filename)
                destination = os.path.join(destination_folder, filename)
                suffix = 1
                while os.path.exists(destination):
                    destination = os.path.join(destination_folder, f"{base}_{suffix}{ext}")
                    suffix += 1
                shutil.move(source, destination)
                moved += 1
            except OSError as error:
                failures.append(f"{filename}: {error}")
        if failures:
            raise RuntimeError(f"Organized {moved} file(s), but could not move: {'; '.join(failures)}")
        message = f"Successfully organized {moved} file(s)." if moved else "No files in this folder matched the selected categories."
        return {"moved": moved, "message": message}

    def image_info(self, path):
        if Image is None:
            raise RuntimeError("Image processing requires Pillow. Install the project dependencies.")
        path = os.path.abspath(os.path.expanduser(str(path)))
        if not os.path.isfile(path):
            raise ValueError("The selected image could not be found.")
        try:
            with Image.open(path) as image:
                width, height = image.size
        except Exception as error:
            raise RuntimeError(f"Could not read the selected image: {error}") from error
        return {"name": os.path.basename(path), "width": width, "height": height}

    def compress_image(self, source, output, quality=75, image_format="JPEG", width=None, height=None):
        if Image is None:
            raise RuntimeError("Image processing requires Pillow. Install the project dependencies.")
        source = os.path.abspath(os.path.expanduser(str(source)))
        output = str(output).strip()
        if not output:
            raise ValueError("Choose a destination file for the processed image.")
        output = os.path.abspath(os.path.expanduser(output))
        if not os.path.isfile(source):
            raise ValueError("The selected image could not be found.")
        if os.path.normcase(source) == os.path.normcase(output):
            raise ValueError("Choose a different output path so the original image is preserved.")
        try:
            numeric_quality = float(quality)
        except (TypeError, ValueError) as error:
            raise ValueError("Image quality must be a whole number between 5 and 100.") from error
        if not math.isfinite(numeric_quality) or not numeric_quality.is_integer():
            raise ValueError("Image quality must be a whole number between 5 and 100.")
        quality = int(numeric_quality)
        if not 5 <= quality <= 100:
            raise ValueError("Image quality must be between 5 and 100.")
        formats = {"JPEG": "JPEG", "JPG": "JPEG", "PNG": "PNG", "WEBP": "WEBP"}
        selected_format = formats.get(str(image_format).upper())
        if selected_format is None:
            raise ValueError("Choose JPEG, PNG, or WebP as the output format.")
        expected_extensions = {"JPEG": {".jpg", ".jpeg"}, "PNG": {".png"}, "WEBP": {".webp"}}
        if os.path.splitext(output)[1].lower() not in expected_extensions[selected_format]:
            raise ValueError(f"Choose an output filename with a {selected_format} extension.")
        try:
            with Image.open(source) as opened_image:
                image = opened_image.copy()
            original_size = os.path.getsize(source)
            original_width, original_height = image.size
        except Exception as error:
            raise RuntimeError(f"Could not open the selected image: {error}") from error
        try:
            target_width = original_width if width is None or str(width).strip() == "" else int(width)
            target_height = original_height if height is None or str(height).strip() == "" else int(height)
        except (TypeError, ValueError) as error:
            raise ValueError("Image dimensions must be whole numbers of pixels.") from error
        if target_width < 1 or target_height < 1:
            raise ValueError("Image dimensions must be positive numbers.")
        temporary_output = None
        try:
            if target_width != original_width or target_height != original_height:
                image.thumbnail((target_width, target_height), Image.Resampling.LANCZOS)
            if selected_format == "JPEG" and image.mode not in ("RGB", "L"):
                if "A" in image.getbands() or "transparency" in image.info:
                    rgba_image = image.convert("RGBA")
                    background = Image.new("RGB", rgba_image.size, "white")
                    background.paste(rgba_image, mask=rgba_image.getchannel("A"))
                    image = background
                else:
                    image = image.convert("RGB")
            save_options = {"quality": quality, "optimize": True} if selected_format in {"JPEG", "WEBP"} else {"optimize": True}
            os.makedirs(os.path.dirname(output) or self.app_dir, exist_ok=True)
            with tempfile.NamedTemporaryFile(dir=os.path.dirname(output) or self.app_dir, suffix=".tmp", delete=False) as temporary_file:
                temporary_output = temporary_file.name
            image.save(temporary_output, format=selected_format, **save_options)
            os.replace(temporary_output, output)
            output_size = os.path.getsize(output)
        except Exception as error:
            try:
                if temporary_output and os.path.exists(temporary_output):
                    os.remove(temporary_output)
            except OSError:
                pass
            raise RuntimeError(f"Could not process the selected image: {error}") from error
        return {
            "message": f"Image saved at {image.width} × {image.height} px.",
            "original_size": self._format_bytes(original_size),
            "output_size": self._format_bytes(output_size),
        }

    def generate_password(self, length=20, options=None):
        try:
            numeric_length = float(length)
        except (TypeError, ValueError) as error:
            raise ValueError("Password length must be a whole number between 8 and 64.") from error
        if not math.isfinite(numeric_length) or not numeric_length.is_integer():
            raise ValueError("Password length must be a whole number between 8 and 64.")
        length = int(numeric_length)
        if not 8 <= length <= 64:
            raise ValueError("Password length must be between 8 and 64 characters.")
        character_sets = {
            "upper": string.ascii_uppercase,
            "lower": string.ascii_lowercase,
            "digits": string.digits,
            "symbols": "!@#$%^&*()-_+=~",
        }
        if options is None:
            options = list(character_sets)
        if not isinstance(options, (list, tuple, set)) or any(
            not isinstance(name, str) or name not in character_sets for name in options
        ):
            raise ValueError("Choose valid password character types.")
        selected = [character_sets[name] for name in dict.fromkeys(options)]
        if not selected:
            raise ValueError("Choose at least one character type.")
        pool = "".join(selected)
        password = [secrets.choice(characters) for characters in selected]
        password.extend(secrets.choice(pool) for _ in range(length - len(password)))
        random.SystemRandom().shuffle(password)
        return "".join(password)

    def save_credential(self, service, username, password):
        if not isinstance(service, str) or not isinstance(username, str) or not isinstance(password, str):
            raise ValueError("Service, username, and password must be entered as text.")
        service, username, password = str(service).strip(), str(username).strip(), str(password)
        if not service or not password:
            raise ValueError("A service and password are required.")
        with self._data_lock:
            vault = self.get_vault()
            vault.append({
                "id": secrets.token_hex(12),
                "service": service,
                "username": username,
                "password": password,
                "created": datetime.now().strftime("%Y-%m-%d"),
            })
            self._save_json(self.vault_file, vault)
        return True

    def delete_credential(self, credential_id):
        with self._data_lock:
            vault = self.get_vault()
            remaining = [item for item in vault if str(item.get("id", "")) != str(credential_id)]
            if len(remaining) == len(vault):
                raise ValueError("That vault entry no longer exists.")
            self._save_json(self.vault_file, remaining)
        return True

    def _write_pdf(self, writer, output):
        output_dir = os.path.dirname(output) or self.app_dir
        temporary_output = None
        try:
            os.makedirs(output_dir, exist_ok=True)
            with tempfile.NamedTemporaryFile(dir=output_dir, suffix=".pdf", delete=False) as temporary_file:
                temporary_output = temporary_file.name
            with open(temporary_output, "wb") as output_file:
                writer.write(output_file)
            os.replace(temporary_output, output)
        except (OSError, ValueError, pypdf.errors.PyPdfError) as error:
            if temporary_output and os.path.exists(temporary_output):
                try:
                    os.remove(temporary_output)
                except OSError:
                    pass
            raise RuntimeError(f"Could not save the PDF: {error}") from error

    def merge_pdfs(self, paths, output):
        if pypdf is None:
            raise RuntimeError("PDF tools require pypdf. Install the project dependencies.")
        if not isinstance(paths, (list, tuple)) or any(not isinstance(path, str) or not path.strip() for path in paths):
            raise ValueError("Choose valid PDF files to merge.")
        if len(paths) < 2:
            raise ValueError("Select at least two PDF files to merge.")
        output = str(output).strip()
        if not output:
            raise ValueError("Choose a destination PDF file.")
        output = os.path.abspath(os.path.expanduser(output))
        if os.path.splitext(output)[1].lower() != ".pdf":
            raise ValueError("Choose an output filename ending in .pdf.")
        normalized_inputs = {os.path.normcase(os.path.abspath(os.path.expanduser(str(path)))) for path in paths}
        if os.path.normcase(output) in normalized_inputs:
            raise ValueError("Choose an output path different from the source PDF files.")
        writer = pypdf.PdfWriter()
        try:
            for path in paths:
                path = os.path.abspath(os.path.expanduser(path))
                if not os.path.isfile(path):
                    raise ValueError(f"PDF file not found: {os.path.basename(path)}")
                reader = pypdf.PdfReader(path)
                if reader.is_encrypted and not reader.decrypt(""):
                    raise ValueError(f"{os.path.basename(path)} is password-protected and cannot be merged.")
                if not reader.pages:
                    raise ValueError(f"{os.path.basename(path)} does not contain any pages.")
                for page in reader.pages:
                    writer.add_page(page)
        except (OSError, pypdf.errors.PyPdfError) as error:
            raise RuntimeError(f"Could not read a selected PDF: {error}") from error
        self._write_pdf(writer, output)
        return {"message": f"Merged {len(paths)} PDF files into {os.path.basename(output)}."}

    def split_pdf(self, source, pages, output):
        if pypdf is None:
            raise RuntimeError("PDF tools require pypdf. Install the project dependencies.")
        source = os.path.abspath(os.path.expanduser(str(source)))
        output = str(output).strip()
        if not output:
            raise ValueError("Choose a destination PDF file.")
        output = os.path.abspath(os.path.expanduser(output))
        if os.path.splitext(output)[1].lower() != ".pdf":
            raise ValueError("Choose an output filename ending in .pdf.")
        if not os.path.isfile(source):
            raise ValueError("The selected PDF could not be found.")
        if os.path.normcase(source) == os.path.normcase(output):
            raise ValueError("Choose a different output path so the original PDF is preserved.")
        try:
            reader = pypdf.PdfReader(source)
            if reader.is_encrypted and not reader.decrypt(""):
                raise ValueError("This PDF is password-protected and cannot be split.")
        except (OSError, pypdf.errors.PyPdfError) as error:
            raise RuntimeError(f"Could not read the selected PDF: {error}") from error
        selected_pages = set()
        parts = str(pages).split(",")
        if any(not part.strip() for part in parts):
            raise ValueError("Enter page numbers as a list such as 1-3, 5.")
        for part in parts:
            part = part.strip()
            if re.fullmatch(r"\d+", part):
                start = end = int(part)
            else:
                match = re.fullmatch(r"(\d+)\s*-\s*(\d+)", part)
                if not match:
                    raise ValueError("Enter page numbers as a list such as 1-3, 5.")
                start, end = map(int, match.groups())
            if start > end:
                raise ValueError(f"Invalid page range: {part}")
            if start < 1 or end > len(reader.pages):
                raise ValueError(f"Enter page numbers between 1 and {len(reader.pages)}.")
            selected_pages.update(range(start, end + 1))
        if not selected_pages or min(selected_pages) < 1 or max(selected_pages) > len(reader.pages):
            raise ValueError(f"Enter page numbers between 1 and {len(reader.pages)}.")
        writer = pypdf.PdfWriter()
        for page_number in sorted(selected_pages):
            writer.add_page(reader.pages[page_number - 1])
        self._write_pdf(writer, output)
        return {"message": f"Saved {len(selected_pages)} page(s) to {os.path.basename(output)}."}

    def transform_text(self, text, mode):
        text = str(text)
        if mode == "upper":
            return text.upper()
        if mode == "lower":
            return text.lower()
        if mode == "title":
            return text.title()
        if mode == "strip":
            return "\n".join(" ".join(line.split()) for line in text.splitlines())
        raise ValueError("Choose a supported text transformation.")

    def copy_to_clipboard(self, text):
        clipboard = None
        try:
            clipboard = tk.Tk()
            clipboard.withdraw()
            clipboard.clipboard_clear()
            clipboard.clipboard_append(str(text))
            clipboard.update()
        except Exception as error:
            raise RuntimeError(f"Could not copy text to the clipboard: {error}") from error
        finally:
            if clipboard is not None:
                try:
                    clipboard.destroy()
                except tk.TclError:
                    pass
        return True

    def generate_qr(self, text, output, color="blue"):
        if qrcode is None:
            raise RuntimeError("QR code generation requires qrcode. Install the project dependencies.")
        colors = {"blue": "#3155e7", "black": "#000000", "green": "#16845b", "purple": "#623cc7"}
        if not isinstance(color, str) or color not in colors:
            raise ValueError("Choose a supported QR color.")
        if not isinstance(text, str):
            raise ValueError("Enter text to encode in your QR code.")
        text = str(text)
        if not text.strip():
            raise ValueError("Enter text to encode in your QR code.")
        if len(text.encode("utf-8")) > 2000:
            raise ValueError("The text is too long to encode as a QR code. Use 2,000 bytes or fewer.")
        output = str(output).strip()
        if not output:
            raise ValueError("Choose a destination PNG file.")
        output = os.path.abspath(os.path.expanduser(output))
        if os.path.splitext(output)[1].lower() != ".png":
            raise ValueError("Choose an output filename ending in .png.")
        temporary_output = None
        try:
            output_dir = os.path.dirname(output) or self.app_dir
            os.makedirs(output_dir, exist_ok=True)
            qr_code = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M)
            qr_code.add_data(text)
            qr_code.make(fit=True)
            image = qr_code.make_image(fill_color=colors[color], back_color="white")
            with tempfile.NamedTemporaryFile(dir=output_dir, suffix=".png", delete=False) as temporary_file:
                temporary_output = temporary_file.name
            image.save(temporary_output)
            os.replace(temporary_output, output)
        except (OSError, ValueError) as error:
            if temporary_output and os.path.exists(temporary_output):
                try:
                    os.remove(temporary_output)
                except OSError:
                    pass
            raise RuntimeError(f"Could not create the QR code: {error}") from error
        return {"message": f"QR code saved to {output}."}

    def decode_qr(self, path):
        if cv2 is None:
            raise RuntimeError("QR decoding requires OpenCV. Install the project dependencies.")
        path = os.path.abspath(os.path.expanduser(str(path)))
        if not os.path.isfile(path):
            raise ValueError("The selected QR image could not be found.")
        if Image is not None:
            import numpy

            try:
                with Image.open(path) as opened_image:
                    image = cv2.cvtColor(numpy.array(opened_image.convert("RGB")), cv2.COLOR_RGB2BGR)
            except (OSError, ValueError) as error:
                raise ValueError(f"The selected QR image could not be read: {error}") from error
        else:
            try:
                image = cv2.imread(path)
            except cv2.error as error:
                raise ValueError(f"The selected QR image could not be read: {error}") from error
        if image is None:
            raise ValueError("The selected image could not be opened.")
        try:
            decoded_text, _, _ = cv2.QRCodeDetector().detectAndDecode(image)
        except cv2.error as error:
            raise RuntimeError(f"Could not decode the selected QR image: {error}") from error
        if not decoded_text:
            raise ValueError(f"No readable QR code was found in {os.path.basename(path)}.")
        return decoded_text

    def convert_units(self, category, value, from_unit, to_unit):
        if not all(isinstance(unit, str) for unit in (category, from_unit, to_unit)):
            raise ValueError("Choose valid units for this conversion category.")
        if isinstance(value, bool):
            raise ValueError("Enter a valid finite number.")
        try:
            value = float(value)
        except (TypeError, ValueError) as error:
            raise ValueError("Enter a valid finite number.") from error
        if not math.isfinite(value):
            raise ValueError("Enter a valid finite number.")
        units_by_category = {
            "Length": {"Meters", "Kilometers", "Miles", "Feet", "Inches"},
            "Weight": {"Kilograms", "Grams", "Pounds (lbs)", "Ounces (oz)"},
            "Temperature": {"Celsius", "Fahrenheit", "Kelvin"},
            "Data Storage": {"Megabytes (MB)", "Gigabytes (GB)", "Terabytes (TB)", "Kilobytes (KB)"},
            "Speed": {"Kilometers/h", "Miles/h", "Meters/sec", "Knots"},
            "Currency": {"USD ($)", "EUR (€)", "GBP (£)", "JPY (¥)", "INR (₹)"},
        }
        valid_units = units_by_category.get(category)
        if valid_units is None or from_unit not in valid_units or to_unit not in valid_units:
            raise ValueError("Choose valid units for this conversion category.")
        if category == "Temperature":
            to_celsius = {
                "Celsius": value,
                "Fahrenheit": (value - 32) * 5 / 9,
                "Kelvin": value - 273.15,
            }
            if from_unit not in to_celsius or to_unit not in {"Celsius", "Fahrenheit", "Kelvin"}:
                raise ValueError("Choose valid temperature units.")
            celsius = to_celsius[from_unit]
            if celsius < -273.15:
                raise ValueError("Temperature cannot be below absolute zero.")
            result = celsius if to_unit == "Celsius" else celsius * 9 / 5 + 32 if to_unit == "Fahrenheit" else celsius + 273.15
        else:
            if from_unit not in self.UNIT_FACTORS or to_unit not in self.UNIT_FACTORS:
                raise ValueError("Choose valid units for this conversion.")
            result = value * self.UNIT_FACTORS[from_unit] / self.UNIT_FACTORS[to_unit]
        if not math.isfinite(result):
            raise ValueError("The converted value is outside the supported range.")
        return f"{result:,.4f}".rstrip("0").rstrip(".")

    def export_notes(self, notes, output):
        output = os.path.abspath(os.path.expanduser(str(output)))
        try:
            with open(output, "w", encoding="utf-8") as output_file:
                output_file.write(str(notes))
        except OSError as error:
            raise RuntimeError(f"Could not export notes: {error}") from error
        return True

    def network_test(self, host):
        host = str(host).strip()
        if not host or re.search(r"\s", host):
            raise ValueError("Enter a valid host name or IP address.")
        started = time.perf_counter()
        try:
            with socket.create_connection((host, 443), timeout=3.0) as connection:
                latency = (time.perf_counter() - started) * 1000
                local_ip = connection.getsockname()[0]
        except (OSError, ValueError) as error:
            raise RuntimeError(f"Could not connect to {host} on port 443. Check the host and your network connection.") from error
        return {
            "host": host,
            "latency_ms": round(latency, 1),
            "local_ip": local_ip,
            "hostname": socket.gethostname(),
        }


def attach_to_default_desktop():
    """Ensure GUI process runs on the interactive user desktop (Default) on Windows."""
    if platform.system() == "Windows":
        try:
            import ctypes
            user32 = ctypes.windll.user32
            hdesk = user32.OpenDesktopW("Default", 0, False, 0x01FF)  # GENERIC_ALL
            if hdesk:
                user32.SetThreadDesktop(hdesk)
        except Exception:
            pass


def main():
    import webview

    app_dir = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    if getattr(sys, "frozen", False):
        data_dir = os.path.join(
            os.environ.get("LOCALAPPDATA", os.path.expanduser("~")),
            "OmniKit Studio",
        )
        os.makedirs(data_dir, exist_ok=True)
    else:
        data_dir = app_dir
    api = OmniKitWebApi(app_dir, data_dir=data_dir)
    window = webview.create_window(
        "OmniKit Studio — Your personal workspace",
        os.path.join(app_dir, "index.html"),
        js_api=api,
        width=1320,
        height=900,
        min_size=(900, 680),
        background_color="#dce5e8",
    )
    api._window = window
    webview.start(debug=False)


if __name__ == "__main__":
    main()
