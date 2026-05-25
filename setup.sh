#!/bin/bash
# Simple setup script for Earth-2 Simulation

echo "=========================================="
echo "Earth-2 Simulation Setup"
echo "=========================================="
echo ""

# Step 1: Check Python3
echo "Step 1: Checking Python3..."
if ! command -v python3 &> /dev/null; then
    echo "ERROR: python3 not found!"
    echo "Please install Python 3.9 or higher"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Found Python $PYTHON_VERSION"
echo ""

# Step 2: Create virtual environment
echo "Step 2: Creating virtual environment..."
if [ -d ".venv" ]; then
    echo "Virtual environment already exists"
    read -p "Remove and recreate? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf .venv
        python3 -m venv .venv
        echo "✓ Virtual environment recreated"
    fi
else
    python3 -m venv .venv
    echo "✓ Virtual environment created"
fi
echo ""

# Step 3: Activate and install
echo "Step 3: Installing dependencies..."
echo "This may take 15-30 minutes..."
echo ""

# Activate virtual environment
source .venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
python3 -m pip install --upgrade pip

# Determine which requirements file to use
MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$MAJOR" -eq 3 ] && [ "$MINOR" -ge 11 ]; then
    echo "Installing for Python 3.11+..."
    REQUIREMENTS="requirements.txt"
elif [ "$MAJOR" -eq 3 ] && [ "$MINOR" -ge 9 ]; then
    echo "Installing for Python 3.9/3.10..."
    REQUIREMENTS="requirements-py39.txt"
else
    echo "ERROR: Python 3.9+ required, you have $PYTHON_VERSION"
    exit 1
fi

echo "Using $REQUIREMENTS"
python3 -m pip install -r $REQUIREMENTS

echo ""
echo "=========================================="
echo "Verifying Installation"
echo "=========================================="
echo ""

# Verify
python3 -c "import torch; print('✓ PyTorch:', torch.__version__)" 2>/dev/null || echo "✗ PyTorch failed"
python3 -c "import xarray; print('✓ Xarray:', xarray.__version__)" 2>/dev/null || echo "✗ Xarray failed"
python3 -c "import zarr; print('✓ Zarr:', zarr.__version__)" 2>/dev/null || echo "✗ Zarr failed"
python3 -c "import numpy; print('✓ NumPy:', numpy.__version__)" 2>/dev/null || echo "✗ NumPy failed"
python3 -c "import pandas; print('✓ Pandas:', pandas.__version__)" 2>/dev/null || echo "✗ Pandas failed"
python3 -c "import matplotlib; print('✓ Matplotlib:', matplotlib.__version__)" 2>/dev/null || echo "✗ Matplotlib failed"
python3 -c "import cartopy; print('✓ Cartopy:', cartopy.__version__)" 2>/dev/null || echo "✗ Cartopy failed"
python3 -c "import earth2studio; print('✓ Earth2Studio:', earth2studio.__version__)" 2>/dev/null || echo "✗ Earth2Studio failed"

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "To use the environment:"
echo "  1. Activate: source .venv/bin/activate"
echo "  2. Run: python3 a.py"
echo ""
echo "Or run directly:"
echo "  .venv/bin/python3 a.py"
echo ""
