import { describe, expect, it } from 'vitest';
import { UpdateNoticePresenter } from './update-notice.presenter';

describe('UpdateNoticePresenter', () => {
  const presenter = new UpdateNoticePresenter();

  it('builds a concise update notice for the header', () => {
    expect(presenter.noticeLabel('0.2.1')).toBe('Kiban 0.2.1 available');
  });

  it('explains that updates must run from the host CLI', () => {
    expect(presenter.noticeTitle('0.2.0', '0.2.1')).toBe('Kiban 0.2.1 is available. You are running 0.2.0. Run kiban update on this machine to upgrade.');
  });
});
