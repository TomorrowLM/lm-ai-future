from __future__ import annotations

import os
import re
import subprocess
from collections.abc import Mapping, Sequence
from pathlib import Path


_USER_DATA_DIR_PATTERN = re.compile(
    r"(?:^|\s)--user-data-dir(?:=|\s+)(?:\"([^\"]+)\"|'([^']+)'|(.+?))"
    r"(?=\s+--[\w-]+(?:=|\s)|$)"
)
_CHROME_EXECUTABLE_NAMES = {
    "chrome",
    "chrome.exe",
    "chromium",
    "chromium.exe",
    "chromium-browser",
    "google chrome",
    "google chrome beta",
    "google chrome canary",
    "google chrome dev",
    "google-chrome",
    "google-chrome-beta",
    "google-chrome-stable",
    "google-chrome-unstable",
}


def default_chrome_user_data_dirs(
    system: str,
    home: Path,
    env: Mapping[str, str],
) -> list[Path]:
    normalized_system = system.lower()
    if normalized_system in {"darwin", "macos"}:
        google_root = home / "Library" / "Application Support" / "Google"
        return [
            google_root / "Chrome",
            google_root / "Chrome Beta",
            google_root / "Chrome Dev",
            google_root / "Chrome Canary",
            home / "Library" / "Application Support" / "Chromium",
        ]

    if normalized_system in {"win32", "windows"}:
        local_app_data = Path(
            env.get("LOCALAPPDATA", str(home / "AppData" / "Local"))
        )
        google_root = local_app_data / "Google"
        return [
            google_root / "Chrome" / "User Data",
            google_root / "Chrome Beta" / "User Data",
            google_root / "Chrome Dev" / "User Data",
            google_root / "Chrome SxS" / "User Data",
            local_app_data / "Chromium" / "User Data",
        ]

    config_home = Path(env.get("XDG_CONFIG_HOME", str(home / ".config")))
    return [
        config_home / "google-chrome",
        config_home / "google-chrome-beta",
        config_home / "google-chrome-unstable",
        config_home / "chromium",
    ]


def extract_user_data_dir(command_line: str) -> Path | None:
    match = _USER_DATA_DIR_PATTERN.search(command_line)
    if not match:
        return None

    value = next((group for group in match.groups() if group is not None), "")
    if not value.strip():
        return None
    return Path(value.strip()).expanduser()


def _is_chrome_process(command_line: str) -> bool:
    executable = command_line.strip().split(" --", maxsplit=1)[0].strip("\"'")
    executable_name = executable.replace("\\", "/").rsplit("/", maxsplit=1)[-1].lower()
    return executable_name in _CHROME_EXECUTABLE_NAMES


def _running_chrome_command_lines(system: str) -> list[str]:
    if system.lower() in {"win32", "windows"}:
        command = (
            "Get-CimInstance Win32_Process | "
            "Where-Object { $_.Name -match '^(chrome|chromium)(\\.exe)?$' } | "
            "ForEach-Object { $_.CommandLine }"
        )
        args = ["powershell", "-NoProfile", "-Command", command]
    else:
        args = ["ps", "-ww", "-eo", "args="]

    try:
        completed = subprocess.run(
            args,
            capture_output=True,
            check=False,
            text=True,
            timeout=3,
        )
    except (OSError, subprocess.TimeoutExpired):
        return []
    if completed.returncode != 0:
        return []
    return [line for line in completed.stdout.splitlines() if line.strip()]


def _unique_paths(paths: Sequence[Path]) -> list[Path]:
    unique: list[Path] = []
    seen: set[str] = set()
    for path in paths:
        expanded = path.expanduser()
        normalized = os.path.normcase(os.path.normpath(str(expanded)))
        if normalized not in seen:
            seen.add(normalized)
            unique.append(expanded)
    return unique


def _default_user_data_dir_for_process(
    command_line: str,
    system: str,
    home: Path,
    env: Mapping[str, str],
) -> Path:
    defaults = default_chrome_user_data_dirs(system, home, env)
    normalized_line = command_line.lower().replace("\\", "/")
    executable = command_line.strip().split(" --", maxsplit=1)[0].strip("\"'")
    executable_name = executable.replace("\\", "/").rsplit("/", maxsplit=1)[-1].lower()

    if "chromium" in executable_name or "/chromium/" in normalized_line:
        marker = "chromium"
    elif "canary" in normalized_line or "chrome sxs" in normalized_line:
        marker = "canary"
    elif "beta" in normalized_line:
        marker = "beta"
    elif "dev" in normalized_line or "unstable" in normalized_line:
        marker = "dev"
    else:
        marker = "stable"

    for candidate in defaults:
        normalized_path = str(candidate).lower().replace("\\", "/")
        if marker == "canary" and ("canary" in normalized_path or "chrome sxs" in normalized_path):
            return candidate
        if marker == "beta" and "beta" in normalized_path:
            return candidate
        if marker == "dev" and ("chrome dev" in normalized_path or "unstable" in normalized_path):
            return candidate
        if marker == "chromium" and "chromium" in normalized_path:
            return candidate
    return defaults[0]


def running_chrome_user_data_dirs(
    system: str,
    home: Path,
    env: Mapping[str, str],
    command_lines: Sequence[str] | None = None,
) -> list[Path]:
    lines = command_lines
    if lines is None:
        lines = _running_chrome_command_lines(system)

    directories: list[Path] = []
    for command_line in lines:
        if not _is_chrome_process(command_line):
            continue
        user_data_dir = extract_user_data_dir(command_line)
        directories.append(
            user_data_dir
            or _default_user_data_dir_for_process(command_line, system, home, env)
        )
    return _unique_paths(directories)


def discover_chrome_user_data_dirs(
    system: str,
    home: Path,
    env: Mapping[str, str],
    command_lines: Sequence[str] | None = None,
) -> list[Path]:
    candidates = default_chrome_user_data_dirs(system, home, env)
    candidates.extend(
        running_chrome_user_data_dirs(system, home, env, command_lines)
    )
    return _unique_paths(candidates)


def read_devtools_active_port(user_data_dir: Path) -> str:
    active_port_file = user_data_dir.expanduser() / "DevToolsActivePort"
    lines = active_port_file.read_text(encoding="utf-8").splitlines()
    if len(lines) < 2:
        raise ValueError("DevToolsActivePort must contain a port and browser WebSocket path")

    try:
        port = int(lines[0])
    except ValueError as error:
        raise ValueError("DevToolsActivePort contains an invalid port") from error
    if not 1 <= port <= 65535:
        raise ValueError("DevToolsActivePort port must be between 1 and 65535")

    websocket_path = lines[1].strip()
    if not websocket_path.startswith("/devtools/browser/"):
        raise ValueError("DevToolsActivePort contains an invalid browser WebSocket path")
    return f"ws://127.0.0.1:{port}{websocket_path}"