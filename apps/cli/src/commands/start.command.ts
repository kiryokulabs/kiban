import type { Command, CommandContext } from './command.js';

export class StartCommand implements Command {
  public readonly name = 'start';
  public readonly description = 'Starts Kiban through the API.';
  public async execute(_context: CommandContext): Promise<string> { return 'Not implemented'; }
}
