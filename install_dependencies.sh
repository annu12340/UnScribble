#!/bin/bash
# Installation script for Earth-2 Simulation dependencies

echo "=========================================="
echo "Installing Earth-2 Simulation Dependencies"
echo "=========================================="
echo ""

# Check Python version (try python3 first, then python)
echo "Checking Python version..."
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    python_version=$(python3 --version 2>&1 | awk '{print $2}')
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
    python_version=$(python --version 2>&1 | awk '{print $2}')
else
    echo "ERROR: Python not found!"
    exit 1
fi
echo "Python version: $python_version"

# Extract major and minor version
major=$(echo $python_version | cut -d. -f1)
minor=$(echo $python_version | cut -d. -f2)

echo ""
echo "Python $major.$minor detected"
echo ""

# Upgrade pip
echo "Upgrading pip..."
$PYTHON_CMD -m pip install --upgrade pip

# Install based on Python version
if [ "$major" -eq 3 ] && [ "$minor" -ge 11 ]; then
    echo "Python 3.11+ detected - installing latest Earth2Studio..."
    $PYTHON_CMD -m pip install -r requirements.txt
elif [ "$major" -eq 3 ] && [ "$minor" -ge 9 ]; then
    echo "Python 3.9/3.10 detected - installing compatible version..."
    if [ -f "requirements-py39.txt" ]; then
        $PYTHON_CMD -m pip install -r requirements-py39.txt
    else
        echo "ERROR: requirements-py39.txt not found!"
        exit 1
    fi
else
    echo "ERROR: Python 3.9+ is required. You have Python $python_version"
    exit 1
fi

echo ""
echo "=========================================="
echo "Verifying installation..."
echo "=========================================="

# Verify installation
$PYTHON_CMD -c "import torch; print('✓ PyTorch installed')" || echo "✗ PyTorch failed"
$PYTHON_CMD -c "import xarray; print('✓ Xarray installed')" || echo "✗ Xarray failed"
$PYTHON_CMD -c "import zarr; print('✓ Zarr installed')" || echo "✗ Zarr failed"
$PYTHON_CMD -c "import numpy; print('✓ NumPy installed')" || echo "✗ NumPy failed"
$PYTHON_CMD -c "import pandas; print('✓ Pandas installed')" || echo "✗ Pandas failed"
$PYTHON_CMD -c "import matplotlib; print('✓ Matplotlib installed')" || echo "✗ Matplotlib failed"
$PYTHON_CMD -c "import cartopy; print('✓ Cartopy installed')" || echo "✗ Cartopy failed"
$PYTHON_CMD -c "import earth2studio; print('✓ Earth2Studio installed'); print('  Version:', earth2studio.__version__)" || echo "✗ Earth2Studio failed"

echo ""
echo "=========================================="
echo "Installation complete!"
echo "=========================================="
echo ""
echo "To run the simulation:"
echo "  $PYTHON_CMD earth2_simulation.py"
echo ""
echo "To run your test script:"
echo "  $PYTHON_CMD a.py"
echo ""
