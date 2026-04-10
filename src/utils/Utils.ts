import * as vscode from 'vscode';

class Utils {
  /**
   * 刷新所有编辑器的内联提示
   */
  public static refreshAllEditors() {
    vscode.window.visibleTextEditors.forEach(editor => {
      if (editor.document.languageId === 'java' || editor.document.languageId === 'csharp') {
        // 检查命令是否存在
        vscode.commands.getCommands().then(commands => {
          if (commands.includes('editor.inlayHints.refresh')) {
            // 命令存在，执行它
            vscode.commands.executeCommand('editor.inlayHints.refresh', editor.document.uri)
              .then(
                () => {},
                (error: any) => {}
              );
          } else {
            // 命令不存在，使用备选方案
            // 强制重新计算内联提示
            const document = editor.document;
            // 直接触发编辑操作，不需要特定范围
            editor.edit(editBuilder => {
              // 不做实际修改，只是触发事件
            });
          }
        });
      }
    });
  }

  /**
   * 检查命令是否存在
   * @param command 命令名称
   * @returns Promise<boolean> 命令是否存在
   */
  public static async isCommandAvailable(command: string): Promise<boolean> {
    const commands = await vscode.commands.getCommands();
    return commands.includes(command);
  }

  /**
   * 执行命令
   * @param command 命令名称
   * @param args 命令参数
   * @returns Promise<any> 命令执行结果
   */
  public static async executeCommand(command: string, ...args: any[]): Promise<any> {
    try {
      return await vscode.commands.executeCommand(command, ...args);
    } catch (error) {
      return null;
    }
  }
}

export default Utils;