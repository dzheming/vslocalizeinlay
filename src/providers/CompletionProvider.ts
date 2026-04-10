import * as vscode from 'vscode';
import ConfigManager from '../utils/ConfigManager';

class LocalizeCompletionProvider implements vscode.CompletionItemProvider {
  private _configManager: ConfigManager;

  constructor() {
    this._configManager = new ConfigManager();
    console.log('LocalizeCompletionProvider initialized');
    vscode.workspace.onDidChangeConfiguration(() => {
      console.log('Configuration changed, reloading config');
      this._configManager.loadConfig();
    });
  }

  private getLocalizeMap(): Map<number, string> {
    return this._configManager.getLocalizeMap();
  }

  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.CompletionItem[] {
    console.log('=== provideCompletionItems called ===');
    console.log('Position:', position);
    const items: vscode.CompletionItem[] = [];
    const localizeMap = this.getLocalizeMap();
    console.log('Localize map size:', localizeMap.size);
    if (localizeMap.size === 0) {
      console.log('Localize map is empty, returning empty items');
      return items;
    }

    const lineText = document.lineAt(position.line).text;
    console.log('Line text:', lineText);
    
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
    
    console.log('Search text:', searchText);
    localizeMap.forEach((str, sn) => {
      if (searchText && str.includes(searchText)) {
        console.log('Match found:', str, sn);
        const item = new vscode.CompletionItem(str, vscode.CompletionItemKind.Text);
        item.insertText = sn.toString();
        item.detail = `SN: ${sn}`;
        items.push(item);
      }
    });
    console.log('Returning items:', items.length);
    console.log('=== provideCompletionItems end ===');
    return items;
  }

  resolveCompletionItem(item: vscode.CompletionItem, token: vscode.CancellationToken): Thenable<vscode.CompletionItem> {
    console.log('=== resolveCompletionItem called ===');
    console.log('Item:', item);
    return Promise.resolve(item);
  }
}

export default LocalizeCompletionProvider;