import type { Command, CommandContext } from './command.js';

export class VersionCommand implements Command {
  public readonly name = 'version';
  public readonly description = 'Prints the Kiban CLI version.';
  public async execute(_context: CommandContext): Promise<string> { return 'Kiban CLI'; }
}
