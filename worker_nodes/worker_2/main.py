import uvicorn
import os
import sys
from pathlib import Path

# Add parent directory to path so imports work
root_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(root_dir))

if __name__ == "__main__":
	port = int(os.environ.get("WORKER2_PORT", "8002"))
	uvicorn.run("worker_nodes.worker_2.api:app", host="0.0.0.0", port=port, log_level="info")

