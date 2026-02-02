import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { diskStorage } from 'multer';
import { PrismaService } from '@src/prisma.service';
import { Video } from '@prisma/client';
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('video')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'video', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 },
      ],
      {
        dest: './uploads',
        storage: diskStorage({
          destination: './uploads',
          filename: (_req, file, cb) => {
            return cb(
              null,
              `${Date.now()}-${randomUUID()}${extname(file.originalname)}`,
            );
          },
        }),
        fileFilter: (_req, file, cb) => {
          if (
            !file.mimetype.startsWith('video/mp4') &&
            !file.mimetype.startsWith('image/jpeg')
          ) {
            return cb(
              new BadRequestException(
                'Invalid file type. Only mp4 and jpeg files are allowed.',
              ),
              false,
            );
          }
          return cb(null, true);
        },
      },
    ),
  )
  async uploadVideo(
    @Req() _req: Request,
    @Body() body: { title: string; description: string },
    @UploadedFiles()
    files: { video: Express.Multer.File[]; thumbnail: Express.Multer.File[] },
  ): Promise<Video> {
    const videoFile = files.video?.[0];
    const thumbnailFile = files.thumbnail?.[0];

    if (!videoFile || !thumbnailFile) {
      throw new BadRequestException('Both video and thumbnail are required');
    }

    const video = await this.prismaService.video.create({
      data: {
        id: randomUUID(),
        title: body.title,
        description: body.description,
        url: videoFile.path,
        thumbnailUrl: thumbnailFile.path,
        sizeInKb: 1000,
        duration: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return video;
  }
}
