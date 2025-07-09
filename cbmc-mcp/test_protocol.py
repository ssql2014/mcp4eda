#!/usr/bin/env python3
"""Test MCP protocol for CBMC server"""

import json
import subprocess
import sys

def send_request(request):
    """Send a request to the server and get response"""
    cmd = [sys.executable, '/Users/qlss/Documents/mcp4eda/cbmc-mcp/server.py']
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    # Send request
    proc.stdin.write(json.dumps(request) + '\n')
    proc.stdin.flush()
    
    # Read response (with timeout)
    try:
        output, errors = proc.communicate(timeout=2)
        if errors:
            print(f"Server errors: {errors}")
        return output
    except subprocess.TimeoutExpired:
        proc.kill()
        return "Server timeout"

def main():
    # Test initialize request
    init_request = {
        "jsonrpc": "2.0",
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "test-client",
                "version": "1.0.0"
            }
        },
        "id": 1
    }
    
    print("Testing MCP Protocol...")
    print("Sending initialize request...")
    response = send_request(init_request)
    print(f"Response: {response}")

if __name__ == "__main__":
    main()