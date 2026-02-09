#!/bin/sh
# Wrapper pour exécuter Claude CLI en tant qu'utilisateur non-root
# Nécessaire car --dangerously-skip-permissions ne fonctionne pas en root

# Si on est root, exécuter en tant que 'claude' user
if [ "$(id -u)" = "0" ]; then
    # S'assurer que l'utilisateur claude peut accéder au dossier courant
    chown -R claude:claude "$(pwd)" 2>/dev/null || true

    # Copier l'auth Claude si nécessaire
    if [ -d "/root/.claude" ] && [ ! -d "/home/claude/.claude/settings" ]; then
        cp -r /root/.claude/* /home/claude/.claude/ 2>/dev/null || true
        chown -R claude:claude /home/claude/.claude
    fi

    # Exécuter claude en tant qu'utilisateur claude
    exec su -s /bin/sh claude -c "cd '$(pwd)' && claude $*"
else
    # Si pas root, exécuter normalement
    exec claude "$@"
fi
