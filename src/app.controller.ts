import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import path, { extname } from 'path';
import { diskStorage } from 'multer';
import { PrismaService } from '@src/prisma.service';
import { Video } from '@prisma/client';
import fs from 'fs';
import type { Request, Response } from 'express';
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

  @Get('streaming/:videoId')
  @Header('Content-Type', 'video/mp4')
  async streamVideo(
    @Param('videoId') videoId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<any> {
    const video = await this.prismaService.video.findUnique({
      where: {
        id: videoId,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const videoPath = path.join('.', video.url);
    const fileSize = fs.statSync(videoPath).size;

    /**
     * Streaming position: where should we start streaming from
     */
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts.length > 1 ? parseInt(parts[1], 10) : fileSize - 1;

      const chunkSize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });

      res.writeHead(HttpStatus.PARTIAL_CONTENT, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      });

      return file.pipe(res);
    }

    res.writeHead(HttpStatus.OK, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    });
  }
}
