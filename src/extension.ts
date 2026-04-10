import * as vscode from 'vscode';
import LocalizeInlayProvider from './providers/InlayProvider';
import LocalizeCompletionProvider from './providers/CompletionProvider';

export function activate(context: vscode.ExtensionContext) {
  const inlayProvider = new LocalizeInlayProvider();
  const completionProvider = new LocalizeCompletionProvider();

  context.subscriptions.push(
    vscode.languages.registerInlayHintsProvider(['*'], inlayProvider),
    vscode.languages.registerCompletionItemProvider(['*'], completionProvider),
    inlayProvider
  );
}

export function deactivate() {}