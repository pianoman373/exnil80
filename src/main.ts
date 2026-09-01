import { Application } from './ui/Application.ts';

Application.loadUI().then(() => {
	let previous = performance.now();

	const animate = () => {
		const now = performance.now();
		const delta = now - previous;
		if (delta / 1000 > 1.0 / 60 - 0.001) {
			previous = now;

			Application.update(1 / 60);
		}

		window.requestAnimationFrame(animate);
	};
	animate();
});
