import * as vscode from 'vscode';
import ConfigManager from '../utils/ConfigManager';
import Utils from '../utils/Utils';

class LocalizeInlayProvider implements vscode.InlayHintsProvider {
  private _disposables: vscode.Disposable[] = [];
  private _configManager: ConfigManager;

  constructor() {
    this._configManager = new ConfigManager();
    this.setupWatchers();
    this._disposables.push(
      vscode.workspace.onDidChangeConfiguration(() => {
        this._configManager.loadConfig();
        Utils.refreshAllEditors();
      })
    );
  }

  private setupWatchers() {
    this._configManager.setupWatchers(() => {
      Utils.refreshAllEditors();
    });
  }

  private getMethodNames(): string[] {
    return this._configManager.getMethodNames();
  }

  private getLocalizeMap(): Map<number, string> {
    return this._configManager.getLocalizeMap();
  }

  provideInlayHints(document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken): vscode.InlayHint[] {
    const hints: vscode.InlayHint[] = [];
    const methodNames = this.getMethodNames();
    const localizeMap = this.getLocalizeMap();
    if (!methodNames.length || localizeMap.size === 0) {
      return hints;
    }

    // 遍历文档的每一行
    for (let line = range.start.line; line <= range.end.line; line++) {
      const lineContent = document.lineAt(line).text;
      
      const methodPattern = methodNames.map(name => {
        const parts = name.split('.');
        if (parts.length === 2) {
          return parts[0] + '\\s*\\.\\s*' + parts[1];
        }
        return name;
      }).join('|');

      const regex = new RegExp('(' + methodPattern + ')\\s*\\(', 'g');
      
      let match;
      let processedRanges: vscode.Range[] = [];
      
      while ((match = regex.exec(lineContent)) && !token.isCancellationRequested) {
        const methodMatch = match[0];
        const methodStart = new vscode.Position(line, match.index);
        const methodEnd = methodStart.translate(0, methodMatch.length);
        
        // 检查当前匹配是否在已经处理过的范围内（即是否是嵌套调用）
        const isNested = processedRanges.some(range => {
          return range.contains(methodStart);
        });
        
        if (isNested) {
          continue;
        }
        
        // 处理参数并添加提示
        this.findArguments(document, methodEnd, hints, token);
        
        // 计算整个方法调用的范围，包括括号
        let depth = 1;
        let endPos = methodEnd;
        let i = methodEnd.character;
        
        while (depth > 0 && i < lineContent.length) {
          const char = lineContent[i];
          if (char === '(') {
            depth++;
          } else if (char === ')') {
            depth--;
          }
          i++;
        }
        
        if (depth === 0) {
          endPos = new vscode.Position(line, i);
        }
        
        // 添加到已处理范围
        processedRanges.push(new vscode.Range(methodStart, endPos));
      }
    }

    return hints;
  }

  private findArguments(document: vscode.TextDocument, startPos: vscode.Position, hints: vscode.InlayHint[], token: vscode.CancellationToken) {
    let pos = startPos;
    let depth = 1; // 初始 depth 改为 1，因为我们已经在方法调用的括号内
    let argStart = pos;
    let inString = false;
    let stringChar = '';

    while (pos.line < document.lineCount && !token.isCancellationRequested) {
      const line = document.lineAt(pos.line);
      const lineText = line.text;
      
      for (let i = pos.character; i < lineText.length && !token.isCancellationRequested; i++) {
        const char = lineText[i];
        
        if (!inString) {
          if (char === '"' || char === "'") {
            inString = true;
            stringChar = char;
          } else if (char === '(') {
            depth++;
          } else if (char === ')') {
            depth--;
            if (depth === 0) {
              this.processArgument(document, argStart, new vscode.Position(pos.line, i), hints);
              return;
            }
          } else if (char === ',' && depth === 1) {
            this.processArgument(document, argStart, new vscode.Position(pos.line, i), hints);
            argStart = new vscode.Position(pos.line, i + 1);
          }
        } else {
          if (char === stringChar && lineText[i - 1] !== '\\') {
            inString = false;
          }
        }
      }
      
      pos = new vscode.Position(pos.line + 1, 0);
      argStart = pos;
    }
  }

  private processArgument(document: vscode.TextDocument, startPos: vscode.Position, endPos: vscode.Position, hints: vscode.InlayHint[]) {
    const argText = document.getText(new vscode.Range(startPos, endPos)).trim();
    if (!argText) {
      return;
    }

    // 处理嵌套调用
    const methodPattern = this.getMethodNames().map(name => {
      const parts = name.split('.');
      if (parts.length === 2) {
        return parts[0] + '\\s*\\.\\s*' + parts[1];
      }
      return name;
    }).join('|');

    const nestedRegex = new RegExp('^(' + methodPattern + ')\\s*\\(', 'g');
    if (nestedRegex.test(argText)) {
      const nestedStart = startPos.translate(0, argText.indexOf('(') + 1);
      this.findArguments(document, nestedStart, hints, new vscode.CancellationTokenSource().token);
      return;
    }

    // 处理条件表达式
    if (argText.includes('?') && argText.includes(':')) {
      const conditionParts = argText.split('?');
      if (conditionParts.length === 2) {
        const [condition, exprPart] = conditionParts;
        
        // 找到第一个 ':' 的位置
        const colonIndex = exprPart.indexOf(':');
        if (colonIndex !== -1) {
          // 提取 true 表达式和 false 表达式
          const trueExpr = exprPart.substring(0, colonIndex);
          let falseExpr = exprPart.substring(colonIndex + 1);
          
          // 移除 false 表达式末尾的右括号
          falseExpr = falseExpr.replace(/\)$/, '');
          
          const trueExprTrimmed = trueExpr.trim();
          const falseExprTrimmed = falseExpr.trim();
          
          // 计算 true 表达式的位置
          const trueExprPos = startPos.translate(0, condition.length + 1 + (trueExpr.length - trueExprTrimmed.length));
          
          // 计算 false 表达式的位置
          const falseExprPos = startPos.translate(0, condition.length + 1 + trueExpr.length + 1 + (falseExpr.length - falseExprTrimmed.length));
          
          this.checkAndAddHint(document, trueExprPos, trueExprTrimmed, hints);
          this.checkAndAddHint(document, falseExprPos, falseExprTrimmed, hints);
        }
      }
      return;
    }

    // 处理普通整数字面量
    if (argText) {
      // 计算参数的实际开始位置（跳过空格）
      const argRange = new vscode.Range(startPos, endPos);
      const fullArgText = document.getText(argRange);
      const spaceCount = fullArgText.length - argText.length;
      const actualPos = startPos.translate(0, spaceCount);
      this.checkAndAddHint(document, actualPos, argText, hints);
    }
  }

  private checkAndAddHint(document: vscode.TextDocument, pos: vscode.Position, text: string, hints: vscode.InlayHint[]) {
    const numMatch = text.match(/^\d+$/);
    if (numMatch) {
      const sn = parseInt(numMatch[0], 10);
      const str = this.getLocalizeMap().get(sn);
      if (str) {
        const hint = new vscode.InlayHint(
          pos.translate(0, text.length),
          ` ${str}`,
          vscode.InlayHintKind.Parameter
        );
        hints.push(hint);
      }
    }
  }

  dispose() {
    this._disposables.forEach(d => d.dispose());
    this._configManager.dispose();
  }
}

export default LocalizeInlayProvider;