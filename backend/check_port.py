#!/usr/bin/env python
import socket
import sys

def check_port(port):
    """Check if a port is in use."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(("127.0.0.1", port))
        print(f"✅ Port {port} is available!")
        return True
    except socket.error as e:
        print(f"❌ Port {port} is in use!")
        return False
    finally:
        s.close()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
    success = check_port(port)
    sys.exit(0 if success else 1)
