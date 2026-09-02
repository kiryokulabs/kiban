import { Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild, afterNextRender, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { IconsComponent } from '../shared/icons.component';
import { TerminalPresenter, type ConnectionState } from './terminal.presenter';
import type { RuntimeContainer } from '../installed-services/installed-services.models';

export interface TerminalOutputChunk { readonly data: string; readonly sequence: number; }

interface Disposable { dispose(): void; }

@Component({
  selector: 'kiban-terminal',
  standalone: true,
  imports: [FormsModule, IconsComponent],
  template: `
    <div class="flex h-full min-w-0 flex-col overflow-hidden">
      <!-- Header: container selector + connection status -->
      <div class="flex flex-wrap items-center gap-2 border-b kb-border px-3 py-2">
        <select
          class="input w-full min-w-0 flex-1 sm:w-auto px-2 py-1 text-xs sm:max-w-[200px]"
          [ngModel]="selectedContainerId()"
          (ngModelChange)="onContainerChange($event)"
          [disabled]="currentState() === 'connecting' || options().length === 0"
        >
          @for (option of options(); track option.id) {
            <option [value]="option.id">{{ option.label }}</option>
          }
        </select>

        <div class="ml-auto flex shrink-0 items-center gap-1.5">
          <span
            class="h-2 w-2 rounded-full"
            [class.bg-green-400]="currentState() === 'connected'"
            [class.bg-yellow-400]="currentState() === 'connecting'"
            [class.bg-red-400]="currentState() === 'error' || currentState() === 'timeout'"
            [class.bg-gray-400]="currentState() === 'disconnected'"
          ></span>
          <span class="text-[10px] c-muted">{{ stateLabel() }}</span>
        </div>

        @if (selectedContainerId(); as id) {
          <button class="btn-secondary btn px-2 py-1 text-[11px]" type="button" (click)="reconnect(id)" title="Reconnect">
            <span class="hidden sm:inline">Reconnect</span>
            <kiban-icon class="sm:hidden" name="restart" [size]="12" />
          </button>
        }

        @if (currentState() === 'connected') {
          <button class="btn-icon" type="button" (click)="disconnect.emit()" title="Disconnect">
            <kiban-icon name="x" [size]="12" />
          </button>
        }
      </div>

      <!-- Terminal area -->
      <div class="relative min-h-[300px] min-w-0 flex-1 overflow-hidden bg-[#1a1a2e]" tabindex="0" (click)="focusTerminal()" (mousedown)="focusTerminal()">
        @if (currentState() === 'disconnected') {
          <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p class="text-sm c-muted">Select a container to open a terminal session.</p>
          </div>
        }
        @if (currentState() === 'connecting') {
          <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p class="text-sm c-muted">Connecting to container…</p>
          </div>
        }
        @if (currentState() === 'error') {
          <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p class="max-w-md px-4 text-center text-sm text-red-400">{{ errorMessage || 'Could not connect to container. Is it running?' }}</p>
          </div>
        }
        @if (currentState() === 'timeout') {
          <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p class="max-w-md px-4 text-center text-sm text-yellow-400">{{ errorMessage || 'Session expired. Select the container to reconnect.' }}</p>
          </div>
        }
        <div #terminalContainer class="absolute inset-0 min-w-0 overflow-hidden p-2"></div>
      </div>
    </div>
  `
})
export class TerminalComponent implements OnDestroy {
  @Input() set containers(value: readonly RuntimeContainer[]) {
    this._containers = value;
    this.options.set(this.presenter.containerOptions(value));
    const newId = this.presenter.selectContainer(value, this.selectedContainerId());
    if (newId !== this.selectedContainerId()) {
      this.selectedContainerId.set(newId);
      if (newId) this.resetTerminal();
    }
  }
  @Input() set state(value: ConnectionState) {
    this.currentState.set(value);
    this.stateLabel.set(this.presenter.connectionStateLabel(value));
    if (value === 'connected') setTimeout(() => this.focusTerminal(), 0);
  }
  @Input() set output(value: TerminalOutputChunk | null) {
    if (value) {
      this.writeToTerminal(value.data);
    }
  }
  @Input() errorMessage: string | null = null;

  @Output() containerChange = new EventEmitter<string>();
  @Output() input = new EventEmitter<string>();
  @Output() resize = new EventEmitter<{ cols: number; rows: number }>();
  @Output() disconnect = new EventEmitter<void>();

  @ViewChild('terminalContainer') terminalContainer!: ElementRef<HTMLDivElement>;

  protected readonly presenter = new TerminalPresenter();
  protected readonly selectedContainerId = signal<string | null>(null);
  protected readonly options = signal<readonly { readonly id: string; readonly label: string }[]>([]);
  protected readonly currentState = signal<ConnectionState>('disconnected');
  protected readonly stateLabel = signal('Disconnected');

  private _containers: readonly RuntimeContainer[] = [];
  private terminalElement: HTMLDivElement | null = null;
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private dataDisposable: Disposable | null = null;
  private pendingOutput = '';

  public constructor() {
    afterNextRender(() => {
      this.terminalElement = this.terminalContainer?.nativeElement ?? null;
      this.initTerminal();
    });
  }

  public ngOnDestroy(): void {
    this.destroyTerminal();
  }

  protected onContainerChange(containerId: string): void {
    this.selectedContainerId.set(containerId);
    this.resetTerminal();
    this.containerChange.emit(containerId);
  }

  protected reconnect(containerId: string): void {
    this.resetTerminal();
    this.containerChange.emit(containerId);
  }

  private initTerminal(): void {
    if (!this.terminalElement || this.terminal) return;
    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      fontSize: 12,
      theme: { background: '#1a1a2e', foreground: '#e5e7eb', cursor: '#e5e7eb' }
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(this.terminalElement);
    fitAddon.fit();
    this.dataDisposable = terminal.onData((data) => this.input.emit(data));
    this.terminal = terminal;
    this.fitAddon = fitAddon;
    if (this.pendingOutput) {
      terminal.write(this.pendingOutput);
      this.pendingOutput = '';
    }
    this.emitResize();
    terminal.focus();
  }

  private writeToTerminal(data: string): void {
    if (!this.terminal) {
      this.pendingOutput += data;
      return;
    }
    this.terminal.write(data);
  }

  private resetTerminal(): void {
    this.pendingOutput = '';
    this.terminal?.clear();
    this.terminal?.reset();
    this.emitResize();
  }

  private emitResize(): void {
    this.fitAddon?.fit();
    if (!this.terminal) return;
    this.resize.emit({ cols: this.terminal.cols, rows: this.terminal.rows });
  }

  protected focusTerminal(): void { this.terminal?.focus(); }

  private destroyTerminal(): void {
    this.dataDisposable?.dispose();
    this.dataDisposable = null;
    this.fitAddon?.dispose();
    this.fitAddon = null;
    this.terminal?.dispose();
    this.terminal = null;
    this.pendingOutput = '';
  }
}
