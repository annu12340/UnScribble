"""Setup script for NVIDIA Earth-2 Simulation Model."""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="earth2-simulation",
    version="0.1.0",
    author="Your Name",
    description="NVIDIA Earth-2 weather simulation implementation",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/earth2-simulation",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Science/Research",
        "Topic :: Scientific/Engineering :: Atmospheric Science",
        "License :: OSI Approved :: Apache Software License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.9",
    install_requires=[
        "earth2studio>=0.14.0",
        "torch>=2.0.0",
        "xarray>=2023.1.0",
        "zarr>=2.14.0",
        "numpy>=1.24.0",
        "pandas>=2.0.0",
        "matplotlib>=3.7.0",
        "cartopy>=0.22.0",
    ],
    entry_points={
        "console_scripts": [
            "earth2-sim=earth2_simulation:main",
        ],
    },
)
