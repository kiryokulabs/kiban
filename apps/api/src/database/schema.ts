export interface ProjectTable {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SettingTable {
  readonly key: string;
  readonly value: string;
  readonly updatedAt: Date;
}

export interface InstalledPluginTable {
  readonly id: string;
  readonly manifestJson: string;
  readonly installedAt: Date;
  readonly enabled: boolean;
}

export interface UserTable {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: 'admin';
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AuthSessionTable {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly revokedAt: Date | null;
}
