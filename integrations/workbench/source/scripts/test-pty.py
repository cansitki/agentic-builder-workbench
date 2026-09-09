#!/usr/bin/env python3
"""Exercise the canonical PTY helper with an explicit shell and real output."""
import os
from pathlib import Path
import select
import subprocess
import tempfile
import time

with tempfile.TemporaryDirectory(prefix='workbench-pty-') as temp:
    shell=Path(temp)/'shell'
    shell.write_text('#!/bin/sh\nexport WB_PTY_TEST=configured\nexec /bin/sh -i\n')
    shell.chmod(0o700)
    env=os.environ.copy();env.update(VIN_TERM_SHELL=str(shell),SHELL='/nonexistent/default-shell')
    process=subprocess.Popen(['python3',str(Path(__file__).resolve().parents[1]/'pty-helper.py')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,env=env)
    try:
        process.stdin.write(b"printf 'PTY_%s\\n' \"$WB_PTY_TEST\"\n");process.stdin.flush()
        output=b'';deadline=time.monotonic()+8
        while time.monotonic()<deadline and b'PTY_configured' not in output:
            ready,_,_=select.select([process.stdout],[],[],0.2)
            if ready:
                chunk=os.read(process.stdout.fileno(),4096)
                if not chunk:break
                output+=chunk
        if b'PTY_configured' not in output:raise SystemExit('Configured shell did not execute through PTY')
        print('PTY executed with configured shell; no dependency on zsh.')
    finally:
        process.terminate()
        try:process.wait(timeout=3)
        except subprocess.TimeoutExpired:process.kill();process.wait()
