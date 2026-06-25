let editorInstance = null;
let fallbackTextarea = null;
let monacoReadyPromise = null;

export function disposeEditor() {
  if (editorInstance) {
    editorInstance.dispose();
    editorInstance = null;
  }
  if (fallbackTextarea) {
    fallbackTextarea.remove();
    fallbackTextarea = null;
  }
}

function ensureMonacoLoaded() {
  if (monacoReadyPromise) return monacoReadyPromise;

  monacoReadyPromise = new Promise((resolve, reject) => {
    if (typeof window.require === 'undefined') {
      reject(new Error('Monaco loader not available'));
      return;
    }

    try {
      const basePath = window.MONACO_BASE_PATH || '../node_modules/monaco-editor/min/vs';
      window.require.config({ paths: { vs: basePath } });

      window.require(['vs/editor/editor.main'], function () {
        definePyPathTheme();
        resolve();
      });
    } catch (e) {
      reject(e);
    }
  });

  return monacoReadyPromise;
}

function definePyPathTheme() {
  if (typeof monaco === 'undefined') return;

  monaco.editor.defineTheme('pypath-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '484F58' },
      { token: 'keyword', foreground: 'FF7B72' },
      { token: 'string', foreground: 'A5D6FF' },
      { token: 'number', foreground: '79C0FF' },
      { token: 'type.identifier', foreground: 'FF7B72' },
      { token: 'function', foreground: 'D2A8FF' },
      { token: 'delimiter', foreground: 'F0F6FC' },
      { token: 'variable.predefined', foreground: 'FF7B72' },
    ],
    colors: {
      'editor.background': '#0D1117',
      'editor.foreground': '#F0F6FC',
      'editor.lineHighlightBackground': '#161B22',
      'editor.selectionBackground': '#388BFD33',
      'editor.inactiveSelectionBackground': '#388BFD1A',
      'editorCursor.foreground': '#F0F6FC',
      'editorLineNumber.foreground': '#484F58',
      'editorLineNumber.activeForeground': '#8B949E',
      'editor.selectionHighlightBackground': '#30363D',
      'editorBracketMatch.background': '#30363D',
      'editorBracketMatch.border': '#484F58',
      'editorWidget.background': '#161B22',
      'editorWidget.border': '#21262D',
      'input.background': '#0D1117',
      'input.border': '#30363D',
      'input.foreground': '#F0F6FC',
      'focusBorder': '#388BFD',
      'list.activeSelectionBackground': '#388BFD1A',
      'list.hoverBackground': '#2D333B',
    }
  });

  monaco.editor.defineTheme('pypath-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8C959F' },
      { token: 'keyword', foreground: 'CF222E' },
      { token: 'string', foreground: '0A3069' },
      { token: 'number', foreground: '0550AE' },
      { token: 'type.identifier', foreground: 'CF222E' },
      { token: 'function', foreground: '8250DF' },
      { token: 'delimiter', foreground: '1C2128' },
      { token: 'variable.predefined', foreground: 'CF222E' },
    ],
    colors: {
      'editor.background': '#F6F8FA',
      'editor.foreground': '#1C2128',
      'editor.lineHighlightBackground': '#EAEEF2',
      'editor.selectionBackground': '#388BFD33',
      'editor.inactiveSelectionBackground': '#388BFD1A',
      'editorCursor.foreground': '#1C2128',
      'editorLineNumber.foreground': '#8C959F',
      'editorLineNumber.activeForeground': '#57606A',
      'editor.selectionHighlightBackground': '#D0D7DE',
      'editorBracketMatch.background': '#D0D7DE',
      'editorBracketMatch.border': '#8C959F',
      'editorWidget.background': '#F6F8FA',
      'editorWidget.border': '#D0D7DE',
      'input.background': '#FFFFFF',
      'input.border': '#D0D7DE',
      'input.foreground': '#1C2128',
      'focusBorder': '#388BFD',
      'list.activeSelectionBackground': '#388BFD1A',
      'list.hoverBackground': '#E1E7ED',
    }
  });
}

function createFallback(container, options) {
  container.innerHTML = '';
  container.style.cssText = '';

  const ta = document.createElement('textarea');
  ta.className = 'editor-fallback-textarea';
  ta.value = options.initialCode || '';
  ta.spellcheck = false;
  container.appendChild(ta);

  fallbackTextarea = ta;

  return {
    getValue: () => ta.value,
    setValue: (v) => { ta.value = v; },
    dispose: () => {
      ta.remove();
      fallbackTextarea = null;
    },
  };
}

export async function createEditor(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('[editor] Container #' + containerId + ' not found');
    return null;
  }

  disposeEditor();

  try {
    await ensureMonacoLoaded();

    // Wait for JetBrains Mono to be fully loaded/ready before
    // creating the editor so Monaco can measure glyph widths
    // correctly. Otherwise the cursor appears offset/behind as
    // the user types.
    try {
      await document.fonts.load('13px "JetBrains Mono"');
      await document.fonts.ready;
    } catch (_) {
      // font loading API may not be available in all Electron
      // versions; proceed anyway
    }

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const monacoTheme = currentTheme === 'light' ? 'pypath-light' : 'pypath-dark';
    editorInstance = monaco.editor.create(container, {
      language: 'python',
      theme: monacoTheme,
      fontFamily: 'JetBrains Mono',
      fontSize: 13,
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      value: options.initialCode || '',
      tabSize: 4,
      insertSpaces: true,
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      padding: { top: 8 },
      suggest: { showKeywords: true, showSnippets: false },
    });

    // Force Monaco to recalculate glyph widths now that the font is
    // definitely loaded — fixes cursor offset issue on first paint.
    monaco.editor.remeasureFonts();

    // Safety net: Electron's Chromium may report the font as ready
    // before it is truly usable for layout, so re-measure once more
    // after a tick.
    setTimeout(function () {
      if (editorInstance) {
        monaco.editor.remeasureFonts();
      }
    }, 100);

    return editorInstance;
  } catch (e) {
    console.warn('[editor] Monaco load failed, using textarea fallback:', e.message);
    return createFallback(container, options);
  }
}

export function setEditorTheme(themeName) {
  if (typeof monaco !== 'undefined' && monaco.editor) {
    monaco.editor.setTheme(themeName);
  }
}

export function getEditorValue() {
  if (editorInstance) {
    return editorInstance.getValue();
  }
  if (fallbackTextarea) {
    return fallbackTextarea.value;
  }
  return '';
}

export function setEditorValue(code) {
  if (editorInstance) {
    editorInstance.setValue(code);
  } else if (fallbackTextarea) {
    fallbackTextarea.value = code;
  }
}
