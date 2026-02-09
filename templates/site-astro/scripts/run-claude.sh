#!/bin/sh
# Wrapper pour exécuter Claude CLI en tant qu'utilisateur non-root
# Nécessaire car --dangerously-skip-permissions ne fonctionne pas en root
#
# Usage: run-claude.sh --dangerously-skip-permissions --print "prompt"

# Si on n'est pas root, exécuter normalement
if [ "$(id -u)" != "0" ]; then
    exec claude "$@"
fi

# On est root - préparer l'environnement pour l'utilisateur claude

# Copier l'auth Claude si nécessaire
if [ -d "/root/.claude" ]; then
    mkdir -p /home/claude/.claude
    cp -r /root/.claude/* /home/claude/.claude/ 2>/dev/null || true
    chown -R claude:claude /home/claude/.claude
fi

# S'assurer que l'utilisateur claude peut accéder au dossier courant
WORKDIR="$(pwd)"
chown -R claude:claude "$WORKDIR" 2>/dev/null || true

# Écrire le prompt (dernier argument) dans un fichier temporaire
# Cela évite les problèmes d'échappement avec les caractères spéciaux
PROMPT_FILE=$(mktemp /tmp/claude-prompt-XXXXXX.txt)

# Le dernier argument est le prompt
for last; do true; done
printf '%s' "$last" > "$PROMPT_FILE"
chown claude:claude "$PROMPT_FILE"
chmod 644 "$PROMPT_FILE"

# Construire les flags (tous les arguments sauf le dernier)
FLAGS=""
PREV=""
for arg in "$@"; do
    if [ -n "$PREV" ]; then
        FLAGS="$FLAGS $PREV"
    fi
    PREV="$arg"
done

# Créer un script runner pour éviter les problèmes d'échappement shell
RUNNER=$(mktemp /tmp/claude-runner-XXXXXX.sh)
cat > "$RUNNER" << ENDSCRIPT
#!/bin/sh
export HOME=/home/claude
export PATH="\$PATH:/usr/local/bin"
cd "$WORKDIR"
claude $FLAGS "\$(cat '$PROMPT_FILE')"
ENDSCRIPT

chmod +x "$RUNNER"
chown claude:claude "$RUNNER"

# Exécuter le script en tant qu'utilisateur claude
su -s /bin/sh claude -c "$RUNNER"
EXIT_CODE=$?

# Nettoyage
rm -f "$PROMPT_FILE" "$RUNNER"
exit $EXIT_CODE
