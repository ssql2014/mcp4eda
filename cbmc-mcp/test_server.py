#!/usr/bin/env python3
"""Test script for CBMC MCP server"""

import subprocess
import sys
import json

def test_cbmc_installation():
    """Test if CBMC is installed and accessible"""
    try:
        result = subprocess.run(['cbmc', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ CBMC is installed: {result.stdout.strip()}")
            return True
        else:
            print("✗ CBMC is not properly installed")
            return False
    except FileNotFoundError:
        print("✗ CBMC not found in PATH")
        return False

def test_python_modules():
    """Test if required Python modules are available"""
    modules = ['mcp', 'asyncio', 'pathlib']
    all_good = True
    
    for module in modules:
        try:
            __import__(module)
            print(f"✓ Module '{module}' is available")
        except ImportError:
            print(f"✗ Module '{module}' is missing")
            all_good = False
    
    return all_good

def test_mcp_server_import():
    """Test if the server can be imported"""
    try:
        sys.path.insert(0, '/Users/qlss/Documents/mcp4eda/cbmc-mcp')
        import server
        print("✓ Server module can be imported")
        return True
    except Exception as e:
        print(f"✗ Server import failed: {e}")
        return False

def main():
    print("CBMC MCP Server Diagnostics")
    print("=" * 40)
    
    tests = [
        ("CBMC Installation", test_cbmc_installation),
        ("Python Modules", test_python_modules),
        ("Server Import", test_mcp_server_import)
    ]
    
    all_passed = True
    for test_name, test_func in tests:
        print(f"\nTesting {test_name}...")
        if not test_func():
            all_passed = False
    
    print("\n" + "=" * 40)
    if all_passed:
        print("✓ All tests passed!")
    else:
        print("✗ Some tests failed")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())