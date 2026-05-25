# Quick Fix Guide

## Your Error
```
ModuleNotFoundError: No module named 'earth2studio'
```

This means the dependencies are not installed in your virtual environment.

## Solution: Install Dependencies

### Step 1: Make sure you're in the virtual environment

You should see `(.venv)` in your terminal prompt. If not:

```bash
source .venv/bin/activate
```

### Step 2: Check your Python version

```bash
python --version
```

### Step 3: Install dependencies based on your Python version

#### If you have Python 3.11 or higher:

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

#### If you have Python 3.9 or 3.10:

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements-py39.txt
```

### Step 4: Verify installation

```bash
python check_installation.py
```

This will show you which packages are installed and which are missing.

### Step 5: Run your script

```bash
python a.py
```

## Alternative: Use the Installation Script

Make the script executable and run it:

```bash
chmod +x install_dependencies.sh
./install_dependencies.sh
```

This will automatically detect your Python version and install the correct dependencies.

## Common Issues

### Issue 1: "pip: command not found"

**Solution:** Use `python -m pip` instead:
```bash
python -m pip install -r requirements.txt
```

### Issue 2: Installation is very slow

**Solution:** This is normal. Earth2Studio and PyTorch are large packages. The first installation can take 10-30 minutes depending on your internet speed.

### Issue 3: Cartopy installation fails

**Solution:** Install system dependencies first:

**macOS:**
```bash
brew install geos proj
python -m pip install cartopy
```

**Ubuntu/Debian:**
```bash
sudo apt-get install libgeos-dev libproj-dev
python -m pip install cartopy
```

### Issue 4: Still getting "No module named 'earth2studio'"

**Solution:** Make sure you're in the virtual environment:

```bash
# Check which Python you're using
which python

# Should show: /Users/annu/Desktop/Rescue-Nine-Nine/.venv/bin/python
# If not, activate the environment:
source .venv/bin/activate
```

## Expected Installation Time

- **PyTorch**: 5-10 minutes (large download)
- **Earth2Studio**: 5-10 minutes (downloads from GitHub)
- **Other packages**: 2-5 minutes
- **Total**: 15-30 minutes

## Verification Commands

After installation, verify each package:

```bash
python -c "import torch; print('PyTorch:', torch.__version__)"
python -c "import xarray; print('Xarray:', xarray.__version__)"
python -c "import earth2studio; print('Earth2Studio:', earth2studio.__version__)"
```

All should print version numbers without errors.

## Still Having Issues?

1. **Check Python version**: `python --version` (must be 3.9+)
2. **Check pip version**: `python -m pip --version`
3. **Check virtual environment**: `which python` (should point to .venv)
4. **Try installing packages one by one**:
   ```bash
   python -m pip install torch
   python -m pip install xarray
   python -m pip install zarr
   python -m pip install numpy pandas matplotlib
   python -m pip install cartopy
   python -m pip install git+https://github.com/NVIDIA/earth2studio.git@0.2.0
   ```

5. **Check for error messages** and search for them online or ask for help

## Next Steps

Once installation is complete:

1. Run the check script: `python check_installation.py`
2. Run your test: `python a.py`
3. Explore examples: `python example_usage.py`

## Need More Help?

See the detailed guides:
- [PYTHON_VERSION_FIX.md](PYTHON_VERSION_FIX.md) - Python version issues
- [INSTALL.md](INSTALL.md) - Complete installation guide
- [GETTING_STARTED.md](GETTING_STARTED.md) - Getting started tutorial
