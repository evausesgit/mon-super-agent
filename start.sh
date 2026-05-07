#!/bin/bash
set -e

if [ -n "$HERMES_SSH_KEY" ]; then
  mkdir -p ~/.ssh
  printf '%s\n' "$HERMES_SSH_KEY" > ~/.ssh/id_rsa
  chmod 600 ~/.ssh/id_rsa
  cat >> ~/.ssh/config << 'EOF'
Host 65.108.202.130
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
EOF
fi

exec npm start
