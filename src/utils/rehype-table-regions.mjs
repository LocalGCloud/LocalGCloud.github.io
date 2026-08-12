const headingPattern = /^h[1-6]$/;

const isElement = (node) => node?.type === 'element';

export default function rehypeTableRegions() {
  return (tree) => {
    const state = {
      headingId: undefined,
      tableIndex: 0,
    };

    const transform = (node) => {
      if (!Array.isArray(node?.children)) return;

      for (let index = 0; index < node.children.length; index += 1) {
        const child = node.children[index];

        if (isElement(child) && headingPattern.test(child.tagName)) {
          const id = child.properties?.id;
          if (typeof id === 'string' && id.length > 0) state.headingId = id;
        }

        if (isElement(child) && child.tagName === 'table') {
          state.tableIndex += 1;
          const accessibleName = state.headingId
            ? { ariaLabelledBy: state.headingId }
            : { ariaLabel: `Scrollable data table ${state.tableIndex}` };

          node.children[index] = {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['docs-table-scroll'],
              role: 'region',
              tabIndex: 0,
              ...accessibleName,
            },
            children: [child],
          };
          continue;
        }

        transform(child);
      }
    };

    transform(tree);
  };
}
