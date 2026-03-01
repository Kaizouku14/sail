import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplication } from '@nestjs/common';
import type { Server, ServerOptions } from 'socket.io';

export class SocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplication,
    private readonly corsOrigin: string | string[],
  ) {
    super(app);
  }

  override createIOServer(
    port: number,
    options?: Partial<ServerOptions>,
  ): Server {
    const serverOptions: Partial<ServerOptions> = {
      ...options,
      cors: {
        origin: this.corsOrigin,
        credentials: true,
      },
    };

    return super.createIOServer(port, serverOptions) as Server;
  }
}
