export type ElementProps<K extends keyof HTMLElementTagNameMap> = Partial<
	Omit<HTMLElementTagNameMap[K], 'children' | 'style'>
> & {
	style?: Partial<CSSStyleDeclaration>;
	children?: (HTMLElement | Text)[];
};

export function element<K extends keyof HTMLElementTagNameMap>(
	tagName: K,
	props?: ElementProps<K>
): HTMLElementTagNameMap[K] {
	const element = document.createElement(tagName);

	if (props) {
		let propsClone = { ...props };
		delete propsClone['children'];
		delete propsClone['style'];
		Object.assign(element, propsClone);
		if (props.style) {
			Object.assign(element.style, props.style);
		}
		if (props.children) {
			(props.children as (HTMLElement | Text)[]).forEach((child) =>
				element.appendChild(child)
			);
		}
	}

	return element;
}
