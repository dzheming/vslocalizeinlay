import * as vscode from 'vscode';
import ConfigManager from '../utils/ConfigManager';

class LocalizeCompletionProvider implements vscode.CompletionItemProvider {
  private _configManager: ConfigManager;

  constructor() {
    this._configManager = new ConfigManager();
    vscode.workspace.onDidChangeConfiguration(() => {
      this._configManager.loadConfig();
    });
  }

  private getLocalizeMap(): Map<number, string> {
    return this._configManager.getLocalizeMap();
  }

  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];
    const localizeMap = this.getLocalizeMap();
    if (localizeMap.size === 0) {
      return items;
    }

    const lineText = document.lineAt(position.line).text;
    
    // 获取光标位置之前的文本，直到遇到非数字、字母或中文的字符
    let searchText = '';
    let i = position.character - 1;
    while (i >= 0) {
      const char = lineText[i];
      // 检查字符是否是数字、字母或中文
      if (/[\u4e00-\u9fa5a-zA-Z0-9]/.test(char)) {
        searchText = char + searchText;
        i--;
      } else {
        break;
      }
    }
    
    localizeMap.forEach((str, sn) => {
      if (searchText && str.includes(searchText)) {
        const item = new vscode.CompletionItem(str, vscode.CompletionItemKind.Text);
        item.insertText = sn.toString();
        item.detail = `SN: ${sn}`;
        items.push(item);
      }
    });
    return items;
  }

  resolveCompletionItem(item: vscode.CompletionItem, token: vscode.CancellationToken): Thenable<vscode.CompletionItem> {
    return Promise.resolve(item);
  }
}

export default LocalizeCompletionProvider;