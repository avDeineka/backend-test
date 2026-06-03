import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

export const TenantId = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  const brandId = request.headers['x-brand-id'];

  if (!brandId) {
    throw new BadRequestException('Missing X-Brand-Id header');
  }

  return brandId.toString();
});
