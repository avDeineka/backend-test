// psp.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, Query, BadRequestException, Param } from '@nestjs/common';
import { CoreEventsService } from '../../core-events/core-events.service';
import { WebhookParserFactory } from '../webhook-parser.factory';

@Controller('webhooks/psp')
export class PspController {
  constructor(
    private readonly coreEventsService: CoreEventsService,
    private readonly parserFactory: WebhookParserFactory,
  ) {}

  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  async handlePspCallback(
    @Param('provider') provider: string,
    @Query('brandId') brandId: string,
    @Body() payload: any,
  ) {
    if (!brandId) {
      throw new BadRequestException('Missing brandId query parameter');
    }

    const normalizedEvent = this.parserFactory.parse(brandId, provider, payload);

    const result = await this.coreEventsService.handleWebhookEvent(normalizedEvent);

    return {
      received: true,
      idempotency: result.status,
    };
  }
}