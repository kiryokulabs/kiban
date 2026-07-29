import { Controller, Get } from '@nestjs/common';
import { StackService } from '../services/stack.service';

@Controller('stacks')
export class StackController {
  public constructor(private readonly service: StackService) {}

  /** Returns a placeholder response until the stack API surface is implemented. */
  @Get()
  public list(): { readonly message: string } {
    return this.service.placeholder();
  }
}
