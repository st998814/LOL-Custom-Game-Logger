"""
Module Name: Credential Resolver

Description:
    An entry point of the client
Responsibilities:
    - Retrieve the run-time specific credentials from concurrent running process for requesting match metadata

Author: Steven
Created: 2026-01-17
"""

import logging
import re
import subprocess

import lcu.error as error

log = logging.getLogger(__name__)


PATTERN = {
    "port": r"--app-port=(\d+)",
    "token": r"--remoting-auth-token=([^\s]+)",
}

# LeagueClientUx hosts the LCU remoting API. Riot Client also advertises
# --app-port/--remoting-auth-token but rejects lol-* routes. Require the UX
# binary followed by flags so LeagueClientUx Helper processes are skipped.
LCU_UX_BINARY = re.compile(r"[/\\]LeagueClientUx(?:\.exe)?\s+--")

PROCESS_COMMAND = ["ps", "axww"]
PORT_FLAG = "--app-port="
TOKEN_FLAG = "--remoting-auth-token="


class ProcessInspector:

    def __init__(self):
        self._processes = None

    def get_processes(self):
        if self._processes is None:
            self.refresh()

        return self._processes

    def refresh(self):
        try:
            run = subprocess.run(PROCESS_COMMAND, capture_output=True, text=True, check=False)
        except OSError as exc:
            raise error.CredentialsParsingError(
                "Unable to inspect running processes for League Client credentials. "
                "Check OS permissions, then restart the capture client."
            ) from exc

        if run.returncode != 0:
            raise error.CredentialsParsingError(
                "Unable to inspect running processes for League Client credentials. "
                "Check OS permissions, then restart the capture client."
            )

        self._processes = run.stdout

    def reset(self):
        self._processes = None


class LCUCredential:

    def __init__(self, inspector: ProcessInspector):
        self.inspector = inspector
        self.pattern = PATTERN

    def parse(self):
        self.inspector.refresh()
        processes = self.inspector.get_processes()

        has_partial_credentials = False

        for line in processes.splitlines():
            if not LCU_UX_BINARY.search(line):
                continue

            has_port_flag = PORT_FLAG in line
            has_token_flag = TOKEN_FLAG in line

            if not has_port_flag and not has_token_flag:
                continue

            if not has_port_flag or not has_token_flag:
                has_partial_credentials = True
                continue

            port_match = re.search(self.pattern["port"], line)
            token_match = re.search(self.pattern["token"], line)

            if port_match and token_match:
                port = int(port_match.group(1))
                token = str(token_match.group(1))

                return port, token

            has_partial_credentials = True

        if has_partial_credentials:
            raise error.CredentialsParsingError(
                "LCU credential flags were found, but port/token values were incomplete. "
                "Restart League, log in, then restart the capture client."
            )

        raise error.CredentialsParsingError()







