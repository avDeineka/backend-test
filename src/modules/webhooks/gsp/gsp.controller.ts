// gsp.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, Query, BadRequestException, Param } from '@nestjs/common';
import { CoreEventsService } from '../../core-events/core-events.service';
import { WebhookParserFactory } from '../webhook-parser.factory';

@Controller('webhooks/gsp')
export class GspController {
  constructor(
    private readonly coreEventsService: CoreEventsService,
    private readonly parserFactory: WebhookParserFactory,
  ) {}

  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  async handleGspCallback(
    @Param('provider') provider: string,
    @Query('brandId') brandId: string,
    @Body() payload: any,
  ) {
    if (!brandId) {
      throw new BadRequestException('Missing brandId query parameter');
    }

    // Фабрика сама розбереться, як розпарсити цей JSON під капотом
    const normalizedEvent = this.parserFactory.parse(brandId, provider, payload);

    const result = await this.coreEventsService.handleWebhookEvent(normalizedEvent);

    return {
      status: 'accepted',
      idempotency: result.status,
    };
  }
}
