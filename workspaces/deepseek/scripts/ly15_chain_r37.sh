#!/bin/bash
while kill -0 1430845 2>/dev/null; do sleep 20; done
cd /workspace/lingyuan15
git log -1 --format=%s | grep -q r36 || exit 0
git status --short | grep -q . && exit 0
nohup /home/box/.npm/_npx/1e7f6d9597241db0/node_modules/.bin/dsh headless --permission-mode workspace-write --approval-policy never --add-dir /workspace/lingyuan15 --add-dir /workspace/ly15-shots --add-dir /workspace/lingyuan_art "$(cat /workspace/req_r37_npcart.txt)" > /workspace/ly15_harness_r37.log 2> /workspace/ly15_harness_r37.err &
