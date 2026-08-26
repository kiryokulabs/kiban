export class UpdateNoticePresenter {
  public noticeLabel(latestVersion: string): string {
    return `Kiban ${latestVersion} available`;
  }

  public noticeTitle(currentVersion: string, latestVersion: string): string {
    return `Kiban ${latestVersion} is available. You are running ${currentVersion}. Run kiban update on this machine to upgrade.`;
  }
}
