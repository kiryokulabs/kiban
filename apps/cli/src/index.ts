#!/usr/bin/env node
import { DoctorCommand } from './commands/doctor.command.js';
import { StartCommand } from './commands/start.command.js';
import { StopCommand } from './commands/stop.command.js';
import { VersionCommand } from './commands/version.command.js';
import type { Command } from './commands/command.js';

const commands: readonly Command[] = [new VersionCommand(), new DoctorCommand(), new StartCommand(), new StopCommand()];
const [, , requestedCommand = 'help', ...rest] = process.argv;
const command = commands.find((candidate) => candidate.name === requestedCommand);

const renderHelp = (): string => ['Kiban CLI', '', 'Commands:', ...commands.map((item) => `  kiban ${item.name} - ${item.description}`)].join('\n');

if (!command) {
  console.log(renderHelp());
} else {
  const output = await command.execute({ argv: rest });
  console.log(output);
}
