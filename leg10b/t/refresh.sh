#!/bin/sh
# 用最新的 10b 成品刷新测试用的两份文件
cd "$(dirname "$0")" && cp ../dusktrain-10b.html dusktrain-10.html && python3 mkTest.py >/dev/null && echo refreshed
