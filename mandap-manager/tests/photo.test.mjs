import assert from 'node:assert/strict';
import test from 'node:test';
import {
  firstImageFile,
  listenForPastedImage,
  MAX_SOURCE_PHOTO_BYTES,
  validatePhotoFile,
} from '../src/utils/photo.ts';

function fakeFile(type, size = 100) {
  return { type, size, name: 'clipboard-image.png' };
}

function pasteEvent(items) {
  const event = new Event('paste', { cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: { items } });
  return event;
}

test('accepts a pasted image and prevents its default paste action', () => {
  const target = new EventTarget();
  const image = fakeFile('image/png');
  let received;
  const remove = listenForPastedImage(target, (file) => { received = file; });
  const event = pasteEvent([{ type: 'image/png', getAsFile: () => image }]);
  target.dispatchEvent(event);
  assert.equal(received, image);
  assert.equal(event.defaultPrevented, true);
  remove();
});

test('ignores pasted text without preventing the default paste action', () => {
  const target = new EventTarget();
  let received = false;
  const remove = listenForPastedImage(target, () => { received = true; });
  const event = pasteEvent([{ type: 'text/plain', getAsFile: () => null }]);
  target.dispatchEvent(event);
  assert.equal(received, false);
  assert.equal(event.defaultPrevented, false);
  remove();
});

test('rejects a non-image drop', () => {
  const textFile = fakeFile('text/plain');
  assert.equal(firstImageFile([textFile]), null);
});

test('rejects an oversized image file', () => {
  assert.throws(
    () => validatePhotoFile(fakeFile('image/jpeg', MAX_SOURCE_PHOTO_BYTES + 1)),
    /photoTooLarge/
  );
});

test('removes the paste listener when cleanup runs', () => {
  const target = new EventTarget();
  let received = 0;
  const remove = listenForPastedImage(target, () => { received += 1; });
  remove();
  target.dispatchEvent(pasteEvent([{ type: 'image/png', getAsFile: () => fakeFile('image/png') }]));
  assert.equal(received, 0);
});
