#!/bin/bash
while kill -0 1253636 2>/dev/null; do sleep 20; done
cd /workspace/lingyuan15
git log -1 --format=%s | grep -q "r30" || exit 0
exec /home/box/.npm/_npx/1e7f6d9597241db0/node_modules/.bin/dsh headless --permission-mode workspace-write --approval-policy never --add-dir /workspace/lingyuan15 --add-dir /workspace/lingyuan_art --add-dir /workspace "$(cat /workspace/req_r31_rain.txt)" > /workspace/ly15_harness_r31.log 2> /workspace/ly15_harness_r31.err
