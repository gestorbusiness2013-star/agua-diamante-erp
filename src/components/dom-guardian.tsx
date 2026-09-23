'use client';

import { useEffect } from 'react';

/**
 * DOMGuardian protects the React tree from crashes caused by Google Translate
 * and other browser extensions that mutate raw DOM text nodes into <font> tags.
 * When React attempts to removeChild() or insertBefore() on a node that was moved
 * or wrapped by an external DOM mutator, standard React throws a fatal DOMException.
 * This patch intercepts those calls and prevents the fatal crash.
 */
export function DOMGuardian() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function <T extends Node>(child: T): T {
      if (child.parentNode !== this) {
        if (console && console.warn) {
          console.warn('[DOMGuardian] Prevented removeChild error: node is not a child of this parent.', child);
        }
        return child;
      }
      return originalRemoveChild.apply(this, arguments as any) as T;
    };

    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
      if (referenceNode && referenceNode.parentNode !== this) {
        if (console && console.warn) {
          console.warn('[DOMGuardian] Prevented insertBefore error: reference node is not a child of this parent.', referenceNode);
        }
        return newNode;
      }
      return originalInsertBefore.apply(this, arguments as any) as T;
    };
  }, []);

  return null;
}
