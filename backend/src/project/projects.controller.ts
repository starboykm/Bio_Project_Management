import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Permissions } from '../common/permissions.decorator';
import { PermissionsGuard } from '../common/permissions.guard';
import { User } from '../user/user.entity';
import { CreateProjectCommentDto } from './dto/create-project-comment.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectStepDto } from './dto/update-project-step.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @Permissions('project:read')
  findAll(@CurrentUser() user: User) {
    return this.projectsService.findAll(user);
  }

  @Get(':id')
  @Permissions('project:read')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projectsService.findOne(id, user);
  }

  @Post()
  @Permissions('project:write')
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: User) {
    return this.projectsService.create(dto, user);
  }

  @Post('contracts/upload')
  @Permissions('project:write')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: process.env.UPLOAD_DIR || './uploads',
        filename: (_, file, cb) => {
          const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          cb(null, `contract-${Date.now()}-${safeName}`);
        },
      }),
    }),
  )
  uploadContract(@UploadedFile() file: Express.Multer.File) {
    return this.projectsService.uploadContract(file);
  }

  @Patch(':id')
  @Permissions('project:write')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @CurrentUser() user: User) {
    return this.projectsService.update(id, dto, user);
  }

  @Delete(':id')
  @Permissions('project:write')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projectsService.remove(id, user);
  }

  @Patch(':projectId/steps/:stepId')
  @Permissions('project:comment')
  updateStep(
    @Param('projectId') projectId: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateProjectStepDto,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.updateStep(projectId, stepId, dto, user);
  }

  @Post(':projectId/comments')
  @Permissions('project:comment')
  addComment(@Param('projectId') projectId: string, @Body() dto: CreateProjectCommentDto, @CurrentUser() user: User) {
    return this.projectsService.addComment(projectId, dto, user);
  }
}
