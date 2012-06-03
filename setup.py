#!/usr/bin/env python
from setuptools import setup, find_packages

setup(
    name='watch-out',
    version='0.1',
    packages=find_packages(),
    zip_safe=False,
    install_requires=['Flask', 'redis'],
)
