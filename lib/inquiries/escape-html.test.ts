function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function runEscapeHtmlTests() {
  // Test 1: XSS script tag escaping
  if (escapeHtml('<script>alert("xss")</script>') !== '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;') {
    throw new Error('Test failed: script tag not properly escaped');
  }

  // Test 2: Single & double quote escaping
  if (escapeHtml(`john's "order"`) !== 'john&#039;s &quot;order&quot;') {
    throw new Error('Test failed: quotes not properly escaped');
  }

  // Test 3: Ampersand escaping
  if (escapeHtml('Fish & Chips') !== 'Fish &amp; Chips') {
    throw new Error('Test failed: ampersand not properly escaped');
  }

  return { passed: true, testsRun: 3 };
}
