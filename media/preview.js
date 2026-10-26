// Runs inside the Markdown preview. Safety net next to the markdown-it plugin:
// any top-level block that has no explicit `dir` gets dir="auto", so the browser
// picks the direction (and alignment) from the block's first strong character.
(function () {
	let queued = false;

	function apply() {
		queued = false;
		document
			.querySelectorAll('[data-line]:not([dir]):not(pre)')
			.forEach((el) => el.setAttribute('dir', 'auto'));
	}

	function schedule() {
		if (!queued) {
			queued = true;
			requestAnimationFrame(apply);
		}
	}

	new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
	window.addEventListener('load', schedule);
	schedule();
})();
