#!/usr/bin/env node

/**
 * Logger pour les appels à Claude Code CLI
 * Enregistre les prompts, réponses, erreurs et métriques
 */

import { existsSync, mkdirSync, appendFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Crée un logger pour un dossier de sortie donné
 */
export function createClaudeLogger(outputDir) {
  const logsDir = join(outputDir, 'logs');
  const logFile = join(logsDir, 'claude-cli.log');
  const jsonLogFile = join(logsDir, 'claude-cli.json');

  // Créer le dossier logs si nécessaire
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }

  // Initialiser le fichier JSON avec un tableau vide
  if (!existsSync(jsonLogFile)) {
    writeFileSync(jsonLogFile, '[]');
  }

  /**
   * Formate un timestamp lisible
   */
  function formatTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Tronque un texte long pour le log
   */
  function truncate(text, maxLength = 500) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + `... [tronqué, ${text.length} chars total]`;
  }

  /**
   * Écrit une entrée dans le fichier log texte
   */
  function writeToTextLog(entry) {
    const separator = '═'.repeat(80);
    const lines = [
      '',
      separator,
      `[${entry.timestamp}] Agent: ${entry.agent}`,
      `Status: ${entry.status} | Code: ${entry.exitCode} | Durée: ${entry.duration}ms`,
      separator,
      '',
      '📝 PROMPT:',
      '─'.repeat(40),
      truncate(entry.prompt, 1000),
      '',
      '📤 STDOUT:',
      '─'.repeat(40),
      truncate(entry.stdout, 2000),
      '',
    ];

    if (entry.stderr) {
      lines.push(
        '⚠️ STDERR:',
        '─'.repeat(40),
        entry.stderr,
        ''
      );
    }

    if (entry.error) {
      lines.push(
        '❌ ERROR:',
        '─'.repeat(40),
        entry.error,
        ''
      );
    }

    appendFileSync(logFile, lines.join('\n'));
  }

  /**
   * Ajoute une entrée au fichier JSON
   */
  function writeToJsonLog(entry) {
    try {
      const existing = existsSync(jsonLogFile)
        ? JSON.parse(require('fs').readFileSync(jsonLogFile, 'utf-8'))
        : [];
      existing.push(entry);
      writeFileSync(jsonLogFile, JSON.stringify(existing, null, 2));
    } catch (e) {
      // Fallback: écrire en append
      appendFileSync(jsonLogFile.replace('.json', '.jsonl'), JSON.stringify(entry) + '\n');
    }
  }

  return {
    logFile,
    jsonLogFile,

    /**
     * Log le début d'un appel Claude
     */
    start(agentName, prompt) {
      const entry = {
        id: `${Date.now()}-${agentName}`,
        timestamp: formatTimestamp(),
        agent: agentName,
        prompt: prompt,
        status: 'started'
      };

      appendFileSync(logFile, `\n[${entry.timestamp}] 🚀 Starting agent: ${agentName}\n`);

      return {
        id: entry.id,
        startTime: Date.now(),
        agent: agentName,
        prompt: prompt,
        stdout: '',
        stderr: ''
      };
    },

    /**
     * Log la fin d'un appel Claude (succès ou erreur)
     */
    end(context, exitCode, error = null) {
      const duration = Date.now() - context.startTime;
      const status = exitCode === 0 ? 'success' : 'error';

      const entry = {
        id: context.id,
        timestamp: formatTimestamp(),
        agent: context.agent,
        status,
        exitCode,
        duration,
        prompt: context.prompt,
        stdout: context.stdout,
        stderr: context.stderr,
        error: error?.message || null
      };

      writeToTextLog(entry);
      writeToJsonLog(entry);

      return entry;
    },

    /**
     * Log un message simple
     */
    info(message) {
      appendFileSync(logFile, `[${formatTimestamp()}] ℹ️ ${message}\n`);
    },

    /**
     * Log une erreur
     */
    error(message, err = null) {
      const errorMsg = err ? `${message}: ${err.message}` : message;
      appendFileSync(logFile, `[${formatTimestamp()}] ❌ ${errorMsg}\n`);
    },

    /**
     * Log un warning
     */
    warn(message) {
      appendFileSync(logFile, `[${formatTimestamp()}] ⚠️ ${message}\n`);
    }
  };
}

/**
 * Logger global (fallback si pas de outputDir)
 */
let globalLogger = null;

export function getGlobalLogger(outputDir) {
  if (!globalLogger || outputDir) {
    globalLogger = createClaudeLogger(outputDir || process.cwd());
  }
  return globalLogger;
}