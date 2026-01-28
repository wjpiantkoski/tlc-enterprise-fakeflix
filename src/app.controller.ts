import {
  BadRequestException,
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
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

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
  uploadVideo(
    @Req() _req: Request,
    @UploadedFiles()
    files: { video: Express.Multer.File; thumbnail: Express.Multer.File },
  ): string {
    console.log(files);
    return 'Video uploaded successfully';
  }
}
