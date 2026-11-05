import { Body, Controller, Get, Param, ParseIntPipe, Headers, Post, UseGuards } from '@nestjs/common';
import { OfferService } from './offer.service';
import { CreateOfferInput, OfferDeliveryInput } from './offer.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { Actor } from '../jobs/recruitment.policy';
import { OfferStatus } from '../../entities/offer.entity';
@Controller()
export class OfferController {
    constructor(private readonly service: OfferService) { }
    @Post('applications/:id/offer')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.HR, UserRole.SUPERADMIN)
    create(
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    input: CreateOfferInput,
    @CurrentUser()
    actor: Actor) {
        return this.service.create(id, input, actor);
    }
    @Get('applications/:id/offers')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.HR, UserRole.SUPERADMIN)
    list(
    @Param('id', ParseIntPipe)
    id: number,
    @CurrentUser()
    actor: Actor) { return this.service.list(id, actor); }
    @Post('applications/:id/offer/retry')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.HR, UserRole.SUPERADMIN)
    retry(
    @Param('id', ParseIntPipe)
    id: number,
    @CurrentUser()
    actor: Actor) { return this.service.retry(id, actor); }
    @Post('offers/:id/delivery')
    delivery(
    @Param('id', ParseIntPipe)
    id: number,
    @Headers('x-offer-token')
    token: string,
    @Body()
    input: OfferDeliveryInput) { return this.service.delivery(id, token, input); }
    @Get('offers/:token')
    view(
    @Param('token')
    token: string) { return this.service.view(token); }
    @Post('offers/:token/accept')
    accept(
    @Param('token')
    token: string) { return this.service.respond(token, OfferStatus.ACCEPTED); }
    @Post('offers/:token/decline')
    decline(
    @Param('token')
    token: string) { return this.service.respond(token, OfferStatus.DECLINED); }
    @Get('offers/:token/status')
    status(
    @Param('token')
    token: string) { return this.service.view(token); }
}
