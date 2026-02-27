import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { JwtPayload } from '@/common/types/jwt-payload.type';
import { Socket } from 'socket.io';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();

    // read token from handshake
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Missing token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      // attach user to socket.data — accessible in gateway handlers
      (client.data as Record<string, unknown>).user = payload;
      return true;
    } catch {
      throw new WsException('Invalid or expired token');
    }
  }

  private extractToken(client: Socket): string | undefined {
    // client sends token in handshake auth object
    // const socket = io('http://localhost:3000/game', {
    //   auth: { token: 'Bearer eyJ...' }
    // })
    const token = client.handshake.auth?.token as string;

    if (!token) return undefined;

    const [type, value] = token.split(' ');
    return type === 'Bearer' ? value : undefined;
  }
}
