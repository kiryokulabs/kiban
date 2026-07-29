import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AUTH_SESSION_COOKIE_NAME } from '../../auth/interfaces/auth.constants';
import type { CreateOperatorDto, UserDto } from '../dto/users.dto';
import { UsersService } from '../services/users.service';

@Controller('users')
export class UsersController {
  public constructor(private readonly users: UsersService) {}

  /** Lists users for the administrator. */
  @Get()
  public list(@Req() request: FastifyRequest): Promise<readonly UserDto[]> {
    return this.users.listUsers(this.readSessionCookie(request));
  }

  /** Creates an operator account. */
  @Post('operators')
  public createOperator(@Body() dto: CreateOperatorDto, @Req() request: FastifyRequest): Promise<UserDto> {
    return this.users.createOperator(this.readSessionCookie(request), dto);
  }

  /** Deletes an operator account. */
  @Delete(':id')
  @HttpCode(204)
  public delete(@Param('id') id: string, @Req() request: FastifyRequest): Promise<void> {
    return this.users.deleteUser(this.readSessionCookie(request), id);
  }

  private readSessionCookie(request: FastifyRequest): string | undefined {
    const cookies = request.cookies as Readonly<Record<string, string | undefined>> | undefined;
    return cookies?.[AUTH_SESSION_COOKIE_NAME];
  }
}
