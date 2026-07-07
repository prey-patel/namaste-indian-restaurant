'use client';

import { useEffect } from 'react';

/**
 * DOM Compatibility Patch
 * 
 * Prevents React crashes caused by third-party browser extensions (Google Translate,
 * Grammarly, password managers, ad blockers, etc.) that modify DOM text nodes.
 * 
 * When these extensions alter the DOM, React's reconciliation algorithm can fail with:
 *   "NotFoundError: Failed to execute 'removeChild' on 'Node'"
 *   "NotFoundError: Failed to execute 'insertBefore' on 'Node'"
 * 
 * This is a widely-adopted production fix used by major React applications.
 * See: https://github.com/facebook/react/issues/11538
 */
export default function DomSafetyPatch() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function <T extends Node>(child: T): T {
      if (child.parentNode !== this) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[DomSafetyPatch] Suppressed removeChild error — child is not a direct descendant.',
            'This is typically caused by a browser extension modifying the DOM.'
          );
        }
        return child;
      }
      return originalRemoveChild.call(this, child) as T;
    };

    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
      if (referenceNode && referenceNode.parentNode !== this) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[DomSafetyPatch] Suppressed insertBefore error — reference node is not a direct descendant.',
            'This is typically caused by a browser extension modifying the DOM.'
          );
        }
        return newNode;
      }
      return originalInsertBefore.call(this, newNode, referenceNode) as T;
    };

    // Cleanup: restore originals on unmount (won't happen for root layout, but good practice)
    return () => {
      Node.prototype.removeChild = originalRemoveChild;
      Node.prototype.insertBefore = originalInsertBefore;
    };
  }, []);

  return null;
}
