"""
Module Name: Credential Resolver

Description:
    An entry point of the client
Responsibilities:
    - Retrieve the run-time specific credentials from concurrent running process for requesting match metadata

Author: Steven
Created: 2026-01-17
"""

import subprocess
import re
import logging

import error
log= logging.getLogger(__name__)

class CredentialsParsingError(Exception):
    """Exception raised for missing port or token for LCU server."""

    def __init__(self, message="Credentials Missing!"):
        self.message = message
        super().__init__(self.message)

    def __str__(self):
        """Return a readable string representation of the error."""
        return f'{self.message} : Please check the LOL client is being active'


PATTERN = {
  "port": r"--app-port=(\d+)",
  "token": r"--remoting-auth-token=([^\s]+)",
}

class ProcessInspector:

    def __init__(self):
        self._processes = None

    
    def get_processes(self):

        if self._processes is None :
            run = subprocess.run(["ps" , "axww"], capture_output = True , text = True)
            self._processes = run.stdout
            return self._processes
        else:
            return self._processes
    
    def refresh(self):
        run = subprocess.run(["ps" , "axww"], capture_output = True , text = True)
        self._processes = run.stdout

    def reset(self):
        self._processes = None
    



class LCUCredential:

    def __init__(self, inspector : ProcessInspector):
        self.inspector = inspector
        self.pattern = PATTERN


    def parse(self):
        self.inspector.refresh()
        processes = self.inspector.get_processes()

        m = None
        r = None


        for line in processes.splitlines() : 
            if "--remoting-auth-token=" in line and "--app-port=" in line:
                    m = re.search(self.pattern["port"] ,line)
                    r = re.search(self.pattern["token"] , line)

            if m and r :
                    port = int(m.group(1))
                    token  = str(r.group(1))
                    return port,token

        raise error.CredentialsParsingError()







