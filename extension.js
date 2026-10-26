const vscode = require('vscode');

const MODES = ['auto', 'rtl', 'ltr'];
const LABELS = { auto: 'خودکار', rtl: 'RTL', ltr: 'LTR' };

// Code blocks never flip: they stay left-to-right (also enforced in CSS).
const SKIP = new Set(['fence', 'code_block']);

function getMode() {
	const mode = vscode.workspace.getConfiguration('rtlMd').get('direction');
	return MODES.includes(mode) ? mode : 'auto';
}

const RTL_LETTER = /[֐-ࣿיִ-﷿ﹰ-﻿]/g;
const LTR_LETTER = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/g;

// Direction of a block from its text: right-to-left when most of its letters are.
function detectDirection(text) {
	const rtl = (text.match(RTL_LETTER) || []).length;
	const ltr = (text.match(LTR_LETTER) || []).length;
	if (rtl + ltr === 0) return 'rtl';
	return rtl >= ltr ? 'rtl' : 'ltr';
}

function extendMarkdownIt(md) {
	// Give every top-level block an explicit `dir`. In "auto" mode it is worked
	// out from the block's own text; "rtl" / "ltr" force it for the whole preview.
	md.core.ruler.push('rtl_md_dir', (state) => {
		const mode = getMode();
		const tokens = state.tokens;
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			if (token.level !== 0 || token.nesting !== 1 || SKIP.has(token.type)) continue;

			let dir = mode;
			if (mode === 'auto') {
				let text = '';
				for (let j = i + 1; j < tokens.length; j++) {
					const t = tokens[j];
					if (t.level === 0 && t.nesting === -1) break;
					if (t.type === 'inline') text += t.content + ' ';
					if (text.length > 600) break;
				}
				dir = detectDirection(text);
			}
			token.attrSet('dir', dir);
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
