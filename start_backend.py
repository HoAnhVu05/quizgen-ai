import os
import sys
import time
import subprocess

# Ensure UTF-8 output on Windows
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

SERVICES = [
    {
        "name": "auth-service",
        "cwd": os.path.abspath(os.path.join(os.path.dirname(__file__), "services", "auth-service")),
        "port": 8001
    },
    {
        "name": "document-service",
        "cwd": os.path.abspath(os.path.join(os.path.dirname(__file__), "services", "document-service")),
        "port": 8002
    },
    {
        "name": "rag-service",
        "cwd": os.path.abspath(os.path.join(os.path.dirname(__file__), "services", "rag-service")),
        "port": 8003
    },
    {
        "name": "ai-service",
        "cwd": os.path.abspath(os.path.join(os.path.dirname(__file__), "services", "ai-service")),
        "port": 8004
    },
    {
        "name": "exam-service",
        "cwd": os.path.abspath(os.path.join(os.path.dirname(__file__), "services", "exam-service")),
        "port": 8005
    },
    {
        "name": "api-gateway",
        "cwd": os.path.abspath(os.path.join(os.path.dirname(__file__), "api-gateway")),
        "port": 8000
    }
]

python_exe = sys.executable

def main():
    processes = []
    print("=" * 60)
    print("[*] QUIZGEN AI - BACKEND MICROSERVICES RUNNER")
    print("=" * 60)

    for svc in SERVICES:
        cmd = [python_exe, "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", str(svc["port"])]
        print(f"[*] Starting {svc['name']:<18} on http://127.0.0.1:{svc['port']}...")
        p = subprocess.Popen(
            cmd,
            cwd=svc["cwd"]
        )
        processes.append((svc["name"], p, svc["port"]))
        time.sleep(0.5)

    print("\n[OK] All 6 backend services launched!")
    print("API Gateway ready at http://127.0.0.1:8000")
    print("Press Ctrl+C to stop all services.\n")

    try:
        while True:
            time.sleep(1)
            for name, p, port in processes:
                if p.poll() is not None:
                    print(f"[!] Service {name} (port {port}) stopped with code {p.returncode}")
    except KeyboardInterrupt:
        print("\nStopping all services...")
        for name, p, port in processes:
            p.terminate()
        for name, p, port in processes:
            p.wait()
        print("All services stopped.")

if __name__ == "__main__":
    main()
