import os, pty, sys, time
argv, pw = sys.argv[1:], os.environ["STAFF_PW"]
pid, fd = pty.fork()
if pid == 0:
    os.execvpe(argv[0], argv, os.environ)
out = b""; sent = 0; end = time.time() + 30
while time.time() < end:
    try: chunk = os.read(fd, 1024)
    except OSError: break
    if not chunk: break
    out += chunk
    if sent < 2 and chunk.rstrip().endswith(b":"):
        os.write(fd, (pw + "\n").encode()); sent += 1
_, status = os.waitpid(pid, 0)
print(out.decode("utf-8", "ignore").replace(pw, "***").strip()[-300:]); sys.exit(os.waitstatus_to_exitcode(status))
