"""
Module Name: credential_resolver

Description:
    A process watcher for resolving dynamic port and secret for LCU HTTP request.

Responsibilities:
    - Retrieve dynamic credentials from LCU for requesting match metadata


Author: Steven
Created: 2026-01-17
"""

import subprocess
import re


# run = subprocess.run(["ps" , "axww"], capture_output = True , text = True)

PATTERN = {"port":"--app-port=(\d+)",
           "token":"--remoting-auth-token=(\w+)"}

class ProcessInspector:

    def __init__(self):
        self._processes = None

    # retrieve "all" the processes that are currently running
    def get_processes(self):

        if self._processes == None :
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

        processes = self.inspector.get_processes()

        # filtering
        m = re.search(self.pattern["port"] , processes)
        r = re.search(self.pattern["token"] , processes)

        if m and r :
            port = int(m.group(1))
            token = str(r.group(1))
        elif not m :
            raise RuntimeError("Failed at parsing port")
        elif not r :
            raise RuntimeError("Failed at parsing token")
        else:
            raise RuntimeError("Failed at parsing token&token")

        return port,token















