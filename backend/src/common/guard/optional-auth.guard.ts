import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';

@Injectable()
export class OptionalAuthGuard extends AuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // try to authenticate
      await super.canActivate(context);
    } catch {
      // if no token — that's fine, continue as guest
    }
    return true;
  }
}
