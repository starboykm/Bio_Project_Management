import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Permissions } from '../common/permissions.decorator';
import { PermissionsGuard } from '../common/permissions.guard';
import { User } from '../user/user.entity';
import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { UpdateKnowledgeDto } from './dto/update-knowledge.dto';
import { KnowledgeService } from './knowledge.service';

@Controller('knowledge')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  @Permissions('knowledge:read')
  findAll(@CurrentUser() user: User, @Query('q') query?: string) {
    return this.knowledgeService.findAll(user, query);
  }

  @Get('categories')
  @Permissions('knowledge:read')
  findCategories() {
    return this.knowledgeService.findCategories();
  }

  @Post('categories')
  @Permissions('knowledge:manage')
  createCategory(@Body() dto: { name: string; description?: string; parentId?: string; icon?: string }, @CurrentUser() user: User) {
    return this.knowledgeService.createCategory(dto, user.id);
  }

  @Patch('categories/:id')
  @Permissions('knowledge:manage')
  updateCategory(@Param('id') id: string, @Body() dto: { name?: string; description?: string; parentId?: string; icon?: string }) {
    return this.knowledgeService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @Permissions('knowledge:manage')
  removeCategory(@Param('id') id: string) {
    return this.knowledgeService.removeCategory(id);
  }

  @Get('tags')
  @Permissions('knowledge:read')
  findTags() {
    return this.knowledgeService.findTags();
  }

  @Post('tags')
  @Permissions('knowledge:manage')
  createTag(@Body() dto: { name: string; color?: string }) {
    return this.knowledgeService.createTag(dto);
  }

  @Patch('tags/:id')
  @Permissions('knowledge:manage')
  updateTag(@Param('id') id: string, @Body() dto: { name?: string; color?: string }) {
    return this.knowledgeService.updateTag(id, dto);
  }

  @Delete('tags/:id')
  @Permissions('knowledge:manage')
  removeTag(@Param('id') id: string) {
    return this.knowledgeService.removeTag(id);
  }

  @Get(':id')
  @Permissions('knowledge:read')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.knowledgeService.findOne(id, user);
  }

  @Post()
  @Permissions('knowledge:write')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: process.env.UPLOAD_DIR || './uploads',
        filename: (_, file, cb) => {
          const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          cb(null, `${Date.now()}-${safeName}`);
        },
      }),
    }),
  )
  create(
    @Body() dto: CreateKnowledgeDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: User,
  ) {
    return this.knowledgeService.create(dto, file, user.id);
  }

  @Post('uploads')
  @Permissions('knowledge:write')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: process.env.UPLOAD_DIR || './uploads',
        filename: (_, file, cb) => {
          const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          cb(null, `${Date.now()}-${safeName}`);
        },
      }),
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.knowledgeService.uploadedFile(file);
  }

  @Patch(':id')
  @Permissions('knowledge:write')
  update(@Param('id') id: string, @Body() dto: UpdateKnowledgeDto, @CurrentUser() user: User) {
    return this.knowledgeService.update(id, dto, user);
  }
}
