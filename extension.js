const vscode = require('vscode');

const MODES = ['auto', 'rtl', 'ltr'];
const LABELS = { auto: 'خودکار', rtl: 'RTL', ltr: 'LTR' };

// Code blocks never flip: they stay left-to-right (also enforced in CSS).
const SKIP = new Set(['fence', 'code_block']);

function getMode() {
	const mode = vscode.workspace.getConfiguration('rtlMd').get('direction');
	return MODES.includes(mode) ? mode : 'auto';
}

function extendMarkdownIt(md) {
	// Give every top-level block a `dir` attribute; "auto" lets the browser
	// pick the direction of each block from its first strong character.
	md.core.ruler.push('rtl_md_dir', (state) => {
		const mode = getMode();
		for (const token of state.tokens) {
			if (token.level !== 0 || token.nesting !== 1 || SKIP.has(token.type)) continue;
			token.attrSet('dir', mode);
		}
	});

	// Wrap tables so they scroll sideways instead of overflowing the preview.
	const fallback = (tokens, idx, options, env, self) => self.renderToken(tokens, idx, options);
	const open = md.renderer.rules.table_open || fallback;
	const close = md.renderer.rules.table_close || fallback;
	md.renderer.rules.table_open = (...args) => '<div class="rtl-md-table">' + open(...args);
	md.renderer.rules.table_close = (...args) => close(...args) + '</div>';

	return md;
}

function activate(context) {
	const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
	status.command = 'rtlMd.toggleDirection';
	status.tooltip = 'جهت پیش‌نمایش مارک‌داون';

	const refreshStatus = () => {
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.document.languageId === 'markdown') {
			status.text = '$(arrow-both) ' + LABELS[getMode()];
			status.show();
		} else {
			status.hide();
		}
	};

	context.subscriptions.push(
		status,
		vscode.commands.registerCommand('rtlMd.toggleDirection', async () => {
			const next = MODES[(MODES.indexOf(getMode()) + 1) % MODES.length];
			await vscode.workspace
				.getConfiguration('rtlMd')
				.update('direction', next, vscode.ConfigurationTarget.Global);
		}),
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('rtlMd.direction')) {
				vscode.commands.executeCommand('markdown.preview.refresh');
				refreshStatus();
			}
		}),
		vscode.window.onDidChangeActiveTextEditor(refreshStatus)
	);

	refreshStatus();
	return { extendMarkdownIt };
}

function deactivate() {}

module.exports = { activate, deactivate };
