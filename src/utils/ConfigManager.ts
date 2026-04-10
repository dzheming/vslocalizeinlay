import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

class ConfigManager {
  private _jsonConfigPath: string = '';
  private _methodNames: string[] = [];
  private _localizeMap: Map<number, string> = new Map();
  private _watcher: fs.FSWatcher | undefined;

  constructor() {
    this.loadConfig();
  }

  public loadConfig() {
    const config = vscode.workspace.getConfiguration('localizeInlay');
    this._jsonConfigPath = config.get('jsonConfigPath', 'ConfLocalize.json');
    this._methodNames = config.get('methodNames', 'LocalUtils.GetString,GetString')
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
    this.loadLocalizeMap();
  }

  public loadLocalizeMap() {
    this._localizeMap.clear();
    try {
      const configPath = this.getConfigPath();
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(content);
        
        // 处理不同格式的配置文件
        let entries: any[] = [];
        if (Array.isArray(config)) {
          // 直接是数组格式
          entries = config;
        } else if (typeof config === 'object' && config !== null) {
          // 是对象格式，尝试查找数组字段
          if (Array.isArray(config.body)) {
            entries = config.body;
          } else if (Array.isArray(config.data)) {
            entries = config.data;
          } else if (Array.isArray(config.items)) {
            entries = config.items;
          } else if (Array.isArray(config.localize)) {
            entries = config.localize;
          }
        }
        
        entries.forEach(entry => {
          if (entry && typeof entry === 'object' && 'sn' in entry && 'str' in entry) {
            this._localizeMap.set(entry.sn, entry.str);
          }
        });
      }
    } catch (error) {
    }
  }

  public getConfigPath(): string {
    if (path.isAbsolute(this._jsonConfigPath)) {
      return this._jsonConfigPath;
    }
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      return path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, this._jsonConfigPath);
    }
    return this._jsonConfigPath;
  }

  public setupWatchers(callback: () => void) {
    if (this._watcher) {
      this._watcher.close();
    }
    const configPath = this.getConfigPath();
    if (configPath) {
      const configDir = path.dirname(configPath);
      if (fs.existsSync(configDir)) {
        this._watcher = fs.watch(configPath, () => {
          this.loadLocalizeMap();
          callback();
        });
      }
    }
  }

  public getMethodNames(): string[] {
    return this._methodNames;
  }

  public getLocalizeMap(): Map<number, string> {
    return this._localizeMap;
  }

  public dispose() {
    if (this._watcher) {
      this._watcher.close();
    }
  }
}

export default ConfigManager;