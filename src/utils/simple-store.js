/**
 * Simple file-based store to replace electron-store
 * No CommonJS/ESM issues!
 */
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORE_PATH = path.join(app.getPath('userData'), 'config.json');

const DEFAULT_SETTINGS = {
  ai: {
    backend: 'openrouter',
    ollamaModel: 'llama3.1',
    geminiModel: 'gemini-1.5-flash',
    openRouterModel: 'openai/gpt-oss-20b:free',
    openRouterKey: ''
  },
  hotkeys: {
    toggleOverlay: 'CommandOrControl+Shift+Space',
    submit: 'CommandOrControl+Enter',
    screenshot: 'CommandOrControl+H'
  },
  invisibilityMode: true
};

class SimpleStore {
  constructor() {
    this.data = this.load();
  }

  deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  load() {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const data = fs.readFileSync(STORE_PATH, 'utf8');
        const parsed = JSON.parse(data);
        const merged = this.deepMerge(DEFAULT_SETTINGS, parsed);
        return merged;
      }
    } catch (e) {
      console.error('Error loading store:', e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  save() {
    try {
      const dir = path.dirname(STORE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(STORE_PATH, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving store:', e);
    }
  }

  get(key, defaultValue) {
    const keys = key.split('.');
    let value = this.data;
    for (const k of keys) {
      value = value?.[k];
    }
    return value !== undefined ? value : defaultValue;
  }

  set(key, value) {
    if (typeof key === 'object') {
      // Deep merge object
      this.data = this.deepMerge(this.data, key);
    } else {
      const keys = key.split('.');
      let obj = this.data;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
    }
    this.save();
  }

  get store() {
    return this.data;
  }
}

export { SimpleStore };

