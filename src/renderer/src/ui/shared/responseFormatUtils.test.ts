import { describe, expect, it } from 'vitest';
import {
  formatHeadersText,
  formatTestsText,
  responseBodyExportPath,
  responseTabExportPath,
  responseTabText
} from '#/renderer/src/ui/shared/responseFormatUtils';

describe('responseFormatUtils copy/export helpers', () => {
  it('formatHeadersText serializes headers as Key: Value lines', () => {
    expect(formatHeadersText({ 'Content-Type': 'application/json', 'X-Test': '1' })).toBe(
      'Content-Type: application/json\nX-Test: 1'
    );
    expect(formatHeadersText({})).toBe('');
  });

  it('formatTestsText serializes pass and fail results', () => {
    expect(
      formatTestsText([
        { name: 'status is 200', passed: true },
        { name: 'has token', passed: false, error: 'missing field' }
      ])
    ).toBe('PASS status is 200\nFAIL has token — missing field');
  });

  it('responseBodyExportPath chooses json or txt extension', () => {
    expect(responseBodyExportPath('{"a":1}', { 'content-type': 'application/json' })).toBe(
      'response.json'
    );
    expect(responseBodyExportPath('plain text')).toBe('response.txt');
  });

  it('responseTabExportPath returns tab-specific default filenames', () => {
    expect(responseTabExportPath('body', '{"a":1}', {})).toBe('response.json');
    expect(responseTabExportPath('headers', '', {})).toBe('response-headers.txt');
    expect(responseTabExportPath('tests', '', {})).toBe('response-tests.txt');
  });

  it('responseTabText returns serialized content for each tab', () => {
    const headers = { 'Content-Type': 'text/plain' };
    const tests = [{ name: 'ok', passed: true }];

    expect(responseTabText('body', '{"a":1}', headers, tests)).toBe('{\n  "a": 1\n}');
    expect(responseTabText('headers', '', headers, tests)).toBe('Content-Type: text/plain');
    expect(responseTabText('tests', '', headers, tests)).toBe('PASS ok');
  });
});
