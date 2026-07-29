export interface CommandContext { readonly argv: readonly string[]; }
export interface Command { readonly name: string; readonly description: string; execute(context: CommandContext): Promise<string>; }
