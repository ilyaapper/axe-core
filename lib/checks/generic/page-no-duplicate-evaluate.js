import cache from '../../core/base/cache';
import { querySelectorAllFilter } from '../../core/utils';
import { isVisibleToScreenReaders, findUpVirtual } from '../../commons/dom';
import { getRole } from '../../commons/aria';

export default function pageNoDuplicateEvaluate(node, options, virtualNode) {
  if (!options || !options.selector || typeof options.selector !== 'string') {
    throw new TypeError(
      'page-no-duplicate requires options.selector to be a string'
    );
  }

  // Only evaluate the first matching node in each document or application.
  const scope = getDocumentScope(virtualNode);
  const key = 'page-no-duplicate;' + options.selector;
  const { evaluatedScopes, nodesByScope } = cache.get(key, () => {
    const groupedNodes = new Map();
    querySelectorAllFilter(
      axe._tree[0],
      options.selector,
      isVisibleToScreenReaders
    ).forEach(elm => {
      const documentScope = getDocumentScope(elm);
      if (!groupedNodes.has(documentScope)) {
        groupedNodes.set(documentScope, []);
      }
      groupedNodes.get(documentScope).push(elm);
    });
    return { evaluatedScopes: new Set(), nodesByScope: groupedNodes };
  });
  if (evaluatedScopes.has(scope)) {
    this.data('ignored');
    return;
  }
  evaluatedScopes.add(scope);

  let elms = nodesByScope.get(scope) || [];

  // @deprecated options.nativeScopeFilter
  // Filter elements that, within certain contexts, don't map their role.
  // e.g. a <footer> inside a <main> is not a banner, but in the <body> context it is
  if (typeof options.nativeScopeFilter === 'string') {
    elms = elms.filter(elm => {
      return (
        elm.hasAttr('role') || !findUpVirtual(elm, options.nativeScopeFilter)
      );
    });
  }

  if (typeof options.role === 'string') {
    elms = elms.filter(elm => getRole(elm) === options.role);
  }

  this.relatedNodes(
    elms.filter(elm => elm !== virtualNode).map(elm => elm.actualNode)
  );

  return elms.length <= 1;
}

/**
 * Find the nearest document or application in the flattened tree.
 * @param {VirtualNode} virtualNode
 * @returns {VirtualNode|null}
 */
function getDocumentScope(virtualNode) {
  let parent = virtualNode.parent;
  while (parent) {
    const role = getRole(parent);
    if (role === 'document' || role === 'application') {
      return parent;
    }
    parent = parent.parent;
  }
  return null;
}
