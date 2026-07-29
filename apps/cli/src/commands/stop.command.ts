import type { Command, CommandContext } from './command.js';

export class StopCommand implements Command {
  public readonly name = 'stop';
  public readonly description = 'Stops Kiban through the API.';
  public async execute(_context: CommandContext): Promise<string> { return 'Not implemented'; }
}
