#!/usr/bin/env bash
# Kör spelet headless i den strikta riggen (kräver node)
set -euo pipefail
cd "$(dirname "$0")"
python3 -c "
import re;h=open('../index.html').read()
m=re.findall(r'<script>(.*?)</script>', h, re.S)
open('g.js','w').write(next(s for s in m if 'const cv = ' in s))"
trap 'rm -f g.js' EXIT
node strict-harness.js
INK_TEST_NO_SDK=1 node strict-harness.js
