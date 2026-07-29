import type { Command, CommandContext } from './command.js';

export class DoctorCommand implements Command {
  public readonly name = 'doctor';
  public readonly description = 'Checks local Kiban connectivity.';
  public async execute(_context: CommandContext): Promise<string> { return 'Not implemented'; }
}
