const fs = require('fs');
const path = require('path');

class SimpleJsonDriver {
  constructor(filePath = './database/tickets.json') {
    this.filePath = path.resolve(filePath);
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, '{}', 'utf-8');
    }
  }

  prepare(table) {
    return;
  }

  async init() {
    return;
  }

  _read() {
    try {
      if (!fs.existsSync(this.filePath)) return {};
      const data = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(data || '{}');
    } catch {
      return {};
    }
  }

  _write(data) {
    const tempPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, this.filePath);
  }

  async get(key) {
    const data = this._read();
    return data[key] ?? null;
  }

  async set(key, value) {
    const data = this._read();
    data[key] = value;
    this._write(data);
    return value;
  }

  async delete(key) {
    const data = this._read();
    const exists = Object.prototype.hasOwnProperty.call(data, key);
    delete data[key];
    this._write(data);
    return exists;
  }

  async clear() {
    this._write({});
  }

  async all() {
    const data = this._read();
    return Object.entries(data).map(([id, value]) => ({ id, value }));
  }
}

module.exports = { SimpleJsonDriver };
