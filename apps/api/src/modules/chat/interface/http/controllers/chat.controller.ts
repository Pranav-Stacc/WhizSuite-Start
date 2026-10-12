import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { ChatService } from '../../../application/services/chat.service';
import {
  AddMembersDto,
  CreateDmDto,
  CreateGroupRoomDto,
  EditMessageDto,
  ListMessagesQueryDto,
  MarkReadDto,
  SendMessageDto,
  TypingDto,
  UpdateMembershipDto,
  UpdateRoomDto,
  WhizRoomReplyDto,
} from '../dto/chat.dto';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/chat')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Get('rooms')
  @RequirePermissions(Permissions.CHAT_VIEW)
  listRooms(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.listRooms(
      requireOrganizationId(organizationId),
      user.userId,
    );
  }

  @Get('unread-count')
  @RequirePermissions(Permissions.CHAT_VIEW)
  async unreadCount(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const count = await this.service.unreadTotal(
      requireOrganizationId(organizationId),
      user.userId,
    );
    return { count };
  }

  @Post('rooms')
  @RequirePermissions(Permissions.CHAT_CREATE_ROOM)
  createRoom(
    @Param('organizationId') organizationId: string,
    @Body() body: CreateGroupRoomDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createGroup(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }

  @Post('dms')
  @RequirePermissions(Permissions.CHAT_CREATE_ROOM)
  createDm(
    @Param('organizationId') organizationId: string,
    @Body() body: CreateDmDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getOrCreateDm(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }

  @Get('clients/:clientId/room')
  @RequirePermissions(Permissions.CHAT_VIEW)
  clientRoom(
    @Param('organizationId') organizationId: string,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getOrCreateClientRoom(
      requireOrganizationId(organizationId),
      user.userId,
      clientId,
      'Client chat',
    );
  }

  @Get('rooms/:roomId')
  @RequirePermissions(Permissions.CHAT_VIEW)
  getRoom(
    @Param('organizationId') organizationId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getRoom(
      requireOrganizationId(organizationId),
      user.userId,
      roomId,
    );
  }

  @Patch('rooms/:roomId')
  @RequirePermissions(Permissions.CHAT_VIEW)
  updateRoom(
    @Param('organizationId') organizationId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: UpdateRoomDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateRoom(
      requireOrganizationId(organizationId),
      user.userId,
      roomId,
      body,
    );
  }

  @Post('rooms/:roomId/members')
  @RequirePermissions(Permissions.CHAT_VIEW)
  addMembers(
    @Param('organizationId') organizationId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: AddMembersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.addMembers(
      requireOrganizationId(organizationId),
      user.userId,
      roomId,
      body,
    );
  }

  @Delete('rooms/:roomId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.CHAT_VIEW)
  removeMember(
    @Param('organizationId') organizationId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.removeMember(
      requireOrganizationId(organizationId),
      user.userId,
      roomId,
      userId,
    );
  }

  @Patch('rooms/:roomId/members/:userId')
  @RequirePermissions(Permissions.CHAT_VIEW)
  updateMember(
    @Param('organizationId') organizationId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: UpdateMembershipDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateMembership(
      requireOrganizationId(organizationId),
      user.userId,
      roomId,
      userId,
      body,
    );
  }

  @Get('rooms/:roomId/messages')
  @RequirePermissions(Permissions.CHAT_VIEW)
  listMessages(
    @Param('organizationId') organizationId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: ListMessagesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.listMessages(
      requireOrganizationId(organizationId),
      user.userId,
      roomId,
      query.cursor,
      query.limit,
    );
  }

  @Post('rooms/:roomId/messages')
  @RequirePermissions(Permissions.CHAT_SEND)
  sendMessage(
    @Param('organizationId') organizationId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.sendMessage(
      requireOrganizationId(organizationId),
      user,
      roomId,
      body,
    );
  }

  @Post('rooms/:roomId/whiz-reply')
  @RequirePermissions(Permissions.AI_CHAT, Permissions.CHAT_SEND)
  postWhizReply(
    @Param('organizationId') organizationId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: WhizRoomReplyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.postWhizRoomReply(
      requireOrganizationId(organizationId),
      user,
      roomId,
      body.triggerMessageId,
      body.body,
    );
  }

  @Patch('rooms/:roomId/messages/:messageId')
  @RequirePermissions(Permissions.CHAT_SEND)
  editMessage(
    @Param('organizationId') organizationId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() body: EditMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.editMessage(
      requireOrganizationId(organizationId),
      user.userId,
      roomId,
      messageId,
      body,
    );
  }

  @Delete('rooms/:roomId/messages/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.CHAT_SEND)
  deleteMessage(
    @Param('organizationId') organizationId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.deleteMessage(
      requireOrganizationId(organizationId),
      user.userId,
      roomId,
      messageId,
    );
  }

  @Post('rooms/:roomId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.CHAT_VIEW)
  markRead(
    @Param('organizationId') organizationId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: MarkReadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.markRead(
      requireOrganizationId(organizationId),
      user.userId,
      roomId,
      body,
    );
  }

  @Post('rooms/:roomId/typing')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.CHAT_VIEW)
  typing(
    @Param('organizationId') organizationId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: TypingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.typing(
      requireOrganizationId(organizationId),
      user.userId,
      roomId,
      body,
    );
  }
}
